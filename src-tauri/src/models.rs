use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthScore {
    pub score: u32,
    pub cpu_idle: u32,
    pub ram_free_pct: u32,
    pub disk_free_pct: u32,
    pub startup_penalty: u32,
    pub background_penalty: u32,
    pub privacy_bonus: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiveStats {
    pub cpu_pct: f32,
    pub ram_pct: f32,
    pub ram_used_gb: f32,
    pub ram_total_gb: f32,
    pub disk_pct: f32,
    pub disk_used_gb: f32,
    pub disk_total_gb: f32,
    pub cpu_temp: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareInfo {
    pub cpu_name: String,
    pub cpu_cores: usize,
    pub ram_total_gb: f32,
    pub gpu_vendor: String,
    pub disk_type: String,
    pub form_factor: String,
    pub os_version: String,
}
