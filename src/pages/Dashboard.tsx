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
  startup_penalty: number;
  privacy_bonus: number;
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

interface Trigger {
  id: string;
  enabled: boolean;
  fire_count: number;
}

function scoreColor(s: number) {
  if (s >= 80) return 'var(--success)';
  if (s >= 60) return 'var(--warning)';
  return 'var(--danger)';
}

function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const color = scoreColor(score);
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs work';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
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
  const [triggers, setTriggers] = useState<Trigger[]>([]);

  useEffect(() => {
    invoke<HealthScore>('get_health_score').then(setHealth);
    invoke<LiveStats>('get_live_stats').then(setStats);
    invoke<Trigger[]>('get_triggers').then(setTriggers);

    const unlisten = listen<LiveStats>('stats-update', e => setStats(e.payload));
    const timer = setInterval(() => {
      invoke<HealthScore>('get_health_score').then(setHealth);
    }, 30000);

    return () => {
      unlisten.then(f => f());
      clearInterval(timer);
    };
  }, []);

  const activeTriggers = triggers.filter(t => t.enabled).length;
  const totalFires = triggers.reduce((sum, t) => sum + t.fire_count, 0);

  return (
    <div className="page">
      <div className="page-title">Dashboard</div>
      <div className="page-subtitle">System health overview</div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Score card */}
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <ScoreRing score={health?.score ?? 0} />
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <ScorePill label="CPU idle" value={health?.cpu_idle ?? 0} suffix="%" />
              <ScorePill label="RAM free" value={health?.ram_free_pct ?? 0} suffix="%" />
              <ScorePill label="Disk free" value={health?.disk_free_pct ?? 0} suffix="%" />
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2 }}>
                <ScorePill
                  label="Privacy"
                  value={health?.privacy_bonus ?? 0}
                  suffix="/10"
                  color={(health?.privacy_bonus ?? 0) >= 8 ? 'var(--success)' : 'var(--warning)'}
                />
                {(health?.startup_penalty ?? 0) > 0 && (
                  <ScorePill
                    label="Startup –"
                    value={health?.startup_penalty ?? 0}
                    suffix=" pts"
                    color="var(--danger)"
                  />
                )}
              </div>
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Live stats */}
          <div className="grid-2">
            <StatTile label="CPU" value={`${stats?.cpu_pct.toFixed(1) ?? '—'}%`} pct={stats?.cpu_pct ?? 0} />
            <StatTile
              label="RAM"
              value={stats ? `${stats.ram_used_gb.toFixed(1)} / ${stats.ram_total_gb.toFixed(0)} GB` : '—'}
              pct={stats?.ram_pct ?? 0}
            />
            <StatTile
              label="Disk C:"
              value={stats ? `${stats.disk_used_gb.toFixed(0)} / ${stats.disk_total_gb.toFixed(0)} GB` : '—'}
              pct={stats?.disk_pct ?? 0}
            />
            <StatTile
              label="CPU Temp"
              value={stats?.cpu_temp != null ? `${stats.cpu_temp.toFixed(0)} °C` : 'N/A'}
              pct={stats?.cpu_temp != null ? (stats.cpu_temp / 110) * 100 : 0}
            />
          </div>

          {/* Trigger stats + quick links */}
          <div className="grid-2">
            <Card>
              <div className="card-title" style={{ marginBottom: 10 }}>Triggers</div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{activeTriggers}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dimmer)' }}>Active</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{totalFires}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dimmer)' }}>Total fired</div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="card-title" style={{ marginBottom: 10 }}>Quick actions</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: '1 1 auto' }}>⚡ Optimize</button>
                <button className="btn btn-secondary btn-sm" style={{ flex: '1 1 auto' }}>🧹 Clean</button>
                <button className="btn btn-secondary btn-sm" style={{ flex: '1 1 auto' }}>🔧 Repair</button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScorePill({ label, value, suffix, color }: { label: string; value: number; suffix: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
      <span style={{ color: 'var(--text-dimmer)' }}>{label}</span>
      <span style={{ color: color ?? 'var(--text)', fontWeight: 500 }}>{value}{suffix}</span>
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
