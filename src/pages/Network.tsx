import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

interface DnsPreset { name: string; primary: string; secondary: string }

export function Network() {
  const [presets, setPresets] = useState<DnsPreset[]>([]);
  const [currentDns, setCurrentDns] = useState('');
  const [applying, setApplying] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    invoke<DnsPreset[]>('get_dns_presets').then(setPresets);
    invoke<string>('get_current_dns').then(setCurrentDns);
  }, []);

  async function applyDns(p: DnsPreset) {
    setApplying(true);
    setStatus('');
    try {
      await invoke('apply_dns', { primary: p.primary, secondary: p.secondary });
      setCurrentDns(p.primary || 'DHCP');
      setStatus(`✓ DNS changed to ${p.name}`);
    } catch (e) {
      setStatus(`Error: ${e}`);
    }
    setApplying(false);
    setTimeout(() => setStatus(''), 4000);
  }

  async function optimizeMtu() {
    setApplying(true);
    const result = await invoke<string>('optimize_mtu').catch(e => `Error: ${e}`);
    setStatus(result);
    setApplying(false);
    setTimeout(() => setStatus(''), 4000);
  }

  return (
    <div className="page">
      <div className="page-title">Network</div>
      <div className="page-subtitle">DNS switching, MTU optimization, network tools</div>

      {status && (
        <div style={{
          background: status.startsWith('✓') ? 'var(--success-dim)' : 'var(--danger-dim)',
          border: `1px solid ${status.startsWith('✓') ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
          borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 12,
          color: status.startsWith('✓') ? 'var(--success)' : 'var(--danger)', marginBottom: 12,
        }}>
          {status}
        </div>
      )}

      <div className="grid-2" style={{ gap: 16 }}>
        <Card>
          <div className="card-title" style={{ marginBottom: 4 }}>DNS Server</div>
          <div className="card-desc" style={{ marginBottom: 12 }}>
            Current: <span style={{ color: 'var(--accent)' }}>{currentDns || 'detecting...'}</span>
          </div>
          <div className="col gap-8">
            {presets.map(p => (
              <div key={p.name} className="list-item" style={{ padding: '10px 12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</div>
                  {p.primary && (
                    <div style={{ fontSize: 10, color: 'var(--text-dimmer)', fontFamily: 'Consolas, monospace', marginTop: 2 }}>
                      {p.primary} / {p.secondary}
                    </div>
                  )}
                </div>
                <Button variant="secondary" size="sm" disabled={applying} onClick={() => applyDns(p)}>
                  Apply
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="card-title" style={{ marginBottom: 12 }}>Network Tools</div>
          <div className="col gap-8">
            <div className="list-item">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>Optimize TCP/MTU</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Enable autotuninglevel, chimney, DCA, NetDMA</div>
              </div>
              <Button variant="secondary" size="sm" disabled={applying} onClick={optimizeMtu}>Run</Button>
            </div>
            <div className="list-item">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>Flush DNS Cache</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Clear resolver cache and re-register DNS</div>
              </div>
              <Button variant="secondary" size="sm" disabled={applying}
                onClick={() => invoke<string>('flush_dns').then(r => setStatus(r)).catch(e => setStatus(`${e}`))}>
                Run
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
