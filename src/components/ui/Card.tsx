interface CardProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Card({ className = '', style, children, onClick }: CardProps) {
  return (
    <div
      className={['card', onClick ? 'card-hover' : '', className].filter(Boolean).join(' ')}
      onClick={onClick}
      style={{ ...(onClick ? { cursor: 'pointer' } : {}), ...style }}
    >
      {children}
    </div>
  );
}
