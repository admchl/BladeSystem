import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '../components/ui/Card';

interface HardwareInfo {
  cpu_name: string;
  cpu_cores: number;
  ram_total_gb: number;
  gpu_vendor: string;
  disk_type: string;
  form_factor: string;
  os_version: string;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ color: 'var(--text)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export function Hardware() {
  const [info, setInfo] = useState<HardwareInfo | null>(null);

  useEffect(() => {
    invoke<HardwareInfo>('get_hardware_info').then(setInfo);
  }, []);

  if (!info) return (
    <div className="page">
      <div className="page-title">Hardware</div>
      <div style={{ color: 'var(--text-dim)', marginTop: 16 }}>Detecting hardware...</div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-title">Hardware</div>
      <div className="page-subtitle">System specification and detection</div>

      <div className="grid-2" style={{ gap: 16 }}>
        <Card>
          <div className="card-title" style={{ marginBottom: 12 }}>System</div>
          <InfoRow label="Form factor" value={info.form_factor} />
          <InfoRow label="OS" value={info.os_version} />
        </Card>

        <Card>
          <div className="card-title" style={{ marginBottom: 12 }}>Processor</div>
          <InfoRow label="CPU" value={info.cpu_name} />
          <InfoRow label="Cores" value={`${info.cpu_cores} cores`} />
        </Card>

        <Card>
          <div className="card-title" style={{ marginBottom: 12 }}>Memory & Storage</div>
          <InfoRow label="RAM" value={`${info.ram_total_gb.toFixed(0)} GB`} />
          <InfoRow label="Primary disk" value={info.disk_type} />
        </Card>

        <Card>
          <div className="card-title" style={{ marginBottom: 12 }}>Graphics</div>
          <InfoRow label="GPU vendor" value={info.gpu_vendor} />
        </Card>
      </div>
    </div>
  );
}
