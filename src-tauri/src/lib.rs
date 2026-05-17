mod logger;
mod registry;
mod models;
mod stats;
mod health;
mod triggers;
mod optimizer;
mod cleaner;
mod startup;
mod processes;
mod network;
mod repair;
mod backup;

use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};
use models::{HealthScore, LiveStats, HardwareInfo};
use triggers::{Trigger, TriggerState, Condition, Action};
use cleaner::CleanResult;
use startup::StartupItem;
use processes::ProcessInfo;
use network::DnsPreset;

pub struct AppState {
    pub triggers: TriggerState,
}

// ── Health & Stats ────────────────────────────────────────────────────────────

#[tauri::command]
fn get_health_score() -> HealthScore {
    health::get_health_score()
}

#[tauri::command]
fn get_live_stats() -> LiveStats {
    stats::get_live_stats()
}

#[tauri::command]
fn get_hardware_info() -> HardwareInfo {
    stats::get_hardware_info()
}

// ── Triggers ─────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_triggers(state: State<AppState>) -> Vec<Trigger> {
    triggers::get_all(&state.triggers)
}

#[tauri::command]
fn save_trigger(state: State<AppState>, trigger: Trigger) -> Result<(), String> {
    triggers::upsert(&state.triggers, trigger)
}

#[tauri::command]
fn delete_trigger(state: State<AppState>, id: String) -> Result<(), String> {
    triggers::delete(&state.triggers, &id)
}

#[tauri::command]
fn fire_trigger(state: State<AppState>, id: String) -> Result<String, String> {
    triggers::fire_trigger(&state.triggers, &id)
}

#[tauri::command]
fn create_trigger(state: State<AppState>, name: String, condition: Condition, action: Action) -> Result<Trigger, String> {
    let t = triggers::new_trigger(name, condition, action);
    triggers::upsert(&state.triggers, t.clone())?;
    Ok(t)
}

// ── Optimizer ─────────────────────────────────────────────────────────────────

#[tauri::command]
fn run_optimizer() -> Vec<String> {
    optimizer::run_all()
}

#[tauri::command]
fn run_hosts_block() -> Vec<String> {
    optimizer::run_hosts()
}

// ── Cleaner ───────────────────────────────────────────────────────────────────

#[tauri::command]
fn run_cleaner() -> CleanResult {
    cleaner::run_all()
}

// ── Startup ───────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_startup_items() -> Vec<StartupItem> {
    startup::get_startup_items()
}

#[tauri::command]
fn disable_startup_item(name: String, source: String) -> Result<(), String> {
    startup::disable_startup_item(&name, &source)
}

// ── Processes ─────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_top_processes() -> Vec<ProcessInfo> {
    processes::get_top_processes()
}

#[tauri::command]
fn kill_process(pid: u32) -> Result<(), String> {
    processes::kill_process(pid)
}

// ── Network ───────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_dns_presets() -> Vec<DnsPreset> {
    network::get_dns_presets()
}

#[tauri::command]
fn apply_dns(primary: String, secondary: String) -> Result<String, String> {
    network::apply_dns(&primary, &secondary)
}

#[tauri::command]
fn get_current_dns() -> String {
    network::get_current_dns()
}

#[tauri::command]
fn optimize_mtu() -> Result<String, String> {
    network::optimize_mtu()
}

// ── Repair ────────────────────────────────────────────────────────────────────

#[tauri::command]
fn run_sfc(app: AppHandle) {
    repair::run_sfc(app);
}

#[tauri::command]
fn run_dism(app: AppHandle) {
    repair::run_dism(app);
}

#[tauri::command]
fn flush_dns() -> Result<String, String> {
    repair::flush_dns()
}

#[tauri::command]
fn reset_network() -> Result<String, String> {
    repair::reset_network()
}

// ── Backup ────────────────────────────────────────────────────────────────────

#[tauri::command]
fn run_backup(source: String, dest: String) -> Result<String, String> {
    backup::run_backup(&source, &dest)
}

#[tauri::command]
fn export_settings() -> Result<String, String> {
    backup::export_settings()
}

// ── Window ────────────────────────────────────────────────────────────────────

#[tauri::command]
fn show_window(app: AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        w.show().ok();
        w.set_focus().ok();
    }
}

fn spawn_background_loop(app: AppHandle, trigger_state: TriggerState) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(5));
        let mut stats_tick = 0u32;

        loop {
            interval.tick().await;
            stats_tick += 1;

            // Emit live stats every 2 ticks (10s) — lightweight
            if stats_tick % 2 == 0 {
                let stats = stats::get_live_stats();
                let _ = app.emit("stats-update", &stats);
            }

            // Check triggers every tick
            triggers::check_and_fire(&trigger_state).await;
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let loaded_triggers = triggers::load_triggers();
    let trigger_state: TriggerState = Arc::new(Mutex::new(loaded_triggers));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .manage(AppState { triggers: Arc::clone(&trigger_state) })
        .invoke_handler(tauri::generate_handler![
            // health/stats
            get_health_score,
            get_live_stats,
            get_hardware_info,
            // triggers
            get_triggers,
            save_trigger,
            delete_trigger,
            fire_trigger,
            create_trigger,
            // optimizer
            run_optimizer,
            run_hosts_block,
            // cleaner
            run_cleaner,
            // startup
            get_startup_items,
            disable_startup_item,
            // processes
            get_top_processes,
            kill_process,
            // network
            get_dns_presets,
            apply_dns,
            get_current_dns,
            optimize_mtu,
            // repair
            run_sfc,
            run_dism,
            flush_dns,
            reset_network,
            // backup
            run_backup,
            export_settings,
            // window
            show_window,
        ])
        .setup(move |app| {
            let app_handle = app.handle().clone();
            let ts = Arc::clone(&trigger_state);
            spawn_background_loop(app_handle.clone(), ts);

            // Show window after setup
            if let Some(w) = app.get_webview_window("main") {
                w.show().ok();
            }

            logger::log("=== Blade System started ===");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Blade System");
}
