use chrono::Local;
use std::fs::OpenOptions;
use std::io::Write;

const LOG_PATH: &str = r"C:\ProgramData\blade_system_log.txt";

pub fn log(msg: &str) {
    let ts = Local::now().format("%Y-%m-%d %H:%M:%S");
    let line = format!("[{}] {}\n", ts, msg);
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(LOG_PATH) {
        let _ = f.write_all(line.as_bytes());
    }
}
