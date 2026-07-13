import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Check } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    const savedPassword = localStorage.getItem('savedPassword');
    
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      if (rememberMe) {
        localStorage.setItem('savedEmail', email);
        localStorage.setItem('savedPassword', password);
      } else {
        localStorage.removeItem('savedEmail');
        localStorage.removeItem('savedPassword');
      }
      navigate('/');
    }
  };

  const brandRow = () => (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 text-2xl rounded-xl bg-[var(--accent-ink)] text-[var(--accent)] flex items-center justify-center font-serif italic shrink-0">
        m
      </div>
      <span className="font-serif text-2xl">
        <span className="italic">my</span>Finance
      </span>
    </div>
  );

  const errorBanner = error && (
    <div className="flex items-center gap-2.5 bg-[var(--neg-soft)] text-[var(--neg)] text-sm font-semibold p-3 rounded-xl mb-5">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {error}
    </div>
  );

  const emailField = (
    <div>
      <label className="block text-xs font-semibold text-[var(--text-2)] mb-1.5" htmlFor="email">
        E-mail
      </label>
      <div className="flex items-center gap-2.5 bg-[var(--surface-2)] border border-[var(--border-strong)] rounded-[13px] px-3.5 py-3 text-[var(--text-3)] focus-within:border-[var(--accent)] transition-colors">
        <Mail className="w-[18px] h-[18px] shrink-0" />
        <input
          className="flex-1 min-w-0 border-none bg-transparent outline-none text-[var(--text)] text-[15px] placeholder-[var(--text-3)]"
          id="email"
          type="email"
          placeholder="voce@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
    </div>
  );

  const passwordField = (
    <div>
      <label className="block text-xs font-semibold text-[var(--text-2)] mb-1.5" htmlFor="password">
        Senha
      </label>
      <div className="flex items-center gap-2.5 bg-[var(--surface-2)] border border-[var(--border-strong)] rounded-[13px] px-3.5 py-3 text-[var(--text-3)] focus-within:border-[var(--accent)] transition-colors">
        <Lock className="w-[18px] h-[18px] shrink-0" />
        <input
          className="flex-1 min-w-0 border-none bg-transparent outline-none text-[var(--text)] text-[15px] placeholder-[var(--text-3)]"
          id="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(v => !v)}
          className="text-[var(--text-3)] hover:text-[var(--text)] transition-colors shrink-0"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
        </button>
      </div>
    </div>
  );

  const rememberToggle = (
    <button
      type="button"
      onClick={() => setRememberMe(v => !v)}
      className="flex items-center gap-2.5 text-[var(--text-2)] text-sm select-none"
    >
      <span
        className="w-5 h-5 rounded-[6px] flex items-center justify-center border border-[var(--border-strong)] text-[var(--accent-ink)] shrink-0"
        style={{ background: rememberMe ? 'var(--accent)' : 'transparent' }}
      >
        {rememberMe && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
      </span>
      Lembrar de mim
    </button>
  );

  const submitBtn = (
    <button
      className="w-full bg-[var(--accent)] text-[var(--accent-ink)] font-bold py-3.5 rounded-[14px] transition-transform active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
      type="submit"
      disabled={loading}
    >
      {loading ? 'Entrando...' : 'Entrar'}
    </button>
  );

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Brand panel — mint. Full-bleed: ocupa metade real da tela no desktop, sem card/borda/sombra. */}
      <div
        className="flex flex-col justify-between px-6 pt-12 pb-10 lg:p-14 lg:min-h-screen"
        style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
      >
        {brandRow()}

        {/* Mobile copy */}
        <div className="lg:hidden mt-8">
          <h1 className="font-serif text-[34px] leading-[1.05]">Entrar</h1>
          <p className="text-sm opacity-75 mt-1.5">Controle seu mês na palma da mão.</p>
        </div>

        {/* Desktop copy */}
        <div className="hidden lg:block">
          <h1 className="font-serif text-5xl leading-[1.05] tracking-tight">No azul<br />ou no vermelho?</h1>
          <p className="text-[15px] opacity-80 mt-3.5 max-w-[280px]">Saiba em segundos como está o seu mês.</p>
        </div>

        <div className="hidden lg:block font-serif text-[44px] tabular-nums">
          + R$ 4.270<span className="text-2xl">,20</span>
        </div>
      </div>

      {/* Form panel — escuro. Full-bleed na outra metade, sem card/borda/sombra. */}
      <div
        className="flex flex-col justify-center px-6 py-10 lg:p-14 lg:min-h-screen"
        style={{ background: 'var(--bg)' }}
      >
        <div className="w-full max-w-sm mx-auto">
          <div className="hidden lg:block mb-6">
            <h2 className="font-serif text-3xl" style={{ color: 'var(--text)' }}>Entrar</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Bem-vindo de volta.</p>
          </div>

          {errorBanner}

          <form onSubmit={handleLogin} className="space-y-4">
            {emailField}
            {passwordField}
            {rememberToggle}
            {submitBtn}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
