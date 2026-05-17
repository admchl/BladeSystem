use crate::models::HealthScore;
use crate::stats::get_live_stats;

pub fn get_health_score() -> HealthScore {
    let stats = get_live_stats();

    let cpu_idle = (100.0 - stats.cpu_pct) as u32;
    let ram_free_pct = (100.0 - stats.ram_pct) as u32;
    let disk_free_pct = (100.0 - stats.disk_pct) as u32;

    // Each component contributes to a score out of 100
    let cpu_score = (cpu_idle.min(100) as f32 * 0.30) as u32;
    let ram_score = (ram_free_pct.min(100) as f32 * 0.25) as u32;
    let disk_score = (disk_free_pct.min(100) as f32 * 0.20) as u32;

    // Startup and background penalties (simplified — full impl comes with startup.rs)
    let startup_penalty = 0u32;
    let background_penalty = 0u32;
    let privacy_bonus = 10u32; // baseline — increases as user applies optimizations

    let base = cpu_score + ram_score + disk_score + privacy_bonus;
    let score = base.saturating_sub(startup_penalty + background_penalty).min(100);

    HealthScore {
        score,
        cpu_idle,
        ram_free_pct,
        disk_free_pct,
        startup_penalty,
        background_penalty,
        privacy_bonus,
    }
}
