import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface StartupItem {
  name: string;
  path: string;
  enabled: boolean;
  source: string;
  impact: string;
}

export function Startup() {
  const [items, setItems] = useState<StartupItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const list = await invoke<StartupItem[]>('get_startup_items');
    setItems(list);
    setLoading(false);
  }

  async function disable(item: StartupItem) {
    await invoke('disable_startup_item', { name: item.name, source: item.source });
    setItems(prev => prev.map(i => i.name === item.name ? { ...i, enabled: false } : i));
  }

  const enabled = items.filter(i => i.enabled);
  const disabled = items.filter(i => !i.enabled);

  return (
    <div className="page">
      <div className="page-title">Startup</div>
      <div className="page-subtitle">Manage programs that launch at Windows startup</div>

      {loading ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Scanning startup items...</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ flex: 1, textAlign: 'center', padding: '12px 16px' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: enabled.length > 10 ? 'var(--warning)' : 'var(--success)' }}>
                {enabled.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Active at startup</div>
            </div>
            <div className="card" style={{ flex: 1, textAlign: 'center', padding: '12px 16px' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-dimmer)' }}>{disabled.length}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Disabled</div>
            </div>
          </div>

          <div className="col gap-8">
            {enabled.map(item => (
              <div key={item.name} className="list-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 12 }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dimmer)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.path}
                  </div>
                </div>
                <Badge variant={item.impact === 'High' ? 'danger' : item.impact === 'Low' ? 'neutral' : 'warning'}>
                  {item.impact}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => disable(item)}>Disable</Button>
              </div>
            ))}
            {disabled.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: 12 }}>Disabled</div>
                {disabled.map(item => (
                  <div key={item.name} className="list-item" style={{ opacity: 0.5 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 12 }}>{item.name}</div>
                    </div>
                    <Badge variant="neutral">Disabled</Badge>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
