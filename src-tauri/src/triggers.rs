use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use chrono::Local;
use uuid::Uuid;
use crate::logger;
use crate::registry::ps;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Condition {
    UsbConnected,
    WifiChanged { ssid: String },
    BatteryBelow { percent: u8 },
    CpuAbove { percent: u8, for_seconds: u32 },
    RamAbove { percent: u8 },
    ProcessStarted { name: String },
    IdleFor { seconds: u32 },
    TimeSchedule { hour: u8, minute: u8 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Action {
    SwitchPowerPlan { plan: String },
    KillProcess { name: String },
    SwitchDns { server: String },
    RunOptimizer,
    ShowNotification { title: String, body: String },
    RunScript { powershell: String },
    OpenApp { path: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trigger {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub condition: Condition,
    pub action: Action,
    pub last_fired: Option<i64>,
    pub fire_count: u32,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineEntry {
    pub trigger_id: String,
    pub trigger_name: String,
    pub fired_at: i64,
    pub success: bool,
    pub note: Option<String>,
}

pub type TriggerState = Arc<Mutex<Vec<Trigger>>>;

fn data_dir() -> PathBuf {
    let mut p = dirs_path();
    p.push("Blade System");
    fs::create_dir_all(&p).ok();
    p
}

fn dirs_path() -> PathBuf {
    std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(r"C:\Users\Default\AppData\Roaming"))
}

fn triggers_path() -> PathBuf {
    data_dir().join("triggers.json")
}

fn timeline_path() -> PathBuf {
    data_dir().join("timeline.json")
}

pub fn load_triggers() -> Vec<Trigger> {
    fs::read_to_string(triggers_path())
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save_triggers(triggers: &[Trigger]) -> Result<(), String> {
    let json = serde_json::to_string_pretty(triggers).map_err(|e| e.to_string())?;
    fs::write(triggers_path(), json).map_err(|e| e.to_string())
}

fn load_timeline() -> Vec<TimelineEntry> {
    fs::read_to_string(timeline_path())
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn append_timeline(entry: TimelineEntry) {
    let mut entries = load_timeline();
    entries.push(entry);
    // Keep last 500 entries
    if entries.len() > 500 {
        entries.drain(0..entries.len() - 500);
    }
    if let Ok(json) = serde_json::to_string_pretty(&entries) {
        fs::write(timeline_path(), json).ok();
    }
}

pub fn get_all(state: &TriggerState) -> Vec<Trigger> {
    state.lock().unwrap().clone()
}

pub fn upsert(state: &TriggerState, trigger: Trigger) -> Result<(), String> {
    let mut triggers = state.lock().unwrap();
    if let Some(pos) = triggers.iter().position(|t| t.id == trigger.id) {
        triggers[pos] = trigger;
    } else {
        triggers.push(trigger);
    }
    save_triggers(&triggers)
}

pub fn delete(state: &TriggerState, id: &str) -> Result<(), String> {
    let mut triggers = state.lock().unwrap();
    triggers.retain(|t| t.id != id);
    save_triggers(&triggers)
}

pub fn new_trigger(name: String, condition: Condition, action: Action) -> Trigger {
    Trigger {
        id: Uuid::new_v4().to_string(),
        name,
        enabled: true,
        condition,
        action,
        last_fired: None,
        fire_count: 0,
        created_at: Local::now().timestamp(),
    }
}

pub fn fire_trigger(state: &TriggerState, id: &str) -> Result<String, String> {
    let mut triggers = state.lock().unwrap();
    let trigger = triggers.iter_mut().find(|t| t.id == id)
        .ok_or_else(|| "Trigger not found".to_string())?;

    let result = execute_action(&trigger.action);
    let success = result.is_ok();
    let note = result.as_ref().err().cloned();

    trigger.last_fired = Some(Local::now().timestamp());
    trigger.fire_count += 1;

    let entry = TimelineEntry {
        trigger_id: trigger.id.clone(),
        trigger_name: trigger.name.clone(),
        fired_at: Local::now().timestamp(),
        success,
        note,
    };

    save_triggers(&triggers).ok();
    drop(triggers);
    append_timeline(entry);

    logger::log(&format!("Trigger fired: {} (success: {})", id, success));
    result
}

fn execute_action(action: &Action) -> Result<String, String> {
    match action {
        Action::SwitchPowerPlan { plan } => {
            let guid = match plan.as_str() {
                "high" => "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c",
                "balanced" => "381b4222-f694-41f0-9685-ff5bb260df2e",
                "saver" => "a1841308-3541-4fab-bc81-f71556f20b4a",
                _ => plan.as_str(),
            };
            ps(&format!("powercfg /setactive {}", guid))
        }
        Action::KillProcess { name } => {
            ps(&format!("Stop-Process -Name '{}' -Force -ErrorAction SilentlyContinue", name))
        }
        Action::SwitchDns { server } => {
            ps(&format!(
                "Get-NetAdapter | Where-Object Status -eq 'Up' | ForEach-Object {{ Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses '{}' }}",
                server
            ))
        }
        Action::RunOptimizer => {
            // Trigger BladeOptimize if present, else stub
            ps("if (Test-Path 'C:\\Program Files\\BladeOptimize\\blade-optimize.exe') { Start-Process 'C:\\Program Files\\BladeOptimize\\blade-optimize.exe' -Verb RunAs } else { 'optimizer not installed' }")
        }
        Action::ShowNotification { title, body } => {
            let script = format!(
                "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] | Out-Null;\
                 $t=[Windows.UI.Notifications.ToastTemplateType]::ToastText02;\
                 $x=[Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent($t);\
                 $x.GetElementsByTagName('text')[0].AppendChild($x.CreateTextNode('{}'))|Out-Null;\
                 $x.GetElementsByTagName('text')[1].AppendChild($x.CreateTextNode('{}'))|Out-Null;\
                 $n=[Windows.UI.Notifications.ToastNotification]::new($x);\
                 [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Blade System').Show($n)",
                title, body
            );
            ps(&script)
        }
        Action::RunScript { powershell } => {
            ps(powershell)
        }
        Action::OpenApp { path } => {
            ps(&format!("Start-Process '{}'", path))
        }
    }
}

// Background monitoring — called from the tokio loop in lib.rs
pub async fn check_and_fire(state: &TriggerState) {
    use sysinfo::System;

    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu = sys.global_cpu_usage();
    let ram_pct = if sys.total_memory() > 0 {
        (sys.used_memory() as f32 / sys.total_memory() as f32) * 100.0
    } else {
        0.0
    };

    let process_names: Vec<String> = sys.processes()
        .values()
        .map(|p| p.name().to_string_lossy().to_lowercase())
        .collect();

    let now = Local::now();

    let triggers = {
        let guard = state.lock().unwrap();
        guard.clone()
    };

    for trigger in triggers.iter().filter(|t| t.enabled) {
        let should_fire = match &trigger.condition {
            Condition::CpuAbove { percent, .. } => cpu > *percent as f32,
            Condition::RamAbove { percent } => ram_pct > *percent as f32,
            Condition::ProcessStarted { name } => {
                process_names.iter().any(|p| p.contains(&name.to_lowercase()))
            }
            Condition::TimeSchedule { hour, minute } => {
                now.format("%H").to_string().parse::<u8>().unwrap_or(0) == *hour
                    && now.format("%M").to_string().parse::<u8>().unwrap_or(0) == *minute
                    && trigger.last_fired.map_or(true, |lf| now.timestamp() - lf > 60)
            }
            // USB, WiFi, battery, idle — polled by OS events in future iteration
            _ => false,
        };

        if should_fire {
            // Don't fire more than once per 60s per trigger
            let cooldown_ok = trigger.last_fired
                .map_or(true, |lf| now.timestamp() - lf > 60);

            if cooldown_ok {
                fire_trigger(state, &trigger.id).ok();
            }
        }
    }
}
