import React, { useState, useEffect } from 'react';

export default function AuthScreen({ onLoginSuccess, onMounted }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (onMounted) onMounted(); }, []);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError('O nome de usuário não pode estar vazio.');
      return;
    }
    if (password.length < 4) {
      setError('A senha deve ter no mínimo 4 caracteres.');
      return;
    }

    setLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: cleanUsername, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Erro ao realizar a operação.');
      }

      if (data.success) {
        onLoginSuccess(data.username);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 font-body text-on-background overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-50"
      >
        <source src="/vid/hero-video-scrub.mp4" type="video/mp4" />
      </video>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 z-0 bg-gradient-to-tr from-surface-container-low/90 via-surface-container-high/60 to-surface-container-lowest/90 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md bg-surface-container/80 backdrop-blur-xl border border-outline-variant/40 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-8 transition-all duration-300">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src="/static/logo.png"
            alt="Hemera Logo"
            className="w-28 h-28 object-contain animate-soft-pulse"
          />
          <div>
            <h1 className="font-display text-3xl font-bold text-on-surface tracking-tight">Hemera</h1>
            <p className="text-sm text-on-surface-variant mt-1 font-medium tracking-wide">Inteligência Ambiental Residencial</p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex w-full bg-surface-container-high/60 p-1.5 rounded-2xl border border-outline-variant/30">
          <button
            type="button"
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              isLogin
                ? 'bg-primary text-on-primary shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              !isLogin
                ? 'bg-primary text-on-primary shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
          >
            Cadastrar
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
          {error && (
            <div className="w-full p-4 rounded-2xl bg-error-container/85 border border-error text-error text-sm font-medium animate-pulse">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-xs font-semibold text-on-surface-variant tracking-wider uppercase">
              Nome de Usuário
            </label>
            <input
              id="username"
              type="text"
              required
              disabled={loading}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu usuário"
              className="w-full px-4 py-3.5 bg-surface-container-lowest/80 border border-outline-variant/60 rounded-2xl text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-on-surface-variant tracking-wider uppercase">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              className="w-full px-4 py-3.5 bg-surface-container-lowest/80 border border-outline-variant/60 rounded-2xl text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-on-primary hover:bg-primary-hover active:scale-98 font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
            ) : isLogin ? (
              'Acessar Sistema'
            ) : (
              'Finalizar Cadastro'
            )}
          </button>
        </form>

        {/* Small Footer Info */}
        <p className="text-xs text-on-surface-variant/50 font-medium select-none">
          CASACOR 2026 — Mente e Coração
        </p>
      </div>
    </div>
  );
}
