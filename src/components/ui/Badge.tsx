interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'accent' | 'neutral' | string;
  children: React.ReactNode;
}

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}
