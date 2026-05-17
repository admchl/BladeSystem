use sysinfo::{Components, Disks, System};
use crate::models::{LiveStats, HardwareInfo};

pub fn get_live_stats() -> LiveStats {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_pct = sys.global_cpu_usage();
    let ram_used = sys.used_memory() as f32 / 1_073_741_824.0;
    let ram_total = sys.total_memory() as f32 / 1_073_741_824.0;
    let ram_pct = if ram_total > 0.0 { (ram_used / ram_total) * 100.0 } else { 0.0 };

    let disks = Disks::new_with_refreshed_list();
    let (disk_used_gb, disk_total_gb) = disks
        .list()
        .iter()
        .find(|d| d.mount_point().to_str().map_or(false, |m| m.starts_with("C:")))
        .map(|d| {
            let total = d.total_space() as f32 / 1_073_741_824.0;
            let avail = d.available_space() as f32 / 1_073_741_824.0;
            (total - avail, total)
        })
        .unwrap_or((0.0, 1.0));

    let disk_pct = if disk_total_gb > 0.0 { (disk_used_gb / disk_total_gb) * 100.0 } else { 0.0 };

    let components = Components::new_with_refreshed_list();
    let cpu_temp = components
        .list()
        .iter()
        .find(|c| {
            let label = c.label().to_lowercase();
            label.contains("cpu") || label.contains("core") || label.contains("package")
        })
        .map(|c| c.temperature());

    LiveStats {
        cpu_pct,
        ram_pct,
        ram_used_gb: ram_used,
        ram_total_gb: ram_total,
        disk_pct,
        disk_used_gb,
        disk_total_gb,
        cpu_temp,
    }
}

pub fn get_hardware_info() -> HardwareInfo {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_name = sys.cpus().first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown CPU".to_string());
    let cpu_cores = sys.physical_core_count().unwrap_or(0);
    let ram_total_gb = sys.total_memory() as f32 / 1_073_741_824.0;

    let disks = Disks::new_with_refreshed_list();
    let disk_type = disks.list().first()
        .map(|d| if d.is_removable() { "HDD" } else { "SSD" }.to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    let gpu_vendor = detect_gpu_vendor();
    let form_factor = detect_form_factor();
    let os_version = System::os_version().unwrap_or_else(|| "Windows".to_string());

    HardwareInfo {
        cpu_name,
        cpu_cores,
        ram_total_gb,
        gpu_vendor,
        disk_type,
        form_factor,
        os_version,
    }
}

fn detect_gpu_vendor() -> String {
    use crate::registry::ps;
    let result = ps("(Get-WmiObject -Class Win32_VideoController | Select-Object -First 1 -ExpandProperty Name) 2>$null").unwrap_or_default();
    let lower = result.to_lowercase();
    if lower.contains("nvidia") {
        "NVIDIA".to_string()
    } else if lower.contains("amd") || lower.contains("radeon") {
        "AMD".to_string()
    } else if lower.contains("intel") {
        "Intel".to_string()
    } else {
        result.trim().to_string()
    }
}

fn detect_form_factor() -> String {
    use crate::registry::ps;
    let result = ps("(Get-WmiObject -Class Win32_SystemEnclosure).ChassisTypes 2>$null").unwrap_or_default();
    let chassis: u32 = result.trim().parse().unwrap_or(0);
    match chassis {
        8 | 9 | 10 | 11 | 12 | 14 | 18 | 21 | 30 | 31 | 32 => "Laptop",
        _ => "Desktop",
    }.to_string()
}
