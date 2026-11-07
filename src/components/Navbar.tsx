import React, { useState } from 'react';
import { 
  KeyRound, 
  ShieldCheck, 
  Moon, 
  Sun, 
  User, 
  Bell, 
  Terminal, 
  Search, 
  LogOut, 
  Sparkles, 
  Mail, 
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Code2,
  FileCheck2,
  Webhook,
  Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLicense } from '../context/LicenseContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
  onSelectTab?: (tab: string) => void;
  onOpenCreateModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onSelectTab, onOpenCreateModal }) => {
  const handleSelectTab = (tab: string) => {
    if (onSelectTab) onSelectTab(tab);
    else if (setActiveTab) setActiveTab(tab);
  };
  const { currentUser, currentRole, signOut, isManager } = useAuth();
  const { theme, toggleTheme, notifications, stats } = useLicense();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const unreadNotifs = notifications.filter(n => !n.read).slice(0, 5);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: ShieldCheck, show: true },
    { id: 'licenses', label: isManager ? 'Licenses Manager' : 'My Licenses', icon: KeyRound, show: true },
    { id: 'admin_products', label: 'Products & Matrix', icon: Package, show: false, badge: 'Admin' },
    { id: 'webhooks', label: 'Webhooks & Billing', icon: Webhook, show: false, badge: 'Out of RC1 scope' },
    { id: 'offline_certs', label: 'Offline .lic Certs', icon: FileCheck2, show: false, badge: 'Out of RC1 scope' },
    { id: 'code_generator', label: 'Code Snippets & SDKs', icon: Code2, show: false, badge: 'Not in RC1' },
    { id: 'simulator', label: 'Client API Simulator', icon: Terminal, show: isManager, badge: 'Server API' },
    { id: 'audit_logs', label: 'Audit Logs', icon: Sliders, show: isManager },
    { id: 'email_automations', label: 'Automated Emails', icon: Mail, show: isManager },
    { id: 'retrieval_portal', label: 'Retrieve Key', icon: Search, show: false },
    { id: 'profile', label: 'My Subscriptions', icon: User, show: false },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleSelectTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
                  LicensePulse
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Cloud License & Activation Engine
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.filter(item => item.show).map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => handleSelectTab(item.id)}
                  className={`relative flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Quick Action: New License (for Admin/Manager) */}
            {isManager && (
              <button
                id="navbar-create-license-btn"
                onClick={onOpenCreateModal}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-sm shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Issue License</span>
              </button>
            )}

            {/* Dark Mode Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle Dark Mode"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                id="navbar-notifs-btn"
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-indigo-500" />
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">Email Dispatch History</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                      {notifications.length} alerts
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto py-2 space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/60">
                    {notifications.slice(0, 5).map(notif => (
                      <div key={notif.id} className="pt-2.5 first:pt-0">
                        <div className="flex items-start justify-between">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                            {notif.subject}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                            {new Date(notif.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {notif.body}
                        </p>
                        <div className="flex items-center space-x-2 mt-1.5 text-[10px] text-indigo-600 dark:text-indigo-400">
                          <span className="font-mono">{notif.recipientEmail}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                    <button
                      onClick={() => {
                        setShowNotifDropdown(false);
                        handleSelectTab('email_automations');
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      Manage automated email triggers & rules →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Signed-in administrator */}
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-1.5 pl-2.5 text-left dark:border-slate-800 dark:bg-slate-800/50">
                <div className="hidden sm:block">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white max-w-[110px] truncate">
                      {currentUser?.name || 'User'}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded ${
                      currentRole === 'admin'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : currentRole === 'manager'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {currentRole}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 truncate max-w-[130px]">
                    {currentUser?.email}
                  </p>
                </div>

                <div className="w-8 h-8 rounded-lg overflow-hidden ring-2 ring-indigo-500/20 bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-xs font-bold shrink-0">
                  {currentUser?.name.charAt(0) || 'A'}
                </div>
                <button onClick={() => void signOut()} aria-label="Sign out" title="Sign out" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white">
                  <LogOut className="h-4 w-4" />
                </button>
            </div>

          </div>
        </div>
      </div>

      {/* Mobile sub-navigation bar */}
      <div className="flex md:hidden overflow-x-auto px-4 py-2 space-x-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 no-scrollbar">
        {navItems.filter(item => item.show).map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`shrink-0 flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
