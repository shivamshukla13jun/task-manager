import type { Ref, SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  ref?: Ref<HTMLSelectElement>;
}

export const Select = ({ label, error, id, options, className = '', ref, ...props }: SelectProps) => (
  <div className={`field ${className}`}>
    {label && (
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
    )}
    <select id={id} ref={ref} className={`input ${error ? 'input-invalid' : ''}`} {...props}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    {error && <span className="field-error">{error}</span>}
  </div>
);
