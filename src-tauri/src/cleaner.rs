use crate::logger;
use crate::registry::ps;

#[derive(serde::Serialize)]
pub struct CleanResult {
    pub freed_mb: u64,
    pub items: Vec<String>,
}

pub fn run_all() -> CleanResult {
    logger::log("Cleaner: running...");
    let mut total_mb = 0u64;
    let mut items = Vec::new();

    let (mb, log) = clean_temp();
    total_mb += mb;
    items.extend(log);

    let (mb, log) = clean_windows_update();
    total_mb += mb;
    items.extend(log);

    let (mb, log) = clean_browser_cache();
    total_mb += mb;
    items.extend(log);

    let (mb, log) = clean_recycle_bin();
    total_mb += mb;
    items.extend(log);

    logger::log(&format!("Cleaner: freed {}MB", total_mb));
    CleanResult { freed_mb: total_mb, items }
}

fn clean_temp() -> (u64, Vec<String>) {
    let dirs = [
        r"%TEMP%",
        r"%TMP%",
        r"C:\Windows\Temp",
        r"C:\Windows\Prefetch",
    ];
    let mut freed = 0u64;
    let mut items = Vec::new();

    for dir in &dirs {
        let expanded = ps(&format!("[System.Environment]::ExpandEnvironmentVariables('{}')", dir))
            .unwrap_or_default();
        let size_before = get_dir_size_mb(&expanded);
        let _ = ps(&format!(
            "Remove-Item -Path '{}\\*' -Recurse -Force -ErrorAction SilentlyContinue 2>$null; 'ok'",
            expanded
        ));
        let size_after = get_dir_size_mb(&expanded);
        let delta = size_before.saturating_sub(size_after);
        if delta > 0 {
            freed += delta;
            items.push(format!("Temp ({}): {}MB freed", dir, delta));
        }
    }

    (freed, items)
}

fn clean_windows_update() -> (u64, Vec<String>) {
    let size_before = get_dir_size_mb(r"C:\Windows\SoftwareDistribution\Download");
    let _ = ps(
        "Stop-Service wuauserv -Force -ErrorAction SilentlyContinue; \
         Remove-Item 'C:\\Windows\\SoftwareDistribution\\Download\\*' -Recurse -Force -ErrorAction SilentlyContinue; \
         Start-Service wuauserv -ErrorAction SilentlyContinue"
    );
    let size_after = get_dir_size_mb(r"C:\Windows\SoftwareDistribution\Download");
    let freed = size_before.saturating_sub(size_after);
    if freed > 0 {
        (freed, vec![format!("Windows Update cache: {}MB freed", freed)])
    } else {
        (0, vec![])
    }
}

fn clean_browser_cache() -> (u64, Vec<String>) {
    let mut freed = 0u64;
    let mut items = Vec::new();

    let caches = [
        (r"%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cache", "Chrome"),
        (r"%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Cache", "Edge"),
        (r"%LOCALAPPDATA%\Mozilla\Firefox\Profiles", "Firefox"),
        (r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\Cache", "Brave"),
    ];

    for (path, browser) in &caches {
        let expanded = ps(&format!("[System.Environment]::ExpandEnvironmentVariables('{}')", path))
            .unwrap_or_default();
        let size_before = get_dir_size_mb(&expanded);
        let _ = ps(&format!(
            "Remove-Item -Path '{}\\*' -Recurse -Force -ErrorAction SilentlyContinue 2>$null; 'ok'",
            expanded
        ));
        let size_after = get_dir_size_mb(&expanded);
        let delta = size_before.saturating_sub(size_after);
        if delta > 0 {
            freed += delta;
            items.push(format!("{} cache: {}MB freed", browser, delta));
        }
    }

    (freed, items)
}

fn clean_recycle_bin() -> (u64, Vec<String>) {
    let _ = ps("Clear-RecycleBin -Force -ErrorAction SilentlyContinue");
    (0, vec!["Recycle Bin emptied".to_string()])
}

fn get_dir_size_mb(path: &str) -> u64 {
    if path.is_empty() { return 0; }
    let result = ps(&format!(
        "try {{ (Get-ChildItem -Path '{}' -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB }} catch {{ 0 }}",
        path
    )).unwrap_or_default();
    result.trim().parse::<f64>().unwrap_or(0.0) as u64
}
