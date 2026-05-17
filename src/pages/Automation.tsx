import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

interface ScheduledTask {
  name: string;
  path: string;
  state: string;
  last_run: string;
  next_run: string;
  author: string;
}

interface AutoInfo {
  blade_automation_installed: boolean;
  user_task_count: number;
}

function stateVariant(state: string): 'success' | 'warning' | 'neutral' | 'danger' | 'accent' {
  switch (state.toLowerCase()) {
    case 'ready': return 'success';
    case 'running': return 'accent';
    case 'disabled': return 'neutral';
    default: return 'warning';
  }
}

export function Automation() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [info, setInfo] = useState<AutoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadInfo();
  }, []);

  async function loadInfo() {
    const i = await invoke<AutoInfo>('get_automation_info').catch(() => null);
    setInfo(i);
  }

  async function loadTasks() {
    setLoading(true);
    const list = await invoke<ScheduledTask[]>('get_scheduled_tasks').catch(() => []);
    setTasks(list);
    setLoading(false);
  }

  async function toggle(task: ScheduledTask, enable: boolean) {
    const result = await invoke<string>('toggle_scheduled_task', {
      taskPath: task.path, taskName: task.name, enable,
    }).catch(e => `Error: ${e}`);
    setStatus(result || (enable ? 'Enabled' : 'Disabled'));
    setTasks(prev => prev.map(t =>
      t.name === task.name && t.path === task.path
        ? { ...t, state: enable ? 'Ready' : 'Disabled' }
        : t
    ));
    setTimeout(() => setStatus(''), 3000);
  }

  async function runTask(task: ScheduledTask) {
    const result = await invoke<string>('run_scheduled_task', {
      taskPath: task.path, taskName: task.name,
    }).catch(e => `Error: ${e}`);
    setStatus(`${task.name}: ${result}`);
    setTimeout(() => setStatus(''), 3000);
  }

  async function launchBladeAutomation() {
    await invoke('launch_blade_automation').catch(e => setStatus(`${e}`));
  }

  const filtered = tasks.filter(t =>
    t.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-title">Automation</div>
      <div className="page-subtitle">Windows scheduled tasks and Blade Automation</div>

      {status && (
        <div style={{
          background: 'var(--accent-dim)', border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 12,
          color: 'var(--accent)', marginBottom: 12,
        }}>{status}</div>
      )}

      {/* Blade Automation card */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <div className="card-title">Blade Automation</div>
            <div className="card-desc" style={{ marginTop: 4 }}>
              Advanced IF/THEN automation — USB events, window focus, app launch rules, gaming mode, and more.
            </div>
          </div>
          <div className="ml-auto" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <Badge variant={info?.blade_automation_installed ? 'success' : 'neutral'}>
              {info?.blade_automation_installed ? 'Installed' : 'Not installed'}
            </Badge>
            <Button
              variant={info?.blade_automation_installed ? 'primary' : 'secondary'}
              size="sm"
              onClick={launchBladeAutomation}
            >
              {info?.blade_automation_installed ? 'Open' : 'Download'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Scheduled tasks */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          Windows Scheduled Tasks {info ? `(${info.user_task_count} user tasks)` : ''}
        </div>
        <Button variant="secondary" size="sm" disabled={loading} onClick={loadTasks}>
          {loading ? 'Loading...' : tasks.length ? 'Refresh' : 'Load tasks'}
        </Button>
        {tasks.length > 0 && (
          <input
            className="input"
            placeholder="Filter..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ maxWidth: 200 }}
          />
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-title">No tasks loaded</div>
          <div className="empty-state-desc">Click "Load tasks" to see your Windows scheduled tasks</div>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 120px 120px 80px',
            padding: '7px 12px', fontSize: 10, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dimmer)',
            borderBottom: '1px solid var(--border)',
          }}>
            <div>Task</div>
            <div>State</div>
            <div>Last run</div>
            <div>Next run</div>
            <div></div>
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {filtered.map((t, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 120px 120px 80px',
                padding: '7px 12px', borderBottom: '1px solid var(--border)',
                alignItems: 'center', fontSize: 12,
              }}>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dimmer)' }}>{t.path}</div>
                </div>
                <div><Badge variant={stateVariant(t.state)}>{t.state}</Badge></div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t.last_run}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t.next_run}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 10, padding: '3px 6px' }}
                    onClick={() => toggle(t, t.state.toLowerCase() === 'disabled')}
                    title={t.state.toLowerCase() === 'disabled' ? 'Enable' : 'Disable'}
                  >
                    {t.state.toLowerCase() === 'disabled' ? '▶' : '⏸'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 10, padding: '3px 6px' }}
                    onClick={() => runTask(t)}
                    title="Run now"
                  >
                    ▷
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
