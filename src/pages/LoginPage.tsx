import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, KeyRound, ShieldAlert, CheckCircle2, ArrowLeft, Eye, EyeOff, LogOut, Sparkles } from 'lucide-react';
import { PageHero } from '../components/PageHero';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, logout, navigateTo, isAdminLoggedIn, firebaseUser } = useApp();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const success = await login(password);
      if (!success) {
        setErrorMessage('管理員密碼不正確，請確認輸入正確密碼。');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await loginWithGoogle();
      if (!result.success) {
        setErrorMessage(result.message);
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 標題與視覺 */}
      <PageHero
        title="管理者登入"
        subtitle="102nd 雄女校慶 管理者後台身份驗證 (Firebase 雲端即時同步)"
      />

      <div className="w-full bg-white rounded-3xl border border-[#e5decb] shadow-xs p-6 sm:p-12">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#cff0eb] text-[#325291] border border-[#bce4de] mx-auto flex items-center justify-center shadow-2xs">
              <Lock className="w-5 h-5 text-[#325291]" />
            </div>
            <h2 className="text-lg font-bold text-[#09013d]">
              管理員專區登入
            </h2>
            <p className="text-xs text-[#73685e] leading-relaxed">
              登入後即可編輯賽事、賽程表、榮譽榜、採訪與園遊會各班攤位，所有變更將透過 Firebase 即時同步至所有連線裝置。
            </p>
          </div>

          {isAdminLoggedIn ? (
            <div className="p-6 bg-[#fbf3c9]/60 border border-[#edd995] rounded-2xl text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-[#09013d] text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#325291]" />
                <span>您目前處於管理員已驗證狀態</span>
              </div>
              {firebaseUser && (
                <div className="p-3 bg-white/80 rounded-xl border border-[#edd995] text-xs text-[#09013d] space-y-1">
                  <div className="font-semibold">{firebaseUser.displayName || 'Google 授權管理員'}</div>
                  <div className="font-mono text-[#5e544c] text-[11px]">{firebaseUser.email}</div>
                </div>
              )}
              <p className="text-xs text-[#73685e] leading-relaxed">
                瀏覽器已成功通過 Firebase 雲端安全驗證。您可以直接進入控制面板，後續所有編輯皆會立即廣播至全校師生設備。
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  onClick={() => navigateTo('admini2t2')}
                  className="flex-1 py-2.5 px-4 bg-[#09013d] hover:bg-[#1a1254] text-[#fbf3c9] font-bold text-xs sm:text-sm rounded-full shadow-xs transition-colors cursor-pointer border border-[#325291]/40"
                >
                  進入後台控制面板
                </button>
                <button
                  onClick={() => {
                    logout();
                    navigateTo('admini2t2');
                  }}
                  className="py-2.5 px-4 bg-white hover:bg-[#fbeeed] text-[#843229] font-bold text-xs sm:text-sm rounded-full border border-[#ebd0ce] transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <LogOut className="w-4 h-4" />
                  <span>登出帳號</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Google 快速登入 (首選) */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isGoogleSubmitting}
                  className="w-full py-3 px-4 bg-white hover:bg-[#fbf9f2] border-2 border-[#325291] text-[#09013d] font-bold text-xs sm:text-sm rounded-full transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs active:scale-98 disabled:opacity-70"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{isGoogleSubmitting ? 'Google 驗證中...' : '使用學校 Google 帳號登入 (推薦)'}</span>
                </button>
                <p className="text-[11px] text-[#73685e] text-center">
                  支援雄女學校帳號 (@ms2.kghs.kh.edu.tw / @kghs.kh.edu.tw) 一鍵直接驗證
                </p>
              </div>

              {/* 分隔線 */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-[#e5decb] w-full" />
                <span className="bg-white px-3 text-[11px] text-[#73685e] absolute font-medium">
                  或輸入管理員密碼
                </span>
              </div>

              {/* 密碼登入表單 */}
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#09013d]">
                      管理員密碼 (Admin Password)
                    </label>
                    <span className="text-[10px] text-[#325291] bg-[#cff0eb]/50 px-2 py-0.5 rounded-full font-medium">
                      密碼驗證
                    </span>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#325291] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="請輸入管理員密碼"
                      className="w-full pl-10 pr-10 py-2.5 bg-[#fbf9f2] border border-[#e5decb] rounded-full text-sm text-[#09013d] placeholder-[#9c9387] focus:outline-none focus:border-[#325291] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#73685e] hover:text-[#09013d] transition-colors cursor-pointer"
                      title={showPassword ? '隱藏密碼' : '顯示密碼'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-[#fbeeed] border border-[#ebd0ce] rounded-xl text-[#843229] text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#843229] shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-[#09013d] hover:bg-[#1a1254] disabled:opacity-70 text-[#fbf3c9] font-bold text-sm rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 border border-[#325291]/40"
                >
                  <Lock className="w-4 h-4 text-[#cff0eb]" />
                  <span>{isSubmitting ? '驗證中...' : '密碼登入後台'}</span>
                </button>
              </form>
            </div>
          )}

          <div className="pt-2 border-t border-[#e5decb]/60 flex items-center justify-between text-xs text-[#73685e]">
            <button
              onClick={() => navigateTo('home')}
              className="hover:text-[#09013d] inline-flex items-center gap-1 cursor-pointer font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回前台首頁</span>
            </button>
            <span className="text-[11px] font-mono text-[#325291] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Firebase 即時同步中</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
