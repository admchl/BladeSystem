use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Command;
use std::os::windows::process::CommandExt;
use chrono::Utc;
use winreg::enums::*;
use winreg::RegKey;
use tauri::{AppHandle, Emitter};
use crate::logger;
use crate::registry::{ps, set_dword, CREATE_NO_WINDOW};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetupApp {
    pub id: String,
    pub source: String,
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetupSettings {
    pub privacy: bool,
    pub dark_mode: bool,
    pub taskbar_cleanup: bool,
    pub install_blade_automation: bool,
}

impl Default for SetupSettings {
    fn default() -> Self {
        Self {
            privacy: true,
            dark_mode: true,
            taskbar_cleanup: true,
            install_blade_automation: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetupFile {
    pub version: String,
    pub exported_at: i64,
    pub apps: Vec<SetupApp>,
    pub settings: SetupSettings,
}

// ── Export ────────────────────────────────────────────────────────────────────

pub fn export_apps() -> Result<SetupFile, String> {
    logger::log("Setup: export starting...");
    let mut apps: HashMap<String, SetupApp> = HashMap::new();

    // winget export
    let tmp = std::env::temp_dir().join("blade_winget_export.json");
    let status = Command::new("winget")
        .args(["export", "-o", tmp.to_str().unwrap(), "--accept-source-agreements"])
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map_err(|e| format!("winget not found: {}", e))?;

    if status.success() {
        if let Ok(content) = std::fs::read_to_string(&tmp) {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(sources) = val.get("Sources").and_then(|v| v.as_array()) {
                    for source in sources {
                        let source_name = source
                            .get("SourceDetails").and_then(|s| s.get("Name"))
                            .and_then(|n| n.as_str()).unwrap_or("winget").to_string();
                        if let Some(pkgs) = source.get("Packages").and_then(|p| p.as_array()) {
                            for pkg in pkgs {
                                if let Some(id) = pkg.get("PackageIdentifier").and_then(|v| v.as_str()) {
                                    apps.entry(id.to_string()).or_insert(SetupApp {
                                        id: id.to_string(),
                                        source: source_name.clone(),
                                        enabled: true,
                                        name: None,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        let _ = std::fs::remove_file(&tmp);
    }

    // registry scan
    let reg_apps = scan_registry();
    for app in reg_apps {
        apps.entry(app.id.clone()).or_insert(app);
    }

    let mut apps_vec: Vec<SetupApp> = apps.into_values().collect();
    apps_vec.sort_by(|a, b| a.id.cmp(&b.id));

    logger::log(&format!("Setup: exported {} apps", apps_vec.len()));

    Ok(SetupFile {
        version: "2.0".into(),
        exported_at: Utc::now().timestamp(),
        apps: apps_vec,
        settings: SetupSettings::default(),
    })
}

pub fn save_setup_file(file: &SetupFile) -> Result<String, String> {
    let dir = std::env::var("APPDATA").unwrap_or_default();
    let path = std::path::PathBuf::from(dir).join("Blade System").join("setup.json");
    std::fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(file).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

pub fn load_setup_file(path: &str) -> Result<SetupFile, String> {
    let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| format!("Invalid setup.json: {}", e))
}

// ── Install ───────────────────────────────────────────────────────────────────

pub fn run_install(apps: Vec<SetupApp>, settings: SetupSettings, app_handle: AppHandle) {
    std::thread::spawn(move || {
        let enabled: Vec<&SetupApp> = apps.iter().filter(|a| a.enabled).collect();
        emit(&app_handle, "setup-log", &format!("Installing {} apps...", enabled.len()));

        let winget_apps: Vec<&SetupApp> = enabled.iter().filter(|a| a.source != "registry").cloned().collect();
        let registry_apps: Vec<&SetupApp> = enabled.iter().filter(|a| a.source == "registry").cloned().collect();

        if !winget_apps.is_empty() {
            emit(&app_handle, "setup-log", &format!("Running winget import ({} packages)...", winget_apps.len()));
            if let Err(e) = install_via_winget(&winget_apps, &app_handle) {
                emit(&app_handle, "setup-log", &format!("winget error: {}", e));
            }
        }

        for a in &registry_apps {
            let label = a.name.as_deref().unwrap_or(&a.id);
            emit(&app_handle, "setup-log", &format!("MANUAL INSTALL NEEDED: {}", label));
            logger::log(&format!("Manual required: {}", label));
        }

        // Windows settings
        emit(&app_handle, "setup-log", "Applying Windows settings...");
        apply_settings(&settings);

        // Blade Automation
        if settings.install_blade_automation {
            emit(&app_handle, "setup-log", "Downloading Blade Automation...");
            match download_blade_automation() {
                Ok(_) => emit(&app_handle, "setup-log", "Blade Automation installed"),
                Err(e) => emit(&app_handle, "setup-log", &format!("Blade Automation failed: {}", e)),
            }
        }

        emit(&app_handle, "setup-done", "Installation complete!");
        logger::log("Setup: install complete");
    });
}

fn install_via_winget(apps: &[&SetupApp], app_handle: &AppHandle) -> Result<(), String> {
    let packages: Vec<serde_json::Value> = apps.iter().map(|a| {
        serde_json::json!({ "PackageIdentifier": a.id })
    }).collect();

    let import_json = serde_json::json!({
        "Sources": [{
            "SourceDetails": {
                "Name": "winget",
                "Identifier": "Microsoft.Winget.Source_8wekyb3d8bbwe",
                "Argument": "",
                "Type": "Microsoft.PreIndexed.Package"
            },
            "Packages": packages
        }]
    });

    let tmp = std::env::temp_dir().join("blade_import.json");
    std::fs::write(&tmp, serde_json::to_string_pretty(&import_json).unwrap())
        .map_err(|e| e.to_string())?;

    let output = Command::new("winget")
        .args(["import", "-i", tmp.to_str().unwrap(),
               "--ignore-unavailable", "--accept-package-agreements",
               "--accept-source-agreements"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("winget import failed: {}", e))?;

    for line in String::from_utf8_lossy(&output.stdout).lines()
        .chain(String::from_utf8_lossy(&output.stderr).lines())
    {
        if !line.trim().is_empty() {
            emit(app_handle, "setup-log", line);
            logger::log(line);
        }
    }
    let _ = std::fs::remove_file(&tmp);
    Ok(())
}

fn apply_settings(settings: &SetupSettings) {
    if settings.privacy {
        set_dword(HKEY_LOCAL_MACHINE, r"SOFTWARE\Policies\Microsoft\Windows\DataCollection", "AllowTelemetry", 0);
        set_dword(HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo", "Enabled", 0);
        set_dword(HKEY_LOCAL_MACHINE, r"SOFTWARE\Policies\Microsoft\Windows\System", "EnableActivityFeed", 0);
        logger::log("Setup: privacy applied");
    }
    if settings.dark_mode {
        set_dword(HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize", "AppsUseLightTheme", 0);
        set_dword(HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize", "SystemUsesLightTheme", 0);
        logger::log("Setup: dark mode applied");
    }
    if settings.taskbar_cleanup {
        set_dword(HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Search", "SearchboxTaskbarMode", 0);
        set_dword(HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced", "TaskbarDa", 0);
        set_dword(HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced", "ShowTaskViewButton", 0);
        let _ = ps("Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue; Start-Sleep 1; Start-Process explorer");
        logger::log("Setup: taskbar cleanup applied");
    }
}

fn download_blade_automation() -> Result<(), String> {
    let script = "Invoke-WebRequest -Uri 'https://github.com/admchl/BladeAutomation/releases/latest/download/blade-automation.exe' -OutFile \"$env:TEMP\\blade-automation.exe\" -UseBasicParsing; & \"$env:TEMP\\blade-automation.exe\" /silent; 'ok'";
    ps(script).map(|_| ())
}

// ── Registry scan ─────────────────────────────────────────────────────────────

fn scan_registry() -> Vec<SetupApp> {
    let mut apps = Vec::new();
    let paths: &[(isize, &str)] = &[
        (HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
        (HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
        (HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
    ];
    for (hive, path) in paths {
        let root = RegKey::predef(*hive);
        if let Ok(key) = root.open_subkey(path) {
            for subkey_name in key.enum_keys().flatten() {
                if let Ok(subkey) = key.open_subkey(&subkey_name) {
                    let name: String = subkey.get_value("DisplayName").unwrap_or_default();
                    let publisher: String = subkey.get_value("Publisher").unwrap_or_default();
                    let uninstall: String = subkey.get_value("UninstallString").unwrap_or_default();
                    let sys: u32 = subkey.get_value("SystemComponent").unwrap_or(0);
                    if name.is_empty() || uninstall.is_empty() || sys == 1 { continue; }
                    if name.starts_with("KB") || name.contains("Visual C++") || name.contains("Microsoft Visual") { continue; }
                    let id = format!("registry::{}", sanitize(&name, &publisher));
                    apps.push(SetupApp { id, source: "registry".into(), enabled: true, name: Some(name) });
                }
            }
        }
    }
    apps
}

fn sanitize(name: &str, publisher: &str) -> String {
    let base = if publisher.is_empty() { name.to_string() } else { format!("{}.{}", publisher, name) };
    base.chars().map(|c| if c.is_alphanumeric() || c == '.' || c == '-' { c } else { '_' }).collect::<String>()
        .trim_matches('_').to_string()
}

fn emit(app: &AppHandle, event: &str, msg: &str) {
    let _ = app.emit(event, msg);
}
