use serde::{Deserialize, Serialize};
use crate::logger;
use crate::registry::ps;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduledTask {
    pub name: String,
    pub path: String,
    pub state: String,
    pub last_run: String,
    pub next_run: String,
    pub author: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationRule {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub schedule: String,
    pub action: String,
    pub last_run: Option<i64>,
}

pub fn get_scheduled_tasks() -> Vec<ScheduledTask> {
    let script = r#"
        Get-ScheduledTask | Where-Object { $_.TaskPath -notlike '\Microsoft\*' } |
        Select-Object -First 100 |
        ForEach-Object {
            $info = $_ | Get-ScheduledTaskInfo -ErrorAction SilentlyContinue
            [PSCustomObject]@{
                name     = $_.TaskName
                path     = $_.TaskPath
                state    = $_.State.ToString()
                last_run = if ($info.LastRunTime -and $info.LastRunTime -gt (Get-Date '1900-01-01')) { $info.LastRunTime.ToString('yyyy-MM-dd HH:mm') } else { 'Never' }
                next_run = if ($info.NextRunTime -and $info.NextRunTime -gt (Get-Date '1900-01-01')) { $info.NextRunTime.ToString('yyyy-MM-dd HH:mm') } else { 'N/A' }
                author   = if ($_.Principal.UserId) { $_.Principal.UserId } else { 'System' }
            }
        } | ConvertTo-Json -Compress
    "#;

    let out = ps(script).unwrap_or_default();
    if out.is_empty() { return vec![]; }

    #[derive(Deserialize)]
    struct Raw { name: String, path: String, state: String, last_run: String, next_run: String, author: String }

    let tasks: Vec<Raw> = if out.trim_start().starts_with('[') {
        serde_json::from_str(&out).unwrap_or_default()
    } else {
        serde_json::from_str(&format!("[{}]", out)).unwrap_or_default()
    };

    tasks.into_iter().map(|r| ScheduledTask {
        name: r.name, path: r.path, state: r.state,
        last_run: r.last_run, next_run: r.next_run, author: r.author,
    }).collect()
}

pub fn toggle_scheduled_task(task_path: &str, task_name: &str, enable: bool) -> Result<String, String> {
    let action = if enable { "Enable" } else { "Disable" };
    let script = format!(
        "{}-ScheduledTask -TaskPath '{}' -TaskName '{}' -ErrorAction SilentlyContinue; '{} ok'",
        action, task_path, task_name, action
    );
    ps(&script)
}

pub fn run_scheduled_task(task_path: &str, task_name: &str) -> Result<String, String> {
    let script = format!(
        "Start-ScheduledTask -TaskPath '{}' -TaskName '{}' -ErrorAction SilentlyContinue; 'started'",
        task_path, task_name
    );
    logger::log(&format!("Automation: running task {}\\{}", task_path, task_name));
    ps(&script)
}

pub fn get_windows_automation_info() -> serde_json::Value {
    // Check for installed automation tools
    let blade_auto = std::path::Path::new(r"C:\Users\User\Desktop\blade-automation.exe").exists()
        || std::path::Path::new(r"C:\Program Files\BladeAutomation\blade-automation.exe").exists();

    let task_count_script = r#"(Get-ScheduledTask | Where-Object { $_.TaskPath -notlike '\Microsoft\*' }).Count"#;
    let task_count: u32 = ps(task_count_script)
        .unwrap_or_default().trim().parse().unwrap_or(0);

    serde_json::json!({
        "blade_automation_installed": blade_auto,
        "user_task_count": task_count,
    })
}

pub fn launch_blade_automation() -> Result<(), String> {
    let paths = [
        r"C:\Users\User\Desktop\blade-automation.exe",
        r"C:\Program Files\BladeAutomation\blade-automation.exe",
    ];
    for p in &paths {
        if std::path::Path::new(p).exists() {
            let _ = ps(&format!("Start-Process '{}'", p));
            return Ok(());
        }
    }
    Err("Blade Automation not found. Download it from github.com/admchl/BladeAutomation".to_string())
}
