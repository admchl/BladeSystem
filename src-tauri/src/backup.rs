use serde::{Deserialize, Serialize};
use crate::logger;
use crate::registry::ps;
use std::path::PathBuf;
use chrono::Local;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct BackupJob {
    pub id: String,
    pub name: String,
    pub source: String,
    pub destination: String,
    pub last_run: Option<i64>,
    pub size_mb: u64,
}

pub fn run_backup(source: &str, dest: &str) -> Result<String, String> {
    logger::log(&format!("Backup: {} → {}", source, dest));
    let ts = Local::now().format("%Y%m%d_%H%M%S");
    let dest_full = format!("{}\\backup_{}", dest, ts);

    let script = format!(
        "robocopy '{}' '{}' /MIR /R:2 /W:5 /MT:8 /NP /LOG+:C:\\ProgramData\\blade_backup_log.txt 2>$null; 'ok'",
        source, dest_full
    );
    ps(&script)
}

pub fn export_settings() -> Result<String, String> {
    let out_dir = PathBuf::from(r"C:\ProgramData\BladeSystem\exports");
    std::fs::create_dir_all(&out_dir).map_err(|e| e.to_string())?;

    let ts = Local::now().format("%Y%m%d_%H%M%S");
    let out = out_dir.join(format!("blade_export_{}.json", ts));

    let script = format!(
        "winget export --output '{}' --accept-source-agreements 2>$null; 'ok'",
        out.display()
    );
    ps(&script)
}
