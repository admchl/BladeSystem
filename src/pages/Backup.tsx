import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function Backup() {
  const [source, setSource] = useState('');
  const [dest, setDest] = useState('');
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');

  async function runBackup() {
    if (!source || !dest) return;
    setRunning(true);
    setStatus('');
    const result = await invoke<string>('run_backup', { source, dest }).catch(e => `Error: ${e}`);
    setStatus(result);
    setRunning(false);
  }

  async function exportSettings() {
    setRunning(true);
    const result = await invoke<string>('export_settings').catch(e => `Error: ${e}`);
    setStatus(result || '✓ Exported to C:\\ProgramData\\BladeSystem\\exports\\');
    setRunning(false);
  }

  return (
    <div className="page">
      <div className="page-title">Backup</div>
      <div className="page-subtitle">File backup and app settings export</div>

      <div className="grid-2" style={{ gap: 16 }}>
        <Card>
          <div className="card-title" style={{ marginBottom: 12 }}>File Backup</div>
          <div className="col gap-12">
            <div className="form-group">
              <label className="form-label">Source folder</label>
              <input className="input" placeholder="C:\Users\User\Documents" value={source} onChange={e => setSource(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Destination folder</label>
              <input className="input" placeholder="D:\Backup" value={dest} onChange={e => setDest(e.target.value)} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dimmer)' }}>
              Uses robocopy /MIR — mirrors source to destination. Timestamped subfolder created automatically.
            </div>
            <Button variant="primary" disabled={running || !source || !dest} onClick={runBackup}>
              {running ? 'Backing up...' : 'Start Backup'}
            </Button>
          </div>
        </Card>

        <Card>
          <div className="card-title" style={{ marginBottom: 8 }}>App Settings Export</div>
          <div className="card-desc" style={{ marginBottom: 16 }}>
            Export installed apps list (winget) to JSON — restore on new PC via Blade Setup
          </div>
          <Button variant="secondary" disabled={running} onClick={exportSettings}>
            Export installed apps
          </Button>

          {status && (
            <div style={{
              marginTop: 12, padding: '8px 12px', borderRadius: 'var(--radius-sm)',
              background: status.startsWith('Error') ? 'var(--danger-dim)' : 'var(--success-dim)',
              color: status.startsWith('Error') ? 'var(--danger)' : 'var(--success)',
              fontSize: 11, fontFamily: 'Consolas, monospace',
            }}>
              {status}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
