import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Badge } from '../components/ui/Badge';

interface HealthScore {
  score: number;
  cpu_idle: number;
  ram_free_pct: number;
  disk_free_pct: number;
}

interface LiveStats {
  cpu_pct: number;
  ram_pct: number;
  ram_used_gb: number;
  ram_total_gb: number;
  disk_pct: number;
  disk_used_gb: number;
  disk_total_gb: number;
  cpu_temp: number | null;
}

function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const color = score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--danger)';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs work';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div className="score-ring" style={{ width: 140, height: 140 }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={r} fill="none" stroke="var(--bg-3)" strokeWidth="10" />
          <circle
            cx="70" cy="70" r={r}
            fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circ}
            strokeDashoffset={circ - (score / 100) * circ}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 10, color: 'var(--text-dimmer)', marginTop: 2 }}>/ 100</div>
        </div>
      </div>
      <Badge variant={score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger'}>
        {label}
      </Badge>
    </div>
  );
}

export function Dashboard() {
  const [health, setHealth] = useState<HealthScore | null>(null);
  const [stats, setStats] = useState<LiveStats | null>(null);

  useEffect(() => {
    invoke<HealthScore>('get_health_score').then(setHealth);
    invoke<LiveStats>('get_live_stats').then(setStats);

    const unlisten = listen<LiveStats>('stats-update', e => setStats(e.payload));
    const timer = setInterval(() => invoke<HealthScore>('get_health_score').then(setHealth), 30000);

    return () => {
      unlisten.then(f => f());
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="page">
      <div className="page-title">Dashboard</div>
      <div className="page-subtitle">System health at a glance</div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Score */}
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <ScoreRing score={health?.score ?? 0} />
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ScorePill label="CPU" value={health?.cpu_idle ?? 0} suffix="% idle" />
              <ScorePill label="RAM" value={health?.ram_free_pct ?? 0} suffix="% free" />
              <ScorePill label="Disk" value={health?.disk_free_pct ?? 0} suffix="% free" />
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="grid-2">
            <StatTile
              label="CPU Usage"
              value={`${stats?.cpu_pct.toFixed(1) ?? '—'}%`}
              pct={stats?.cpu_pct ?? 0}
            />
            <StatTile
              label="RAM Usage"
              value={stats ? `${stats.ram_used_gb.toFixed(1)} / ${stats.ram_total_gb.toFixed(0)} GB` : '—'}
              pct={stats?.ram_pct ?? 0}
            />
            <StatTile
              label="Disk Usage"
              value={stats ? `${stats.disk_used_gb.toFixed(0)} / ${stats.disk_total_gb.toFixed(0)} GB` : '—'}
              pct={stats?.disk_pct ?? 0}
            />
            <StatTile
              label="CPU Temp"
              value={stats?.cpu_temp != null ? `${stats.cpu_temp.toFixed(0)}°C` : 'N/A'}
              pct={stats?.cpu_temp != null ? (stats.cpu_temp / 100) * 100 : 0}
            />
          </div>

          <Card>
            <div className="card-title" style={{ marginBottom: 12 }}>Quick Actions</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <QuickAction icon="🚀" label="Optimize" />
              <QuickAction icon="🧹" label="Clean" />
              <QuickAction icon="🔧" label="Repair" />
              <QuickAction icon="⚡" label="Triggers" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ScorePill({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
      <span style={{ color: 'var(--text-dimmer)' }}>{label}</span>
      <span style={{ color: 'var(--text)' }}>{value}{suffix}</span>
    </div>
  );
}

function StatTile({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-label">{label}</div>
      <div className="stat-tile-value">{value}</div>
      <ProgressBar value={pct} />
    </div>
  );
}

function QuickAction({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      className="btn btn-secondary"
      style={{ gap: 6, flex: '1 1 auto' }}
    >
      {icon} {label}
    </button>
  );
}
