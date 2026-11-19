import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate } from 'react-router-dom';
import { registerSchema } from '../schemas/auth.schema';
import type { RegisterInput } from '../schemas/auth.schema';
import { useRegister } from '../hooks/auth';
import { useAppSelector } from '../store';
import { errorMessage } from '../api/client';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';

export const RegisterPage = () => {
  const token = useAppSelector((s) => s.auth.accessToken);
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  if (token) return <Navigate to="/" replace />;

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Start organizing your tasks</p>
        <Alert message={registerMutation.isError ? errorMessage(registerMutation.error) : null} />
        <form onSubmit={handleSubmit((v) => registerMutation.mutate(v))} noValidate>
          <Input
            id="name"
            label="Name"
            placeholder="Your name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="Min. 8 characters"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            id="confirmPassword"
            label="Confirm password"
            type="password"
            placeholder="Repeat password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <Button type="submit" className="btn-block" isLoading={registerMutation.isPending}>
            Create account
          </Button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </Card>
    </div>
  );
};
