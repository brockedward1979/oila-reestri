import { useState } from 'react';
import { api, auth } from '../api.js';
import { FormError } from './ui.jsx';

export default function Login({ onLogin }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { const r = await api.login(u.trim(), p); auth.set(r.token); onLogin(r.username); } catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <main className="login">
      <form className="login-card" onSubmit={submit}>
        <p className="mfy">Ijtimoiy reestr</p>
        <h1>Oila reestri</h1>
        <p className="muted">Davom etish uchun tizimga kiring.</p>
        <label className="fld"><span className="fld-l">Login</span><input value={u} autoComplete="username" autoFocus onChange={(e) => setU(e.target.value)} required /></label>
        <label className="fld"><span className="fld-l">Parol</span><input type="password" value={p} autoComplete="current-password" onChange={(e) => setP(e.target.value)} required /></label>
        <FormError error={err} />
        <button className="btn" disabled={busy || !u || !p}>{busy ? 'Tekshirilmoqda…' : 'Kirish'}</button>
      </form>
    </main>
  );
}
