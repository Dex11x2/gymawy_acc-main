import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import Logo from './Logo';
import { translations } from '../i18n/translations';
import { useSettingsStore } from '../store/settingsStore';

const LoginForm: React.FC = () => {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const { login, isLoading } = useAuthStore();

  const { language: lang, theme, toggleTheme } = useSettingsStore();
  const t = translations[lang];

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Clear old auth data
    localStorage.removeItem('gemawi-auth');

    try {
      await login(emailOrPhone, password);
    } catch (err: any) {
      setError(err.message || (lang === 'ar' ? 'حدث خطأ أثناء تسجيل الدخول' : 'Login failed'));
    }
  };

  return (
    <div className="auth-layout" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="auth-container">
        {/* Form Side */}
        <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
          <div className="w-full max-w-md pt-10 mx-auto px-4">
            <a href="/" className="inline-flex items-center text-theme-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              ← {lang === 'ar' ? 'الرئيسية' : 'Back'}
            </a>
          </div>

          <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-4 py-8">
            <div
              className={`transform transition-all duration-700 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="relative animate-fadeInScale">
                  <Logo variant="mark" height={56} />
                </div>
              </div>

              <div className="mb-6 sm:mb-8 text-center">
                <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                  {t.login}
                </h1>
                <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                  {lang === 'ar' ? 'منصة الإدارة والمحاسبة لشركة جمّاوي' : 'Gymmawy management and accounting platform'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email/Phone Input */}
                <div
                  className={`transform transition-all duration-500 delay-200 ${
                    mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
                  }`}
                >
                  <label className="auth-label">
                    {t.emailOrPhone} <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    className="input"
                    placeholder={lang === 'ar' ? 'ادخل البريد الإلكتروني أو الهاتف' : 'Enter email or phone'}
                    required
                  />
                </div>

                {/* Password Input */}
                <div
                  className={`transform transition-all duration-500 delay-300 ${
                    mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
                  }`}
                >
                  <label className="auth-label">
                    {t.password} <span className="text-error-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input"
                      placeholder={lang === 'ar' ? 'ادخل كلمة المرور' : 'Enter password'}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white top-1/2"
                      style={{ [lang === 'ar' ? 'left' : 'right']: '16px' }}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="alert alert-error animate-shake">
                    <div className="flex items-start gap-3">
                      <div className="-mt-0.5 text-error-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <p className="text-theme-sm text-error-600 dark:text-error-400">{error}</p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div
                  className={`transform transition-all duration-500 delay-400 ${
                    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                >
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="auth-submit-btn disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-3">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>{lang === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing in...'}</span>
                      </span>
                    ) : (
                      t.login
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar - Brand Side */}
        <div className="auth-sidebar">
          <div className="relative flex items-center justify-center z-1">
            <div className="flex flex-col items-center max-w-xs text-center">
              <div className="mb-6">
                <Logo variant="wordmark" height={48} />
              </div>
              <p className="text-gray-400 dark:text-white/60">
                {lang === 'ar'
                  ? 'نظام محاسبة وإدارة متكامل لشركة جمّاوي'
                  : 'Complete accounting and management system for Gymmawy'}
              </p>
            </div>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="fixed z-50 bottom-6 right-6">
          <button
            onClick={toggleTheme}
            className="notification-btn"
            title={theme === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'}
          >
            {theme === 'light' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
