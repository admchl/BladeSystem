use std::process::Command;
use std::os::windows::process::CommandExt;
use winreg::RegKey;

pub const CREATE_NO_WINDOW: u32 = 0x08000000;

pub fn set_dword(hive: isize, path: &str, name: &str, value: u32) {
    let root = RegKey::predef(hive);
    if let Ok((key, _)) = root.create_subkey(path) {
        let _ = key.set_value(name, &value);
    }
}

pub fn disable_service(name: &str) {
    let script = format!(
        "Stop-Service -Name '{}' -Force -ErrorAction SilentlyContinue; \
         Set-Service -Name '{}' -StartupType Disabled -ErrorAction SilentlyContinue",
        name, name
    );
    let _ = ps(&script);
}

pub fn ps(script: &str) -> Result<String, String> {
    let wrapped = format!(
        "$OutputEncoding=[System.Text.Encoding]::UTF8;\
         [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;\n{}",
        script
    );
    Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", &wrapped])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .map_err(|e| e.to_string())
}
