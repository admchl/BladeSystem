use crate::logger;
use crate::registry::ps;
use tauri::{AppHandle, Emitter};

pub fn run_sfc(app: AppHandle) {
    logger::log("Repair: SFC starting...");
    std::thread::spawn(move || {
        let _ = app.emit("repair-log", "Running SFC (System File Checker)...");
        let result = ps("sfc /scannow 2>&1 | Out-String").unwrap_or_else(|e| e);
        let _ = app.emit("repair-log", &result);
        let _ = app.emit("repair-log", "SFC complete.");
        logger::log("Repair: SFC done");
    });
}

pub fn run_dism(app: AppHandle) {
    logger::log("Repair: DISM starting...");
    std::thread::spawn(move || {
        let _ = app.emit("repair-log", "Running DISM (Component Store Repair)...");
        let result = ps("DISM /Online /Cleanup-Image /RestoreHealth 2>&1 | Out-String").unwrap_or_else(|e| e);
        let _ = app.emit("repair-log", &result);
        let _ = app.emit("repair-log", "DISM complete.");
        logger::log("Repair: DISM done");
    });
}

#[allow(dead_code)]
pub fn run_chkdsk() -> Result<String, String> {
    ps("echo Y | chkdsk C: /f /r /x 2>&1 | Out-String")
}

pub fn flush_dns() -> Result<String, String> {
    ps("ipconfig /flushdns; ipconfig /registerdns; 'DNS flushed'")
}

pub fn reset_network() -> Result<String, String> {
    ps("netsh winsock reset; netsh int ip reset; ipconfig /release; ipconfig /renew; 'Network stack reset — reboot required'")
}
