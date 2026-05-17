export function Setup() {
  return (
    <div className="page">
      <div className="page-title">PC Setup</div>
      <div className="page-subtitle">Migrate apps and settings from another PC</div>
      <div className="empty-state" style={{ marginTop: 40 }}>
        <div className="empty-state-icon">📦</div>
        <div className="empty-state-title">PC Migration</div>
        <div className="empty-state-desc">
          Use Blade Setup (standalone) to export your app list, then place the setup.json here to restore everything automatically.
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-dimmer)', fontFamily: 'Consolas, monospace' }}>
          Full integration coming in next release
        </div>
      </div>
    </div>
  );
}
