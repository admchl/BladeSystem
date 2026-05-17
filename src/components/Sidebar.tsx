type Page =
  | 'dashboard' | 'quickfix' | 'optimizer' | 'cleaner'
  | 'triggers' | 'automation' | 'startup' | 'processes'
  | 'setup' | 'backup' | 'network' | 'hardware' | 'repair' | 'settings';

interface NavItem {
  id: Page;
  label: string;
  icon: string;
}

const sections: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '⬛' },
      { id: 'quickfix', label: 'Quick Fix', icon: '⚡' },
    ],
  },
  {
    label: 'Optimize',
    items: [
      { id: 'optimizer', label: 'Optimizer', icon: '🚀' },
      { id: 'cleaner', label: 'Cleaner', icon: '🧹' },
      { id: 'startup', label: 'Startup', icon: '🕐' },
      { id: 'processes', label: 'Processes', icon: '⚙️' },
    ],
  },
  {
    label: 'Automate',
    items: [
      { id: 'triggers', label: 'Triggers', icon: '⚡' },
      { id: 'automation', label: 'Automation', icon: '🔄' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'network', label: 'Network', icon: '🌐' },
      { id: 'hardware', label: 'Hardware', icon: '💻' },
      { id: 'repair', label: 'Repair', icon: '🔧' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { id: 'setup', label: 'PC Setup', icon: '📦' },
      { id: 'backup', label: 'Backup', icon: '💾' },
    ],
  },
  {
    label: '',
    items: [
      { id: 'settings', label: 'Settings', icon: '⚙️' },
    ],
  },
];

interface SidebarProps {
  active: Page;
  onChange: (p: Page) => void;
}

export function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <nav className="sidebar">
      {sections.map((section, si) => (
        <div key={si} className="sidebar-section">
          {section.label && (
            <div className="sidebar-section-label">{section.label}</div>
          )}
          {section.items.map(item => (
            <button
              key={item.id}
              className={`sidebar-item ${active === item.id ? 'active' : ''}`}
              onClick={() => onChange(item.id)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}

export type { Page };
