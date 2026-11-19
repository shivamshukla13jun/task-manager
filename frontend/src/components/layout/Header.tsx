import { useAppSelector } from '../../store';
import { useLogout } from '../../hooks/auth';
import { Button } from '../ui/Button';

export const Header = () => {
  const user = useAppSelector((s) => s.auth.user);
  const logout = useLogout();

  return (
    <header className="app-header">
      <span className="app-title">Task Manager</span>
      <div className="app-header-right">
        {user && <span className="app-user">{user.name}</span>}
        <Button variant="ghost" onClick={() => logout.mutate()} isLoading={logout.isPending}>
          Logout
        </Button>
      </div>
    </header>
  );
};
