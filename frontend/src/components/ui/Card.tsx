import type { HTMLAttributes } from 'react';

export const Card = ({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`card ${className}`} {...props}>
    {children}
  </div>
);
