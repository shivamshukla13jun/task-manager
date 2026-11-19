import { useRef, useState } from 'react';
import SecureApiClient, { SecureResponse } from './lib/SecureApiClient';
import './styles.css';

interface LoginResponse {
  data?: { accessToken?: string; user?: unknown };
  success?: boolean;
  message?: string;
}

export default function App() {
  const [baseUrl, setBaseUrl] = useState('');
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [wire, setWire] = useState('—');
  const [out, setOut] = useState('—');
  const [outOk, setOutOk] = useState(true);
  const [initStatus, setInitStatus] = useState('');

  const apiRef = useRef<SecureApiClient | null>(null);

  const [email, setEmail] = useState('superadmin@gmail.com');
  const [password, setPassword] = useState('12345678');

  const [newName, setNewName] = useState('Demo User');
  const [newEmail, setNewEmail] = useState('demo.user@example.com');
  const [newPassword, setNewPassword] = useState('12345678');
  const [newRole, setNewRole] = useState('admin');
  const avatarRef = useRef<HTMLInputElement>(null);

  const show = (title: string, r: SecureResponse) => {
    setWire(`${title}\n\n` + JSON.stringify(r.wire, null, 2));
    setOut(JSON.stringify(r.body, null, 2));
    setOutOk(true);
  };

  const fail = (title: string, err: unknown) => {
    setOut(`${title}\n${err instanceof Error ? err.message : String(err)}`);
    setOutOk(false);
  };

  const init = async () => {
    try {
      const base = baseUrl.trim() || window.location.origin;
      apiRef.current = await new SecureApiClient(base).init();
      setReady(true);
      setInitStatus(' ✅ public key imported, AES-256 session key wrapped & ready');
    } catch (e) {
      fail('Init failed — is the API running with ENCRYPTION_ENABLED=true?', e);
    }
  };

  const login = async () => {
    try {
      const r = await apiRef.current!.post<LoginResponse>('/api/auth/login', {
        email,
        password,
      });
      if (r.body?.data?.accessToken) setToken(r.body.data.accessToken);
      show('POST /api/auth/login', r);
    } catch (e) {
      fail('Login failed', e);
    }
  };

  const me = async () => {
    try {
      const r = await apiRef.current!.get('/api/auth/current-user', { token: token ?? undefined });
      show('GET /api/auth/current-user', r);
    } catch (e) {
      fail('Request failed', e);
    }
  };

  const createUser = async () => {
    try {
      const file = avatarRef.current?.files?.[0];
      const r = await apiRef.current!.request('/api/users', {
        method: 'POST',
        token: token ?? undefined,
        fields: { name: newName, email: newEmail, password: newPassword, role: newRole },
        files: file ? { avatar: file } : undefined,
      });
      show('POST /api/users (multipart/form-data)', r);
    } catch (e) {
      fail('Create user failed', e);
    }
  };

  return (
    <div className="page">
      <h1>🔐 Secure API Demo — RSA-OAEP + AES-256-GCM (React)</h1>
      <p className="dim">
        Everything below goes over the wire encrypted. Compare "what a middleman
        sees" vs the decrypted payload.
      </p>

      <div className="card">
        <label>API base URL (empty = same origin / vite proxy)</label>
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="http://localhost:3000"
        />
        <button onClick={init}>1. Fetch public key + start session</button>
        <span className={ready ? 'ok' : 'dim'}>{initStatus}</span>
      </div>

      <div className="row">
        <div className="card">
          <h2>Login (encrypted JSON body)</h2>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
          />
          <button onClick={login} disabled={!ready}>2. Login</button>
          {token && <span className="ok"> token acquired</span>}
        </div>

        <div className="card">
          <h2>GET current user (encrypted response, empty body)</h2>
          <button onClick={me} disabled={!ready}>3. GET /api/auth/current-user</button>
        </div>
      </div>

      <div className="card">
        <h2>Create user + avatar upload (multipart — fields encrypted, file binary)</h2>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="name" />
        <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email" />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="password"
        />
        <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
          <option value="admin">admin</option>
          <option value="superadmin">superadmin</option>
        </select>
        <input ref={avatarRef} type="file" accept="image/*" />
        <button onClick={createUser} disabled={!ready}>4. POST /api/users (multipart)</button>
      </div>

      <h2>📡 What a middleman sees on the wire</h2>
      <pre className="dim">{wire}</pre>

      <h2>🔓 Decrypted on this side</h2>
      <pre className={outOk ? 'ok' : 'err'}>{out}</pre>
    </div>
  );
}
