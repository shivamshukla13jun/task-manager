import type { InputHTMLAttributes, Ref } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  ref?: Ref<HTMLInputElement>;
}

export const Input = ({ label, error, id, className = '', ref, ...props }: InputProps) => (
  <div className={`field ${className}`}>
    {label && (
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
    )}
    <input id={id} ref={ref} className={`input ${error ? 'input-invalid' : ''}`} {...props} />
    {error && <span className="field-error">{error}</span>}
  </div>
);
