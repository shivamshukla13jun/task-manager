interface AlertProps {
  message?: string | null;
}

export const Alert = ({ message }: AlertProps) =>
  message ? <div className="alert-error">{message}</div> : null;
