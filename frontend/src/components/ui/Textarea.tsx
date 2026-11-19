import type { Ref, TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

export const Textarea = ({ label, error, id, className = '', ref, ...props }: TextareaProps) => (
  <div className={`field ${className}`}>
    {label && (
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
    )}
    <textarea id={id} ref={ref} className={`input ${error ? 'input-invalid' : ''}`} rows={3} {...props} />
    {error && <span className="field-error">{error}</span>}
  </div>
);
