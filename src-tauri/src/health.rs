use crate::models::HealthScore;
use crate::stats::get_live_stats;
use crate::registry::ps;

pub fn get_health_score() -> HealthScore {
    let stats = get_live_stats();

    let cpu_idle = (100.0 - stats.cpu_pct) as u32;
    let ram_free_pct = (100.0 - stats.ram_pct) as u32;
    let disk_free_pct = (100.0 - stats.disk_pct) as u32;

    // CPU: 30%, RAM: 25%, Disk: 20%
    let cpu_score  = (cpu_idle.min(100) as f32 * 0.30) as u32;
    let ram_score  = (ram_free_pct.min(100) as f32 * 0.25) as u32;
    let disk_score = (disk_free_pct.min(100) as f32 * 0.20) as u32;

    // Startup items penalty: 15% weight
    let startup_count = get_startup_item_count();
    let startup_penalty = match startup_count {
        0..=5  => 0u32,
        6..=10 => 3,
        11..=20 => 8,
        _ => 15,
    };

    // Privacy bonus: 10% — check if telemetry disabled
    let privacy_bonus = get_privacy_score();

    let base = cpu_score + ram_score + disk_score + privacy_bonus;
    let score = base.saturating_sub(startup_penalty).min(100);

    HealthScore {
        score,
        cpu_idle,
        ram_free_pct,
        disk_free_pct,
        startup_penalty,
        background_penalty: 0,
        privacy_bonus,
    }
}

fn get_startup_item_count() -> u32 {
    let script = r#"
        $count = 0
        @('HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run',
          'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run') |
        ForEach-Object { if (Test-Path $_) { $count += (Get-ItemProperty $_ -ErrorAction SilentlyContinue).PSObject.Properties.Where({$_.Name -notlike 'PS*'}).Count } }
        $count
    "#;
    ps(script).unwrap_or_default().trim().parse::<u32>().unwrap_or(0)
}

fn get_privacy_score() -> u32 {
    // Check if AllowTelemetry=0 (means user ran optimizer)
    let script = r#"(Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection' -Name AllowTelemetry -ErrorAction SilentlyContinue).AllowTelemetry"#;
    let val = ps(script).unwrap_or_default().trim().to_string();
    if val == "0" { 10 } else { 3 }
}
