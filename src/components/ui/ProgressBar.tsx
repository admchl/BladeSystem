interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

export function ProgressBar({ value, max = 100, color = 'blue' }: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  const colorMap = { blue: 'blue', green: 'green', yellow: 'yellow', red: 'red' } as const;
  const autoColor = value > 85 ? 'red' : value > 65 ? 'yellow' : colorMap[color];
  return (
    <div className="progress-bar">
      <div
        className={`progress-fill progress-fill-${autoColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
