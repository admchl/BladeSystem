use crate::logger;
use crate::registry::{ps, set_dword, disable_service};
use winreg::enums::*;

pub fn run_all() -> Vec<String> {
    let mut log = Vec::new();
    log.extend(run_telemetry());
    log.extend(run_copilot());
    log.extend(run_bloatware());
    log.extend(run_performance());
    log
}

pub fn run_telemetry() -> Vec<String> {
    logger::log("Optimizer: telemetry...");
    let mut log = Vec::new();

    set_dword(HKEY_LOCAL_MACHINE, r"SOFTWARE\Policies\Microsoft\Windows\DataCollection", "AllowTelemetry", 0);
    set_dword(HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo", "Enabled", 0);
    set_dword(HKEY_LOCAL_MACHINE, r"SOFTWARE\Policies\Microsoft\Windows\DataCollection", "DisableEnterpriseAuthProxy", 1);

    disable_service("DiagTrack");
    disable_service("dmwappushservice");
    disable_service("WerSvc");

    let tasks = [
        r"\Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser",
        r"\Microsoft\Windows\Application Experience\ProgramDataUpdater",
        r"\Microsoft\Windows\Customer Experience Improvement Program\Consolidator",
        r"\Microsoft\Windows\Customer Experience Improvement Program\UsbCeip",
    ];
    for task in &tasks {
        let _ = ps(&format!("schtasks /Change /TN '{}' /Disable 2>$null; 'ok'", task));
    }

    log.push("Telemetry disabled".to_string());
    log
}

pub fn run_copilot() -> Vec<String> {
    logger::log("Optimizer: Copilot/AI...");
    let mut log = Vec::new();

    set_dword(HKEY_LOCAL_MACHINE, r"SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot", "TurnOffWindowsCopilot", 1);
    set_dword(HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced", "ShowCopilotButton", 0);
    set_dword(HKEY_LOCAL_MACHINE, r"SOFTWARE\Policies\Microsoft\Windows\WindowsAI", "DisableAIDataAnalysis", 1);
    set_dword(HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Search", "BingSearchEnabled", 0);
    set_dword(HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Search", "DisableWebSearch", 1);
    set_dword(HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced", "TaskbarDa", 0);

    let _ = ps("Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue; Start-Sleep 1; Start-Process explorer");

    log.push("Copilot & AI features disabled".to_string());
    log
}

pub fn run_bloatware() -> Vec<String> {
    logger::log("Optimizer: bloatware...");
    let mut log = Vec::new();

    let winget_apps = [
        "Microsoft.XboxApp", "Microsoft.XboxGameOverlay", "Microsoft.XboxGamingOverlay",
        "Microsoft.XboxIdentityProvider", "Microsoft.XboxSpeechToTextOverlay",
        "Clipchamp.Clipchamp", "Microsoft.Teams", "Microsoft.BingNews",
        "Microsoft.BingWeather", "Microsoft.WindowsFeedbackHub", "Microsoft.GetHelp",
        "Microsoft.Getstarted", "Microsoft.MicrosoftSolitaireCollection",
        "Microsoft.ZuneMusic", "Microsoft.ZuneVideo", "Microsoft.People",
        "Microsoft.Todos",
    ];
    for app in &winget_apps {
        let _ = ps(&format!("winget uninstall --id {} --silent --accept-source-agreements 2>$null; 'ok'", app));
    }

    let appx = [
        "Microsoft.GamingApp", "MicrosoftCorporationII.MicrosoftFamily",
        "Microsoft.549981C3F5F10", "Microsoft.WindowsMaps",
        "Microsoft.MixedReality.Portal", "Microsoft.YourPhone",
        "Microsoft.Office.OneNote", "Microsoft.OneConnect",
    ];
    for app in &appx {
        let _ = ps(&format!("Get-AppxPackage -Name '{}' | Remove-AppxPackage -ErrorAction SilentlyContinue 2>$null; 'ok'", app));
    }

    // Disable Game DVR
    set_dword(HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR", "AppCaptureEnabled", 0);
    set_dword(HKEY_CURRENT_USER, r"System\GameConfigStore", "GameDVR_Enabled", 0);

    log.push("Bloatware removed".to_string());
    log
}

pub fn run_performance() -> Vec<String> {
    logger::log("Optimizer: performance...");
    let mut log = Vec::new();

    disable_service("SysMain");
    disable_service("WSearch");

    let _ = ps("powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>$null; 'ok'");
    let _ = ps("powercfg -h off 2>$null; 'ok'");
    let _ = ps("fsutil behavior set disablelastaccess 1 2>$null; 'ok'");

    set_dword(HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications", "GlobalUserDisabled", 1);
    set_dword(HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Serialize", "StartupDelayInMSec", 0);
    set_dword(HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Remote Assistance", "fAllowToGetHelp", 0);
    set_dword(HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\Maintenance", "MaintenanceDisabled", 1);

    set_dword(HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager", "SoftLandingEnabled", 0);
    set_dword(HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager", "SubscribedContent-338389Enabled", 0);
    set_dword(HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager", "OemPreInstalledAppsEnabled", 0);
    set_dword(HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager", "PreInstalledAppsEnabled", 0);
    set_dword(HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager", "SilentInstalledAppsEnabled", 0);

    let tasks = [
        r"\Microsoft\Windows\Defrag\ScheduledDefrag",
        r"\Microsoft\Windows\Maintenance\WinSAT",
        r"\Microsoft\Windows\Application Experience\StartupAppTask",
        r"\Microsoft\Windows\Power Efficiency Diagnostics\AnalyzeSystem",
    ];
    for task in &tasks {
        let _ = ps(&format!("schtasks /Change /TN '{}' /Disable 2>$null; 'ok'", task));
    }

    log.push("Performance tweaks applied".to_string());
    log
}

pub fn run_hosts() -> Vec<String> {
    logger::log("Optimizer: hosts...");
    use std::fs;
    use std::io::Write;

    const HOSTS_PATH: &str = r"C:\Windows\System32\drivers\etc\hosts";
    const MARKER: &str = "# BladeSystem";

    let current = fs::read_to_string(HOSTS_PATH).unwrap_or_default();
    if current.contains(MARKER) {
        return vec!["Hosts already patched".to_string()];
    }

    let domains = [
        "vortex.data.microsoft.com", "vortex-win.data.microsoft.com",
        "telecommand.telemetry.microsoft.com", "oca.telemetry.microsoft.com",
        "sqm.telemetry.microsoft.com", "watson.telemetry.microsoft.com",
        "telemetry.microsoft.com", "watson.ppe.telemetry.microsoft.com",
        "settings-sandbox.data.microsoft.com", "ads.msn.com", "rad.msn.com",
        "adnexus.net", "doubleclick.net", "googlesyndication.com",
        "googleadservices.com", "scorecardresearch.com", "quantserve.com",
        "outbrain.com", "taboola.com", "criteo.com", "adform.net",
        "rubiconproject.com", "pubmatic.com", "openx.net", "advertising.com",
    ];

    let mut entries = format!("\n{}\n", MARKER);
    for domain in &domains {
        entries.push_str(&format!("0.0.0.0 {}\n", domain));
    }

    match fs::OpenOptions::new().append(true).open(HOSTS_PATH) {
        Ok(mut f) => {
            let _ = f.write_all(entries.as_bytes());
            vec![format!("{} tracking domains blocked", domains.len())]
        }
        Err(e) => vec![format!("Hosts: failed — {}", e)],
    }
}
