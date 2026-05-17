import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Toggle } from '../components/ui/Toggle';
import { Badge } from '../components/ui/Badge';

interface SetupApp {
  id: string;
  source: string;
  enabled: boolean;
  name?: string;
}

interface SetupSettings {
  privacy: boolean;
  dark_mode: boolean;
  taskbar_cleanup: boolean;
  install_blade_automation: boolean;
}

interface SetupFile {
  version: string;
  exported_at: number;
  apps: SetupApp[];
  settings: SetupSettings;
}

type Phase = 'menu' | 'exporting' | 'review-export' | 'import-path' | 'review-import' | 'installing' | 'done';

export function Setup() {
  const [phase, setPhase] = useState<Phase>('menu');
  const [setupFile, setSetupFile] = useState<SetupFile | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [importPath, setImportPath] = useState('');
  const [settings, setSettings] = useState<SetupSettings>({
    privacy: true, dark_mode: true, taskbar_cleanup: true, install_blade_automation: false,
  });

  function appendLog(line: string) {
    setLog(prev => [...prev, line]);
  }

  // ── Export flow ──

  async function startExport() {
    setPhase('exporting');
    setLog(['Scanning installed apps...']);
    try {
      const file = await invoke<SetupFile>('export_apps');
      setSetupFile(file);
      setPhase('review-export');
    } catch (e) {
      appendLog(`Error: ${e}`);
    }
  }

  async function saveAndDone() {
    if (!setupFile) return;
    const path = await invoke<string>('save_setup_file', { file: setupFile }).catch(e => `Error: ${e}`);
    appendLog(`Saved to: ${path}`);
    setPhase('done');
  }

  // ── Import flow ──

  async function loadFromPath() {
    if (!importPath.trim()) return;
    try {
      const file = await invoke<SetupFile>('load_setup_file', { path: importPath.trim() });
      setSetupFile({ ...file, settings: settings });
      setPhase('review-import');
    } catch (e) {
      appendLog(`Error: ${e}`);
    }
  }

  async function startInstall() {
    if (!setupFile) return;
    setPhase('installing');
    setLog(['Starting installation...']);

    const unlisten = await listen<string>('setup-log', e => appendLog(e.payload));
    await listen<string>('setup-done', () => {
      appendLog('✓ Done!');
      setPhase('done');
      unlisten();
    });

    await invoke('run_setup_install', {
      apps: setupFile.apps,
      settings: { ...settings },
    });
  }

  function toggleApp(id: string, enabled: boolean) {
    if (!setupFile) return;
    setSetupFile({
      ...setupFile,
      apps: setupFile.apps.map(a => a.id === id ? { ...a, enabled } : a),
    });
  }

  function toggleAll(enabled: boolean) {
    if (!setupFile) return;
    setSetupFile({ ...setupFile, apps: setupFile.apps.map(a => ({ ...a, enabled })) });
  }

  const filtered = setupFile?.apps.filter(a =>
    (a.name ?? a.id).toLowerCase().includes(filter.toLowerCase())
  ) ?? [];

  // ── Render ──

  if (phase === 'menu') {
    return (
      <div className="page">
        <div className="page-title">PC Setup</div>
        <div className="page-subtitle">Export your current PC setup or restore it on a new machine</div>

        <div className="grid-2" style={{ gap: 16, maxWidth: 640 }}>
          <Card onClick={startExport}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>📤</div>
            <div className="card-title">Export This PC</div>
            <div className="card-desc" style={{ marginTop: 6 }}>
              Scan all installed apps (winget + registry) and save a setup.json you can use on a new machine.
            </div>
          </Card>

          <Card onClick={() => setPhase('import-path')}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>📥</div>
            <div className="card-title">Restore from setup.json</div>
            <div className="card-desc" style={{ marginTop: 6 }}>
              Load a setup.json from Blade Setup or a previous export and install everything automatically.
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === 'exporting') {
    return (
      <div className="page">
        <div className="page-title">Scanning apps...</div>
        <div style={{ color: 'var(--text-dim)', marginTop: 16, fontSize: 13 }}>
          Running winget export + registry scan. This takes a few seconds.
        </div>
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {log.map((l, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'Consolas, monospace' }}>{l}</div>)}
        </div>
      </div>
    );
  }

  if (phase === 'import-path') {
    return (
      <div className="page">
        <div className="page-title">Load setup.json</div>
        <div className="page-subtitle">Enter the path to your setup.json file</div>

        <div style={{ maxWidth: 500 }} className="col gap-16">
          <div className="form-group">
            <label className="form-label">File path</label>
            <input
              className="input"
              placeholder={`C:\\Users\\User\\Desktop\\setup.json or %APPDATA%\\Blade System\\setup.json`}
              value={importPath}
              onChange={e => setImportPath(e.target.value)}
            />
          </div>
          {log.map((l, i) => <div key={i} style={{ fontSize: 11, color: 'var(--danger)', fontFamily: 'Consolas, monospace' }}>{l}</div>)}
          <div className="row">
            <Button variant="ghost" onClick={() => setPhase('menu')}>Back</Button>
            <Button variant="primary" disabled={!importPath.trim()} onClick={loadFromPath}>Load</Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'review-export' || phase === 'review-import') {
    const isExport = phase === 'review-export';
    const enabledCount = setupFile?.apps.filter(a => a.enabled).length ?? 0;

    return (
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <div className="page-title">{isExport ? 'Review Apps to Export' : 'Review Apps to Install'}</div>
          <div className="ml-auto row gap-8">
            <Button variant="ghost" size="sm" onClick={() => toggleAll(true)}>Select all</Button>
            <Button variant="ghost" size="sm" onClick={() => toggleAll(false)}>Deselect all</Button>
          </div>
        </div>
        <div className="page-subtitle">
          {enabledCount} of {setupFile?.apps.length} apps selected
        </div>

        {!isExport && (
          <Card style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Windows Settings</div>
            <div className="col gap-10">
              {([
                ['privacy', 'Privacy tweaks (disable telemetry, advertising ID)'],
                ['dark_mode', 'Enable dark mode'],
                ['taskbar_cleanup', 'Clean taskbar (hide search, Copilot, Task View)'],
                ['install_blade_automation', 'Download & install Blade Automation'],
              ] as [keyof SetupSettings, string][]).map(([key, label]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12 }}>{label}</span>
                  <Toggle
                    checked={settings[key] as boolean}
                    onChange={v => setSettings(prev => ({ ...prev, [key]: v }))}
                  />
                </div>
              ))}
            </div>
          </Card>
        )}

        <input
          className="input"
          placeholder="Filter apps..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ maxWidth: 300, marginBottom: 12 }}
        />

        <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
          {filtered.map(app => (
            <div key={app.id} className="list-item" style={{ padding: '8px 12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {app.name ?? app.id}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dimmer)' }}>{app.id}</div>
              </div>
              <Badge variant={app.source === 'registry' ? 'warning' : 'accent'}>
                {app.source === 'registry' ? 'manual' : app.source}
              </Badge>
              <Toggle checked={app.enabled} onChange={v => toggleApp(app.id, v)} />
            </div>
          ))}
        </div>

        <div className="row gap-8">
          <Button variant="ghost" onClick={() => setPhase('menu')}>Back</Button>
          {isExport ? (
            <Button variant="primary" onClick={saveAndDone}>
              Save setup.json ({enabledCount} apps)
            </Button>
          ) : (
            <Button variant="primary" onClick={startInstall}>
              Install {enabledCount} apps
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'installing') {
    return (
      <div className="page">
        <div className="page-title">Installing...</div>
        <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3, marginTop: 16 }}>
          {log.map((l, i) => (
            <div key={i} style={{
              fontSize: 11, fontFamily: 'Consolas, monospace',
              color: l.startsWith('✓') ? 'var(--success)' : l.startsWith('Error') || l.startsWith('MANUAL') ? 'var(--warning)' : 'var(--text-dim)'
            }}>{l}</div>
          ))}
        </div>
      </div>
    );
  }

  // done
  return (
    <div className="page">
      <div className="empty-state" style={{ marginTop: 40 }}>
        <div className="empty-state-icon">✅</div>
        <div className="empty-state-title">Done!</div>
        <div style={{ maxHeight: 200, overflowY: 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 3, margin: '12px 0' }}>
          {log.slice(-10).map((l, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'Consolas, monospace' }}>{l}</div>
          ))}
        </div>
        <Button variant="secondary" onClick={() => { setPhase('menu'); setLog([]); setSetupFile(null); }}>
          Back to Setup
        </Button>
      </div>
    </div>
  );
}
