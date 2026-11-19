type Tone = 'neutral' | 'info' | 'ok' | 'warn' | 'danger';

interface BadgeProps {
  label: string;
  tone?: Tone;
}

export const Badge = ({ label, tone = 'neutral' }: BadgeProps) => (
  <span className={`badge badge-${tone}`}>{label}</span>
);
