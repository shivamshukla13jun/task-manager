import type { ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
}

export const Button = ({
  variant = 'primary',
  isLoading,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) => (
  <button
    className={`btn btn-${variant} ${className}`}
    disabled={disabled || isLoading}
    {...props}
  >
    {isLoading ? <Spinner size={14} /> : children}
  </button>
);
