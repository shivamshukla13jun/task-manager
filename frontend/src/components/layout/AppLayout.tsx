import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export const AppLayout = () => (
  <div className="app-shell">
    <Header />
    <main className="app-main">
      <Outlet />
    </main>
  </div>
);
