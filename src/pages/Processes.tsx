import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';

interface ProcessInfo {
  pid: number;
  name: string;
  cpu_pct: number;
  ram_mb: number;
  status: string;
}

export function Processes() {
  const [procs, setProcs] = useState<ProcessInfo[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, []);

  async function refresh() {
    const list = await invoke<ProcessInfo[]>('get_top_processes');
    setProcs(list);
  }

  async function kill(pid: number, name: string) {
    if (!confirm(`Kill ${name} (PID ${pid})?`)) return;
    setLoading(true);
    await invoke('kill_process', { pid }).catch(() => {});
    await refresh();
    setLoading(false);
  }

  const filtered = procs.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-title">Processes</div>
      <div className="page-subtitle">Top 50 processes by CPU usage — live refresh every 5s</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          className="input"
          placeholder="Filter by name..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ maxWidth: 240 }}
        />
        <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
          Refresh
        </Button>
      </div>

      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 80px 80px 70px 60px',
          padding: '8px 12px', fontSize: 10, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dimmer)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div>Process</div>
          <div>CPU</div>
          <div>RAM</div>
          <div>Status</div>
          <div></div>
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {filtered.map(p => (
            <div key={p.pid} style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 80px 70px 60px',
              padding: '6px 12px', borderBottom: '1px solid var(--border)',
              alignItems: 'center', fontSize: 12,
            }}>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ color: 'var(--text)' }}>{p.name}</span>
                <span style={{ color: 'var(--text-dimmer)', marginLeft: 6, fontSize: 10 }}>PID {p.pid}</span>
              </div>
              <div>
                <div style={{ marginBottom: 3, fontSize: 11, color: p.cpu_pct > 50 ? 'var(--danger)' : 'var(--text)' }}>
                  {p.cpu_pct.toFixed(1)}%
                </div>
                <ProgressBar value={p.cpu_pct} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {p.ram_mb > 1024 ? `${(p.ram_mb / 1024).toFixed(1)}GB` : `${p.ram_mb.toFixed(0)}MB`}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dimmer)' }}>{p.status}</div>
              <div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--danger)', padding: '3px 8px', fontSize: 10 }}
                  onClick={() => kill(p.pid, p.name)}
                >
                  Kill
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
