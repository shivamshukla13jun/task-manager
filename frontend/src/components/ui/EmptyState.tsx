import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  message?: string;
  action?: ReactNode;
}

export const EmptyState = ({ title, message, action }: EmptyStateProps) => (
  <div className="empty-state">
    <h3>{title}</h3>
    {message && <p>{message}</p>}
    {action}
  </div>
);
