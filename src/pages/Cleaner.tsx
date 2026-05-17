import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

interface CleanResult { freed_mb: number; items: string[] }

export function Cleaner() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CleanResult | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    const r = await invoke<CleanResult>('run_cleaner');
    setResult(r);
    setRunning(false);
  }

  return (
    <div className="page">
      <div className="page-title">Cleaner</div>
      <div className="page-subtitle">Remove junk files and free up disk space</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card>
          <div className="card-title">What gets cleaned</div>
          <div className="card-desc" style={{ marginBottom: 16 }}>Scans and removes unnecessary files</div>
          {[
            { icon: '🗂️', label: 'Temp & TMP folders', desc: 'System and user temp files' },
            { icon: '🔄', label: 'Windows Update cache', desc: 'Old update downloads' },
            { icon: '🌐', label: 'Browser cache', desc: 'Chrome, Edge, Firefox, Brave' },
            { icon: '🗑️', label: 'Recycle Bin', desc: 'Empties all drives' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{item.desc}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <Button variant="primary" onClick={run} disabled={running}>
              {running ? 'Scanning & cleaning...' : 'Clean now'}
            </Button>
          </div>
        </Card>

        <Card>
          <div className="card-title">Results</div>
          {!result ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon">🧹</div>
              <div className="empty-state-desc">Run the cleaner to see results</div>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--success)' }}>
                  {result.freed_mb > 1024
                    ? `${(result.freed_mb / 1024).toFixed(1)} GB`
                    : `${result.freed_mb} MB`}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>freed</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {result.items.map((item, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'Consolas, monospace' }}>
                    ✓ {item}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
