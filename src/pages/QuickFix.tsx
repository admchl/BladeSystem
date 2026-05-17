import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

interface QuickAction {
  id: string;
  title: string;
  desc: string;
  icon: string;
  impact: 'high' | 'medium' | 'low';
  command: () => Promise<unknown>;
}

export function QuickFix() {
  const [running, setRunning] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [log, setLog] = useState<string[]>([]);

  const actions: QuickAction[] = [
    {
      id: 'optimize',
      title: 'Run Full Optimizer',
      desc: 'Disable telemetry, remove bloatware, apply performance tweaks',
      icon: '🚀',
      impact: 'high',
      command: () => invoke('run_optimizer'),
    },
    {
      id: 'clean',
      title: 'Clean Junk Files',
      desc: 'Clear temp files, browser cache, Windows Update cache',
      icon: '🧹',
      impact: 'medium',
      command: () => invoke('run_cleaner'),
    },
    {
      id: 'hosts',
      title: 'Block Tracking Domains',
      desc: 'Add 25 ad/tracking domains to hosts file',
      icon: '🛡️',
      impact: 'medium',
      command: () => invoke('run_hosts_block'),
    },
    {
      id: 'flush_dns',
      title: 'Flush DNS Cache',
      desc: 'Clear DNS resolver cache and re-register',
      icon: '🌐',
      impact: 'low',
      command: () => invoke('flush_dns'),
    },
  ];

  async function run(action: QuickAction) {
    setRunning(action.id);
    setLog(prev => [`Running: ${action.title}...`, ...prev]);
    try {
      const result = await action.command();
      const lines = Array.isArray(result) ? result as string[] : [String(result)];
      setLog(prev => [...lines, ...prev]);
      setDone(prev => new Set([...prev, action.id]));
    } catch (e) {
      setLog(prev => [`Error: ${e}`, ...prev]);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="page">
      <div className="page-title">Quick Fix</div>
      <div className="page-subtitle">One-click system improvements</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        <div className="col gap-8">
          {actions.map(a => (
            <div key={a.id} className="list-item">
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{a.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{a.desc}</div>
              </div>
              <Badge variant={a.impact === 'high' ? 'danger' : a.impact === 'medium' ? 'warning' : 'neutral'}>
                {a.impact} impact
              </Badge>
              <Button
                variant={done.has(a.id) ? 'success' : 'primary'}
                size="sm"
                disabled={running !== null}
                onClick={() => run(a)}
              >
                {running === a.id ? '...' : done.has(a.id) ? '✓ Done' : 'Run'}
              </Button>
            </div>
          ))}
        </div>

        <Card>
          <div className="card-title" style={{ marginBottom: 10 }}>Activity log</div>
          <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {log.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-dimmer)' }}>No activity yet</div>
            ) : log.map((l, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'Consolas, monospace' }}>{l}</div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
