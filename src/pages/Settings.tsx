import { Card } from '../components/ui/Card';
import { Toggle } from '../components/ui/Toggle';
import { useState } from 'react';

export function Settings() {
  const [autostart, setAutostart] = useState(false);
  const [tray, setTray] = useState(true);
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="page">
      <div className="page-title">Settings</div>
      <div className="page-subtitle">Blade System preferences</div>

      <div className="col gap-12" style={{ maxWidth: 520 }}>
        <Card>
          <div className="card-title" style={{ marginBottom: 12 }}>General</div>
          <div className="col gap-12">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>Launch at startup</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Start Blade System when Windows boots</div>
              </div>
              <Toggle checked={autostart} onChange={setAutostart} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>Minimize to tray</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Keep running in background when closed</div>
              </div>
              <Toggle checked={tray} onChange={setTray} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>Trigger notifications</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Show Windows toast when triggers fire</div>
              </div>
              <Toggle checked={notifications} onChange={setNotifications} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-title" style={{ marginBottom: 8 }}>About</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-dim)' }}>
            <div><span style={{ color: 'var(--text)' }}>Blade System</span> v1.0.0</div>
            <div>Tauri 2 + React 19 + Rust</div>
            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-dimmer)' }}>
              Log: C:\ProgramData\blade_system_log.txt
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
