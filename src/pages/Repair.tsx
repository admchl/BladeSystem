import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function Repair() {
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  function appendLog(line: string) {
    setLog(prev => [...prev, line]);
  }

  async function runSfc() {
    setRunning(true);
    setLog([]);
    const unlisten = await listen<string>('repair-log', e => appendLog(e.payload));
    await invoke('run_sfc');
    setTimeout(() => { unlisten(); setRunning(false); }, 30000);
  }

  async function runDism() {
    setRunning(true);
    setLog([]);
    const unlisten = await listen<string>('repair-log', e => appendLog(e.payload));
    await invoke('run_dism');
    setTimeout(() => { unlisten(); setRunning(false); }, 120000);
  }

  async function run(cmd: string, label: string) {
    setRunning(true);
    appendLog(`Running: ${label}...`);
    const result = await invoke<string>(cmd).catch(e => `Error: ${e}`);
    appendLog(result || 'Done');
    setRunning(false);
  }

  const tools = [
    { label: 'System File Checker (SFC)', desc: 'Scan and repair corrupted Windows files', action: runSfc, long: true },
    { label: 'DISM Health Restore', desc: 'Repair Windows component store (takes 5–15 min)', action: runDism, long: true },
    { label: 'Flush DNS', desc: 'Clear DNS resolver cache', action: () => run('flush_dns', 'Flush DNS'), long: false },
    { label: 'Reset Network Stack', desc: 'Reset Winsock, TCP/IP stack (requires reboot)', action: () => run('reset_network', 'Reset Network'), long: false },
  ];

  return (
    <div className="page">
      <div className="page-title">Repair</div>
      <div className="page-subtitle">Windows system repair tools</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        <div className="col gap-8">
          {tools.map(t => (
            <div key={t.label} className="list-item">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 12 }}>{t.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{t.desc}</div>
              </div>
              <Button variant="secondary" size="sm" disabled={running} onClick={t.action}>
                Run
              </Button>
            </div>
          ))}
        </div>

        <Card>
          <div className="card-title" style={{ marginBottom: 10 }}>Output</div>
          <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {log.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-dimmer)' }}>No output yet</div>
            ) : log.map((l, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'Consolas, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{l}</div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
