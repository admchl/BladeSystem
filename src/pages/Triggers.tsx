import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Toggle } from '../components/ui/Toggle';

interface Condition {
  type: string;
  percent?: number;
  for_seconds?: number;
  name?: string;
  ssid?: string;
  hour?: number;
  minute?: number;
  seconds?: number;
}

interface Action {
  type: string;
  plan?: string;
  name?: string;
  server?: string;
  title?: string;
  body?: string;
  powershell?: string;
  path?: string;
}

interface Trigger {
  id: string;
  name: string;
  enabled: boolean;
  condition: Condition;
  action: Action;
  last_fired: number | null;
  fire_count: number;
  created_at: number;
}

const CONDITION_LABELS: Record<string, string> = {
  cpu_above: 'CPU above threshold',
  ram_above: 'RAM above threshold',
  process_started: 'Process started',
  usb_connected: 'USB device connected',
  wifi_changed: 'WiFi network changed',
  battery_below: 'Battery below %',
  idle_for: 'System idle for',
  time_schedule: 'At scheduled time',
};

const ACTION_LABELS: Record<string, string> = {
  switch_power_plan: 'Switch power plan',
  kill_process: 'Kill process',
  switch_dns: 'Switch DNS',
  run_optimizer: 'Run Optimizer',
  show_notification: 'Show notification',
  run_script: 'Run PowerShell script',
  open_app: 'Open application',
};

function conditionSummary(c: Condition): string {
  switch (c.type) {
    case 'cpu_above': return `CPU > ${c.percent}%`;
    case 'ram_above': return `RAM > ${c.percent}%`;
    case 'process_started': return `Process: ${c.name}`;
    case 'usb_connected': return 'USB connected';
    case 'wifi_changed': return `WiFi: ${c.ssid}`;
    case 'battery_below': return `Battery < ${c.percent}%`;
    case 'idle_for': return `Idle ${c.seconds}s`;
    case 'time_schedule': return `At ${String(c.hour).padStart(2,'0')}:${String(c.minute).padStart(2,'0')}`;
    default: return c.type;
  }
}

function actionSummary(a: Action): string {
  switch (a.type) {
    case 'switch_power_plan': return `→ ${a.plan === 'high' ? 'High Performance' : a.plan === 'saver' ? 'Power Saver' : 'Balanced'}`;
    case 'kill_process': return `→ Kill ${a.name}`;
    case 'switch_dns': return `→ DNS: ${a.server}`;
    case 'run_optimizer': return '→ Run Optimizer';
    case 'show_notification': return `→ Notify: ${a.title}`;
    case 'run_script': return '→ PowerShell script';
    case 'open_app': return `→ Open ${a.path}`;
    default: return a.type;
  }
}

