import React from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Home,
  Flame,
  CalendarDays,
  Trophy,
  Newspaper,
  Image as ImageIcon,
  Store,
  Zap,
  Sparkles,
  PartyPopper,
  ShieldCheck,
  LogOut,
  Lock
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { isSidebarOpen, closeSidebar, currentRoute, navigateTo, isAdminLoggedIn, logout } = useApp();

  if (!isSidebarOpen) return null;

  const menuItems = [
    { key: 'home', label: '首頁', icon: Home },
    { key: 'activities', label: '賽事活動簡介', icon: Flame },
    { key: 'schedule', label: '賽程表', icon: CalendarDays },
    { key: 'honor', label: '榮譽榜', icon: Trophy },
    { key: 'livenews', label: '現場快報', icon: Zap },
    { key: 'weekactivities', label: '校慶週活動', icon: PartyPopper },
    { key: 'interviews', label: '採訪', icon: Newspaper },
    { key: 'albums', label: '相簿', icon: ImageIcon },
    { key: 'booths', label: '各班攤位一覽', icon: Store }
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* 遮罩 Backdrop (Midnight Navy #09013d overlay) */}
      <div
        onClick={closeSidebar}
        className="fixed inset-0 bg-[#09013d]/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      />

      {/* 側邊抽屜 Drawer Container */}
      <div className="relative w-4/5 max-w-xs sm:max-w-sm bg-[#fbf9f2] h-full shadow-2xl flex flex-col z-10 border-r border-[#e5decb] animate-in slide-in-from-left duration-250">
        {/* 抽屜頂部 Header */}
        <div className="p-5 border-b border-[#e5decb] flex items-center justify-between bg-[#fbf3c9]/60">
          <div className="flex items-center gap-3">
            <div
              title="雄女校徽"
              className="w-9 h-9 rounded-full bg-[#09013d] border border-[#263e6e] overflow-hidden flex items-center justify-center shadow-2xs shrink-0"
            >
              <img
                src="/assets/aistudio/image_5f8e9469.png"
                alt="KGHS"
                className="w-[84%] h-[84%] object-contain select-none mix-blend-screen filter contrast-125"
              />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#09013d] leading-tight">102nd 雄女校慶</h2>
            </div>
          </div>
          <button
            onClick={closeSidebar}
            aria-label="關閉選單"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#5e544c] hover:text-[#09013d] hover:bg-[#cff0eb]/40 active:scale-95 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 導覽連結清單 Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentRoute === item.key;
            return (
              <button
                key={item.key}
                onClick={() => navigateTo(item.key)}
                className={`w-full min-h-[44px] flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-left transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-[#325291] text-white font-semibold shadow-xs'
                    : 'text-[#342d27] hover:bg-[#cff0eb]/25 hover:text-[#09013d]'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive ? 'bg-[#09013d] text-[#fbf3c9]' : 'bg-[#fbf3c9] text-[#325291] group-hover:bg-[#cff0eb] group-hover:text-[#09013d]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-medium tracking-tight truncate">{item.label}</div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* 登入狀態管理員快捷與登出按鈕 */}
        {isAdminLoggedIn ? (
          <div className="p-3 border-t border-[#e5decb] bg-[#fbf3c9]/40 space-y-2">
            <button
              onClick={() => {
                navigateTo('admini2t2');
                closeSidebar();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-[#09013d] bg-[#fbf3c9] hover:bg-[#faeeb4] border border-[#edd995] rounded-xl transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#325291]" />
              <span>進入管理後台</span>
            </button>
            <button
              onClick={() => {
                logout();
                closeSidebar();
                navigateTo('admini2t2');
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-[#843229] hover:bg-[#fbeeed] border border-[#ebd0ce] rounded-xl transition-colors cursor-pointer bg-white"
            >
              <LogOut className="w-4 h-4" />
              <span>登出管理員身份</span>
            </button>
          </div>
        ) : (
          <div className="p-3 border-t border-[#e5decb] bg-white/70">
            <button
              onClick={() => {
                navigateTo('admini2t2');
                closeSidebar();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-[#5e544c] hover:text-[#09013d] hover:bg-[#fbf9f2] border border-[#e5decb] rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <Lock className="w-3.5 h-3.5 text-[#325291]" />
              <span>管理員專區登入</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
