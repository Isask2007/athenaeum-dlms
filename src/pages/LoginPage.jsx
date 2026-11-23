import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, LibraryBig, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS } from '../lib/auth.jsx';
import { useToast } from '../lib/toast.jsx';
import { Logo } from '../components/layout/index.jsx';
import { Button, Field, Input, Select } from '../components/ui/index.jsx';

export default function LoginPage() {
  const [params, setParams] = useSearchParams();
  const registerMode = params.get('mode') === 'register';
  const { login, register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'member', department: 'Computer Science' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const finish = (user) => {
    toast(`Welcome back, ${user.name.split(' ')[0]}!`);
    navigate(user.role === 'member' ? '/dashboard' : '/admin', { replace: true });
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true); setError('');
    try {
      const user = registerMode
        ? await register({ name: form.name, email: form.email, password: form.password, role: form.role, department: form.department })
        : await login(form.email, form.password);
      finish(user);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const quickLogin = async (account) => {
    setLoading(true); setError('');
    try { finish(await login(account.email, account.password)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-paper-100 dark:bg-ink-950 lg:grid lg:grid-cols-[1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink-900 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, #24405f 0, transparent 45%), radial-gradient(circle at 80% 15%, #4a3a2a 0, transparent 40%)' }} />
        <div className="pointer-events-none absolute -left-20 top-1/4 h-72 w-72 rounded-full border border-white/10" />
        <div className="relative"><Logo light /></div>
        <div className="relative max-w-md">
          <LibraryBig size={44} className="mb-6 text-gold-400" />
          <h1 className="font-display text-4xl font-bold leading-tight">Your next great idea starts on a shelf.</h1>
          <p className="mt-5 text-ink-200">Sign in to borrow books, manage reservations, read digital resources and keep everything organised in one calm workspace.</p>
          <div className="mt-8 space-y-3 text-sm text-ink-200">
            <p className="flex items-center gap-3"><ShieldCheck size={17} className="text-gold-400" /> Secure role-based access for every member</p>
            <p className="flex items-center gap-3"><LibraryBig size={17} className="text-gold-400" /> 18+ resources across 14 subject areas</p>
          </div>
        </div>
        <p className="relative text-xs text-ink-400">© {new Date().getFullYear()} Athenaeum Digital Library</p>
      </div>

      <div className="flex min-h-screen flex-col px-4 py-8 sm:px-10 lg:min-h-auto lg:justify-center">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden"><Logo /><Link to="/" className="flex items-center gap-1 text-xs font-semibold text-ink-500"><ArrowLeft size={14} /> Home</Link></div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-600">{registerMode ? 'Join the library' : 'Welcome back'}</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-ink-900 dark:text-white">{registerMode ? 'Get your library card' : 'Sign in to your account'}</h2>
          <p className="mt-2 text-sm text-ink-500">{registerMode ? 'Create an account to start borrowing and reading.' : 'Use your library credentials or a demo account below.'}</p>

          {error && <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-500/10 dark:text-rose-300">{error}</div>}

          <form onSubmit={submit} className="mt-7 space-y-4">
            {registerMode && <Field label="Full name"><div className="relative"><UserRound size={16} className="absolute left-3 top-3 text-ink-400" /><Input className="pl-9" value={form.name} onChange={set('name')} placeholder="Your full name" required /></div></Field>}
            {registerMode && <Field label="Account type">
              <Select value={form.role} onChange={set('role')}>
                <option value="member">Member — borrow, reserve and read</option>
                <option value="librarian">Librarian — manage catalog and circulation</option>
                <option value="admin">Administrator — full system access</option>
              </Select>
              <p className="mt-1.5 text-[11px] text-ink-500">Choose the workspace you'll see after signing in.</p>
            </Field>}
            <Field label="Email address"><div className="relative"><Mail size={16} className="absolute left-3 top-3 text-ink-400" /><Input className="pl-9" type="email" value={form.email} onChange={set('email')} placeholder="you@university.edu" required /></div></Field>
            <Field label="Password"><div className="relative"><LockKeyhole size={16} className="absolute left-3 top-3 text-ink-400" /><Input className="px-9" type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="At least 8 characters" required />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-3 text-ink-400">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></Field>
            {registerMode && <Field label="Department"><Select value={form.department} onChange={set('department')}>
              {['Computer Science', 'Physics', 'Economics', 'Design', 'Biology', 'Statistics', 'Engineering', 'Philosophy', 'General Studies'].map((d) => <option key={d}>{d}</option>)}
            </Select></Field>}
            <Button type="submit" size="lg" className="w-full" loading={loading}>{registerMode ? 'Create account' : 'Sign in'}</Button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-500">
            {registerMode ? 'Already have a card?' : 'New to the library?'}{' '}
            <button onClick={() => { setParams(registerMode ? {} : { mode: 'register' }); setError(''); }} className="font-bold text-ink-900 underline underline-offset-4 dark:text-gold-400">
              {registerMode ? 'Sign in' : 'Register here'}
            </button>
          </p>

          {!registerMode && <div className="mt-9">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink-400"><span className="h-px flex-1 bg-paper-300 dark:bg-ink-800" />Demo accounts<span className="h-px flex-1 bg-paper-300 dark:bg-ink-800" /></div>
            <div className="mt-4 grid gap-2">
              {DEMO_ACCOUNTS.map((account) => <button key={account.role} onClick={() => quickLogin(account)} disabled={loading}
                className="flex items-center gap-3 rounded-xl border border-paper-300 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-ink-400 hover:shadow-soft disabled:opacity-50 dark:border-ink-800 dark:bg-ink-900">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900/5 text-ink-700 dark:bg-gold-500/10 dark:text-gold-400"><ShieldCheck size={17} /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-ink-900 dark:text-white">{account.label}</span><span className="block truncate text-[11px] text-ink-500">{account.email}</span></span>
                <span className="text-xs font-semibold text-gold-600">Use →</span>
              </button>)}
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
}
