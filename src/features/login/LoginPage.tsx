import { useState, useCallback } from 'react';
import { Eye, EyeOff, Check, LogIn } from 'lucide-react';
import { useLanguage } from '@context/LanguageContext';
import { useAuth, AuthApiError } from '@context/AuthContext';
import { useToast } from '@hooks/useToast';
import { Toast } from '@components/ui/Toast';

function getErrorKey(err: unknown): string {
  if (err instanceof AuthApiError) {
    if (err.status === 401) return 'login.error_invalid';
    if (err.status === 400) return 'login.error_required';
    if (err.status === 503) return 'login.error_unavailable';
  }
  return 'login.error_generic';
}

export default function LoginPage() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const { toasts, showToast, dismiss } = useToast();

  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading) return;
      if (!loginValue.trim() || !password) {
        showToast(t('login.error_required'), 'error');
        return;
      }
      setLoading(true);
      try {
        await login({ login: loginValue.trim(), password, remember: rememberMe });
      } catch (err) {
        showToast(t(getErrorKey(err)), 'error');
      } finally {
        setLoading(false);
      }
    },
    [login, loginValue, password, rememberMe, showToast, t, loading]
  );

  return (
    <div className="min-h-dvh w-full bg-bg-primary grid-pattern flex flex-col items-center justify-center p-10 sm:p-12 animate-initial-fade">
      <div className="w-full max-w-[380px] glass-strong rounded-2xl border border-border-strong p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gradient tracking-tight">
            {t('login.title')}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <input
            type="text"
            value={loginValue}
            onChange={(e) => setLoginValue(e.target.value)}
            placeholder={t('login.login_placeholder')}
            autoComplete="username"
            aria-label={t('login.login_label')}
            className="h-11 w-full min-w-0 px-4 rounded-lg bg-bg-tertiary border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:border-accent/50 focus:ring-2 focus:ring-accent/20 outline-none transition-colors duration-200"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.password_placeholder')}
              autoComplete="current-password"
              aria-label={t('login.password_label')}
              className="h-11 w-full min-w-0 px-4 pr-12 rounded-lg bg-bg-tertiary border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:border-accent/50 focus:ring-2 focus:ring-accent/20 outline-none transition-colors duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? t('login.hide') : t('login.show')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors duration-200 cursor-pointer"
            >
              <span className="t-icon-swap" data-state={showPassword ? 'b' : 'a'}>
                <span className="t-icon" data-icon="a">
                  <Eye className="w-4 h-4" />
                </span>
                <span className="t-icon" data-icon="b">
                  <EyeOff className="w-4 h-4" />
                </span>
              </span>
            </button>
          </div>

          <label className="inline-flex items-center gap-2.5 mt-1 text-sm text-text-secondary cursor-pointer select-none">
            <span className="relative inline-flex items-center justify-center w-4 h-4 shrink-0">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="peer appearance-none w-4 h-4 min-h-0 min-w-0 !m-0 !p-0 !rounded-none border border-border-subtle bg-bg-tertiary transition-all duration-200 checked:bg-accent focus:!border-border-subtle cursor-pointer outline-none"
                style={{
                  boxShadow: rememberMe ? '0 0 8px rgba(139, 92, 246, 0.35)' : 'none',
                }}
              />
              <Check
                className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none"
                strokeWidth={3}
              />
            </span>
            <span>{t('login.remember_me')}</span>
          </label>

          <button
            type="submit"
            disabled={!loginValue.trim() || !password || loading}
            className="mt-2 w-full h-11 rounded-lg bg-accent/25 text-white text-sm font-medium border border-accent/40 hover:bg-accent/35 transition-[colors,opacity,transform,box-shadow] duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {t('login.submit')}
          </button>
        </form>
      </div>

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
