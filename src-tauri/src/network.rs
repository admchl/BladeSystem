use serde::{Deserialize, Serialize};
use crate::registry::ps;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsPreset {
    pub name: String,
    pub primary: String,
    pub secondary: String,
}

pub fn get_dns_presets() -> Vec<DnsPreset> {
    vec![
        DnsPreset { name: "Cloudflare (Fast)".into(), primary: "1.1.1.1".into(), secondary: "1.0.0.1".into() },
        DnsPreset { name: "Google".into(), primary: "8.8.8.8".into(), secondary: "8.8.4.4".into() },
        DnsPreset { name: "Quad9 (Secure)".into(), primary: "9.9.9.9".into(), secondary: "149.112.112.112".into() },
        DnsPreset { name: "OpenDNS".into(), primary: "208.67.222.222".into(), secondary: "208.67.220.220".into() },
        DnsPreset { name: "ISP Default".into(), primary: "".into(), secondary: "".into() },
    ]
}

pub fn apply_dns(primary: &str, secondary: &str) -> Result<String, String> {
    if primary.is_empty() {
        // Reset to DHCP
        let script = "Get-NetAdapter | Where-Object Status -eq 'Up' | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ResetServerAddresses }";
        return ps(script);
    }
    let script = format!(
        "Get-NetAdapter | Where-Object Status -eq 'Up' | ForEach-Object {{ Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses @('{}','{}') }}",
        primary, secondary
    );
    ps(&script)
}

pub fn optimize_mtu() -> Result<String, String> {
    ps("netsh int tcp set global autotuninglevel=normal; netsh int tcp set global chimney=enabled; netsh int tcp set global dca=enabled; netsh int tcp set global netdma=enabled; 'MTU optimized'")
}

pub fn get_current_dns() -> String {
    ps("(Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object { $_.ServerAddresses.Count -gt 0 } | Select-Object -First 1 -ExpandProperty ServerAddresses) -join ', '")
        .unwrap_or_else(|_| "Unknown".to_string())
}
