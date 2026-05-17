import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Toggle } from '../components/ui/Toggle';

interface OptModule {
  id: string;
  title: string;
  desc: string;
  icon: string;
  command: string;
}

const MODULES: OptModule[] = [
  { id: 'telemetry', title: 'Disable Telemetry', desc: 'AllowTelemetry=0, disable DiagTrack, dmwappushservice, error reporting', icon: '📡', command: 'run_optimizer' },
  { id: 'copilot', title: 'Remove Copilot & AI', desc: 'Disable Copilot, Recall, Bing search, Edge startup boost', icon: '🤖', command: 'run_optimizer' },
  { id: 'bloatware', title: 'Remove Bloatware', desc: 'Uninstall Xbox apps, Clipchamp, Teams, news, weather and more', icon: '🗑️', command: 'run_optimizer' },
  { id: 'performance', title: 'Performance Tweaks', desc: 'SysMain/WSearch off, High Performance power plan, NTFS tweak', icon: '⚡', command: 'run_optimizer' },
  { id: 'hosts', title: 'Block Tracking Domains', desc: 'Append 25 ad/tracker domains to hosts file', icon: '🛡️', command: 'run_hosts_block' },
];

export function Optimizer() {
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(MODULES.map(m => m.id)));
  const [log, setLog] = useState<string[]>([]);

  async function runAll() {
    setRunning(true);
    setLog(['Starting optimization...']);
    try {
      const result = await invoke<string[]>('run_optimizer');
      setLog(prev => [...prev, ...result, '✓ Optimization complete']);
    } catch (e) {
      setLog(prev => [...prev, `Error: ${e}`]);
    }
    setRunning(false);
  }

  return (
    <div className="page">
      <div className="page-title">Optimizer</div>
      <div className="page-subtitle">Privacy, performance, and bloatware removal</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        <div className="col gap-8">
          {MODULES.map(m => (
            <div key={m.id} className="list-item">
              <span style={{ fontSize: 18 }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{m.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{m.desc}</div>
              </div>
              <Toggle
                checked={selected.has(m.id)}
                onChange={v => {
                  setSelected(prev => {
                    const next = new Set(prev);
                    v ? next.add(m.id) : next.delete(m.id);
                    return next;
                  });
                }}
              />
            </div>
          ))}

          <div style={{ marginTop: 8 }}>
            <Button variant="primary" onClick={runAll} disabled={running || selected.size === 0}>
              {running ? 'Optimizing...' : `Run ${selected.size} module${selected.size !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>

        <Card>
          <div className="card-title" style={{ marginBottom: 10 }}>Output</div>
          <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {log.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-dimmer)' }}>Ready to optimize</div>
            ) : log.map((l, i) => (
              <div key={i} style={{ fontSize: 11, color: l.startsWith('✓') ? 'var(--success)' : l.startsWith('Error') ? 'var(--danger)' : 'var(--text-dim)', fontFamily: 'Consolas, monospace' }}>
                {l}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
