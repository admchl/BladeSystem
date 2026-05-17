use serde::{Deserialize, Serialize};
use crate::registry::ps;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartupItem {
    pub name: String,
    pub path: String,
    pub enabled: bool,
    pub source: String,
    pub impact: String,
}

pub fn get_startup_items() -> Vec<StartupItem> {
    let mut items = Vec::new();

    // HKCU Run key
    let out = ps(r#"
        $items = @()
        $keys = @(
            'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run',
            'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run',
            'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run'
        )
        foreach ($key in $keys) {
            if (Test-Path $key) {
                $reg = Get-ItemProperty $key -ErrorAction SilentlyContinue
                $reg.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | ForEach-Object {
                    $items += [PSCustomObject]@{ name=$_.Name; path=$_.Value; source=$key }
                }
            }
        }
        $items | ConvertTo-Json -Compress
    "#).unwrap_or_default();

    #[derive(Deserialize)]
    struct RawItem { name: String, path: String, source: String }

    if let Ok(raw) = serde_json::from_str::<Vec<RawItem>>(&out) {
        for r in raw {
            items.push(StartupItem {
                enabled: true,
                impact: classify_impact(&r.path),
                name: r.name,
                path: r.path,
                source: r.source,
            });
        }
    } else if let Ok(single) = serde_json::from_str::<serde_json::Value>(&out) {
        // single item returns object not array
        if let (Some(name), Some(path), Some(source)) = (
            single["name"].as_str(),
            single["path"].as_str(),
            single["source"].as_str(),
        ) {
            items.push(StartupItem {
                name: name.to_string(),
                path: path.to_string(),
                source: source.to_string(),
                enabled: true,
                impact: classify_impact(path),
            });
        }
    }

    items
}

pub fn disable_startup_item(name: &str, source: &str) -> Result<(), String> {
    let script = format!(
        "Remove-ItemProperty -Path '{}' -Name '{}' -ErrorAction SilentlyContinue",
        source, name
    );
    ps(&script).map(|_| ()).map_err(|e| e)
}

fn classify_impact(path: &str) -> String {
    let lower = path.to_lowercase();
    if lower.contains("update") || lower.contains("discord") || lower.contains("steam")
        || lower.contains("spotify") || lower.contains("teams") || lower.contains("onedrive") {
        "High".to_string()
    } else if lower.contains("antivirus") || lower.contains("defender") || lower.contains("security") {
        "Low".to_string()
    } else {
        "Medium".to_string()
    }
}
