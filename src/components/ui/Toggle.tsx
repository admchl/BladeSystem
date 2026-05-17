interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="toggle-wrap" style={{ cursor: 'pointer' }}>
      <span className="toggle">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
        />
        <span className="toggle-slider" />
      </span>
      {label && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</span>}
    </label>
  );
}