function timeAgo(ts: number | null): string {
  if (!ts) return 'never';
  const diff = Math.floor((Date.now() / 1000) - ts);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function TriggerCard({ trigger, onToggle, onFire, onEdit, onDelete }: {
  trigger: Trigger;
  onToggle: (id: string, v: boolean) => void;
  onFire: (id: string) => void;
  onEdit: (t: Trigger) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{trigger.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
            {conditionSummary(trigger.condition)} {actionSummary(trigger.action)}
          </div>
        </div>
        <Toggle checked={trigger.enabled} onChange={v => onToggle(trigger.id, v)} />
        <button
          className="btn btn-ghost btn-sm btn-icon"
          title="Test now"
          onClick={() => onFire(trigger.id)}
        >▶</button>
        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={() => onEdit(trigger)}
        >✏️</button>
        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={() => onDelete(trigger.id)}
          style={{ color: 'var(--danger)' }}
        >✕</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-dimmer)' }}>
        <span>Fired {trigger.fire_count}×</span>
        <span>·</span>
        <span>Last: {timeAgo(trigger.last_fired)}</span>
        <Badge variant={trigger.enabled ? 'success' : 'neutral'}>
          {trigger.enabled ? 'Active' : 'Paused'}
        </Badge>
      </div>
    </div>
  );
}

const EMPTY_CONDITION: Condition = { type: 'cpu_above', percent: 80 };
const EMPTY_ACTION: Action = { type: 'switch_power_plan', plan: 'high' };

function TriggerDrawer({ trigger, onSave, onClose }: {
  trigger: Trigger | null;
  onSave: (name: string, condition: Condition, action: Action, id?: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(trigger?.name ?? '');
  const [condition, setCondition] = useState<Condition>(trigger?.condition ?? EMPTY_CONDITION);
  const [action, setAction] = useState<Action>(trigger?.action ?? EMPTY_ACTION);

  function updateConditionType(type: string) {
    const defaults: Record<string, Condition> = {
      cpu_above:       { type, percent: 80, for_seconds: 30 },
      ram_above:       { type, percent: 85 },
      process_started: { type, name: '' },
      usb_connected:   { type },
      wifi_changed:    { type, ssid: '' },
      battery_below:   { type, percent: 20 },
      idle_for:        { type, seconds: 300 },
      time_schedule:   { type, hour: 9, minute: 0 },
    };
    setCondition(defaults[type] ?? { type });
  }

  function updateActionType(type: string) {
    const defaults: Record<string, Action> = {
      switch_power_plan: { type, plan: 'high' },
      kill_process:      { type, name: '' },
      switch_dns:        { type, server: '1.1.1.1' },
      run_optimizer:     { type },
      show_notification: { type, title: 'Blade System', body: '' },
      run_script:        { type, powershell: '' },
      open_app:          { type, path: '' },
    };
    setAction(defaults[type] ?? { type });
  }

  return (
    <div className="drawer-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="drawer">
        <div className="drawer-header">
          <div className="drawer-title">{trigger ? 'Edit Trigger' : 'New Trigger'}</div>
          <button className="btn btn-ghost btn-sm btn-icon ml-auto" onClick={onClose}>✕</button>
        </div>
        <div className="drawer-body">
          <div className="form-group">
            <label className="form-label">Trigger name</label>
            <input
              className="input"
              placeholder="e.g. Gaming Mode"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">When (Condition)</label>
            <select
              className="input"
              value={condition.type}
              onChange={e => updateConditionType(e.target.value)}
            >
              {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Condition config */}
          {(condition.type === 'cpu_above' || condition.type === 'ram_above' || condition.type === 'battery_below') && (
            <div className="form-group">
              <label className="form-label">Threshold (%)</label>
              <input
                className="input"
                type="number"
                min={1} max={100}
                value={condition.percent ?? ''}
                onChange={e => setCondition({ ...condition, percent: +e.target.value })}
              />
            </div>
          )}
          {condition.type === 'cpu_above' && (
            <div className="form-group">
              <label className="form-label">Sustained for (seconds)</label>
              <input
                className="input"
                type="number"
                min={5}
                value={condition.for_seconds ?? ''}
                onChange={e => setCondition({ ...condition, for_seconds: +e.target.value })}
              />
            </div>
          )}
          {(condition.type === 'process_started' || condition.type === 'kill_process') && (
            <div className="form-group">
              <label className="form-label">Process name (e.g. chrome.exe)</label>
              <input
                className="input"
                placeholder="process.exe"
                value={condition.name ?? ''}
                onChange={e => setCondition({ ...condition, name: e.target.value })}
              />
            </div>
          )}
          {condition.type === 'wifi_changed' && (
            <div className="form-group">
              <label className="form-label">WiFi SSID</label>
              <input
                className="input"
                placeholder="Network name"
                value={condition.ssid ?? ''}
                onChange={e => setCondition({ ...condition, ssid: e.target.value })}
              />
            </div>
          )}
          {condition.type === 'idle_for' && (
            <div className="form-group">
              <label className="form-label">Idle duration (seconds)</label>
              <input
                className="input"
                type="number"
                min={30}
                value={condition.seconds ?? ''}
                onChange={e => setCondition({ ...condition, seconds: +e.target.value })}
              />
            </div>
          )}
          {condition.type === 'time_schedule' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Hour (0–23)</label>
                <input
                  className="input"
                  type="number"
                  min={0} max={23}
                  value={condition.hour ?? 0}
                  onChange={e => setCondition({ ...condition, hour: +e.target.value })}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Minute (0–59)</label>
                <input
                  className="input"
                  type="number"
                  min={0} max={59}
                  value={condition.minute ?? 0}
                  onChange={e => setCondition({ ...condition, minute: +e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Then (Action)</label>
            <select
              className="input"
              value={action.type}
              onChange={e => updateActionType(e.target.value)}
            >
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Action config */}
          {action.type === 'switch_power_plan' && (
            <div className="form-group">
              <label className="form-label">Power Plan</label>
              <select
                className="input"
                value={action.plan}
                onChange={e => setAction({ ...action, plan: e.target.value })}
              >
                <option value="high">High Performance</option>
                <option value="balanced">Balanced</option>
                <option value="saver">Power Saver</option>
              </select>
            </div>
          )}
          {action.type === 'kill_process' && (
            <div className="form-group">
              <label className="form-label">Process name</label>
              <input
                className="input"
                placeholder="process.exe"
                value={action.name ?? ''}
                onChange={e => setAction({ ...action, name: e.target.value })}
              />
            </div>
          )}
          {action.type === 'switch_dns' && (
            <div className="form-group">
              <label className="form-label">DNS server IP</label>
              <input
                className="input"
                placeholder="1.1.1.1"
                value={action.server ?? ''}
                onChange={e => setAction({ ...action, server: e.target.value })}
              />
            </div>
          )}
          {action.type === 'show_notification' && (
            <>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="input" value={action.title ?? ''} onChange={e => setAction({ ...action, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <input className="input" value={action.body ?? ''} onChange={e => setAction({ ...action, body: e.target.value })} />
              </div>
            </>
          )}
          {action.type === 'run_script' && (
            <div className="form-group">
              <label className="form-label">PowerShell script</label>
              <textarea
                className="input"
                rows={4}
                style={{ resize: 'vertical', fontFamily: 'Consolas, monospace', fontSize: 11 }}
                value={action.powershell ?? ''}
                onChange={e => setAction({ ...action, powershell: e.target.value })}
              />
            </div>
          )}
          {action.type === 'open_app' && (
            <div className="form-group">
              <label className="form-label">Application path</label>
              <input
                className="input"
                placeholder="C:\Program Files\App\app.exe"
                value={action.path ?? ''}
                onChange={e => setAction({ ...action, path: e.target.value })}
              />
            </div>
          )}
        </div>

        <div className="drawer-footer">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!name.trim()}
            onClick={() => onSave(name, condition, action, trigger?.id)}
          >
            {trigger ? 'Save changes' : 'Create trigger'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Triggers() {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Trigger | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const list = await invoke<Trigger[]>('get_triggers');
    setTriggers(list);
  }

  async function handleSave(name: string, condition: Condition, action: Action, id?: string) {
    if (id) {
      const existing = triggers.find(t => t.id === id)!;
      await invoke('save_trigger', { trigger: { ...existing, name, condition, action } });
    } else {
      await invoke('create_trigger', { name, condition, action });
    }
    setDrawerOpen(false);
    setEditing(null);
    load();
  }

  async function handleToggle(id: string, enabled: boolean) {
    const t = triggers.find(x => x.id === id)!;
    await invoke('save_trigger', { trigger: { ...t, enabled } });
    setTriggers(prev => prev.map(x => x.id === id ? { ...x, enabled } : x));
  }

  async function handleFire(id: string) {
    const result = await invoke<string>('fire_trigger', { id }).catch(e => `Error: ${e}`);
    setStatus(result || 'Fired');
    setTimeout(() => setStatus(''), 3000);
  }

  async function handleDelete(id: string) {
    await invoke('delete_trigger', { id });
    setTriggers(prev => prev.filter(t => t.id !== id));
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <div className="page-title">Triggers</div>
        <div className="ml-auto">
          <Button variant="primary" onClick={() => { setEditing(null); setDrawerOpen(true); }}>
            + New Trigger
          </Button>
        </div>
      </div>
      <div className="page-subtitle">Automate actions based on conditions</div>

      {status && (
        <div style={{
          background: 'var(--accent-dim)', border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-sm)', padding: '8px 12px',
          fontSize: 12, color: 'var(--accent)', marginBottom: 12,
        }}>
          {status}
        </div>
      )}

      {triggers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚡</div>
          <div className="empty-state-title">No triggers yet</div>
          <div className="empty-state-desc">Create your first IF/THEN automation rule</div>
          <Button variant="primary" onClick={() => setDrawerOpen(true)}>Create trigger</Button>
        </div>
      ) : (
        <div className="col gap-8">
          {triggers.map(t => (
            <TriggerCard
              key={t.id}
              trigger={t}
              onToggle={handleToggle}
              onFire={handleFire}
              onEdit={tr => { setEditing(tr); setDrawerOpen(true); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {drawerOpen && (
        <TriggerDrawer
          trigger={editing}
          onSave={handleSave}
          onClose={() => { setDrawerOpen(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
