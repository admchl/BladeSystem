import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface HealthScore { score: number }
interface LiveStats { cpu_pct: number; ram_pct: number; disk_pct: number }

function scoreColor(s: number) {
  if (s >= 80) return 'var(--success)';
  if (s >= 60) return 'var(--warning)';
  return 'var(--danger)';
}

export function Header() {
  const [health, setHealth] = useState<HealthScore | null>(null);
  const [stats, setStats] = useState<LiveStats | null>(null);
  const win = getCurrentWindow();

  useEffect(() => {
    invoke<HealthScore>('get_health_score').then(setHealth);
    invoke<LiveStats>('get_live_stats').then(setStats);

    const unlisten = listen<LiveStats>('stats-update', e => {
      setStats(e.payload);
    });

    const interval = setInterval(() => {
      invoke<HealthScore>('get_health_score').then(setHealth);
    }, 30000);

    return () => {
      unlisten.then(f => f());
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="header">
      <div className="header-logo">
        <div className="header-logo-mark">B</div>
        <span className="header-logo-name">Blade System</span>
      </div>

      <div className="header-spacer" />

      {stats && (
        <div className="header-stats">
          <div className="header-stat">
            <span style={{ color: 'var(--text-dimmer)' }}>CPU</span>
            <span style={{ color: stats.cpu_pct > 80 ? 'var(--danger)' : 'var(--text)' }}>
              {stats.cpu_pct.toFixed(0)}%
            </span>
          </div>
          <div className="header-stat">
            <span style={{ color: 'var(--text-dimmer)' }}>RAM</span>
            <span style={{ color: stats.ram_pct > 85 ? 'var(--danger)' : 'var(--text)' }}>
              {stats.ram_pct.toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      {health && (
        <div className="header-health">
          <div
            className="header-health-dot"
            style={{ background: scoreColor(health.score) }}
          />
          <span style={{ color: scoreColor(health.score), fontWeight: 600 }}>{health.score}</span>
          <span style={{ color: 'var(--text-dimmer)' }}>/100</span>
        </div>
      )}

      <div className="header-controls">
        <button className="win-btn" onClick={() => win.minimize()} title="Minimize">─</button>
        <button className="win-btn" onClick={() => win.toggleMaximize()} title="Maximize">□</button>
        <button className="win-btn close" onClick={() => win.close()} title="Close">✕</button>
      </div>
    </div>
  );
}
