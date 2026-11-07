import React from 'react';
import { 
  KeyRound, 
  BarChart3, 
  ShoppingBag, 
  Package, 
  Webhook, 
  FileCheck2, 
  Code2, 
  Terminal, 
  Sliders, 
  Mail, 
  User, 
  Plus, 
  Sparkles, 
  Moon, 
  Sun, 
  LogOut, 
  ChevronRight, 
  X, 
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Activity,
  Zap,
  Layout,
  Palette
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLicense } from '../context/LicenseContext';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenCreateModal: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenCreateModal,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { currentUser, currentRole, signOut, isManager } = useAuth();
  const { theme, toggleTheme, licenses, stats } = useLicense();

  const activeLicenseCount = licenses.filter(l => l.status === 'active').length;

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    onCloseMobile();
  };

  const navSections = [
    {
      title: 'PORTAL & DESIGN',
      items: [
        {
          id: 'portal_editor',
          label: 'Front-End Layout Editor',
          icon: Layout,
          show: false,
          badge: 'Live Editor',
          badgeColor: 'bg-[#171a1c] text-[#7dd3fc] border border-[#303438] font-semibold',
        },
        {
          id: 'profile',
          label: 'My Subscriptions',
          icon: User,
          show: false,
        },
      ],
    },
    {
      title: 'CORE LICENSING',
      items: [
        {
          id: 'dashboard',
          label: 'Analytics Dashboard',
          icon: BarChart3,
          show: true,
        },
        {
          id: 'licenses',
          label: isManager ? 'Software Licenses' : 'My Licenses',
          icon: KeyRound,
          show: true,
          badge: `${activeLicenseCount}`,
          badgeColor: 'bg-[#2db39f] text-white font-bold',
        },
        {
          id: 'order_delivery',
          label: 'Order & Email Pipeline',
          icon: ShoppingBag,
          show: false,
          badge: 'Phase 4',
          badgeColor: 'bg-[#382608] text-[#f59e0b] border border-[#78350f] font-semibold',
        },
      ],
    },
    {
      title: 'DEVELOPER & INTEGRATIONS',
      items: [
        {
          id: 'admin_products',
          label: 'Products & Matrix',
          icon: Package,
          show: false,
          badge: 'Admin',
          badgeColor: 'bg-[#171a1c] text-[#94a3b8] border border-[#303438]',
        },
        {
          id: 'webhooks',
          label: 'Webhooks & Billing',
          icon: Webhook,
          show: false,
          badge: 'Stripe/Lemon',
          badgeColor: 'bg-[#171a1c] text-[#94a3b8] border border-[#303438]',
        },
        {
          id: 'offline_certs',
          label: 'Offline .lic Certs',
          icon: FileCheck2,
          show: false,
          badge: 'RSA-4096',
          badgeColor: 'bg-[#171a1c] text-[#94a3b8] border border-[#303438]',
        },
        {
          id: 'code_generator',
          label: 'SDK & Code Snippets',
          icon: Code2,
          show: false,
          badge: 'SDKs',
          badgeColor: 'bg-[#171a1c] text-[#94a3b8] border border-[#303438]',
        },
        {
          id: 'simulator',
          label: 'Cloud API Simulator',
          icon: Terminal,
          show: false,
          badge: 'Live Test',
          badgeColor: 'bg-[#171a1c] text-[#94a3b8] border border-[#303438]',
        },
      ],
    },
    {
      title: 'ADMIN & AUTOMATIONS',
      items: [
        {
          id: 'audit_logs',
          label: 'Audit Logs & Telemetry',
          icon: Sliders,
          show: isManager,
        },
        {
          id: 'email_automations',
          label: 'Email Delivery',
          icon: Mail,
          show: isManager,
        },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0a0c0e] text-slate-200 border-r border-[#262a2d] select-none">
      
      {/* Brand & Logo Header */}
      <div className="p-4 border-b border-[#262a2d] flex items-center justify-between">
        <div 
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={() => handleNavClick('licenses')}
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2db39f] to-[#238f7d] flex items-center justify-center text-white shadow-md shadow-cyan-900/40">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">
                LicensePulse
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#072d3e] text-[#46cbb5] border border-[#303438]">
                v2.4
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              Licensing &amp; Seat Engine
            </p>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={onCloseMobile}
          className="md:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#072533]"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Primary Action Controls */}
      <div className="px-3 pt-3 space-y-2">
        <button
          id="sidebar-create-license-btn"
          onClick={() => {
            onOpenCreateModal();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-xs font-bold text-white bg-[#2db39f] hover:bg-[#279b89] shadow-md shadow-cyan-950 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Issue New License</span>
        </button>

      </div>

      {/* Navigation Sections */}
      <div className="sidebar-scrollbar flex-1 overflow-y-auto px-3 py-3 space-y-5 scrollbar-thin">
        {navSections.map((section, idx) => {
          const visibleItems = section.items.filter(item => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                {section.title}
              </div>

              {visibleItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all group cursor-pointer ${
                      isActive
                        ? 'bg-[#191c1f] text-[#46cbb5] font-bold shadow-xs border border-[#303438]/60'
                        : 'text-slate-300 hover:text-white hover:bg-[#191c1f] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-[#46cbb5]' : 'text-slate-400 group-hover:text-slate-200'
                      }`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ml-1.5 ${
                        item.badgeColor || 'bg-[#171a1c] text-slate-300 border border-[#303438]'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Bottom User Profile */}
      <div className="p-3 border-t border-[#262a2d] bg-[#101214] relative">
        {/* User Card Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0 p-1.5 -ml-1 flex-1">
            <div className="w-8 h-8 rounded-full bg-[#191c1f] border border-[#303438] flex items-center justify-center font-bold text-xs text-[#46cbb5] shrink-0">
              {currentUser?.name.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight">
                {currentUser?.name || 'Silvio Vela'}
              </p>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-mono font-semibold text-[#46cbb5] uppercase">
                  {currentRole}
                </span>
                <span className="text-slate-500 text-[10px]">•</span>
                <span className="text-[10px] text-slate-400 truncate">
                  Signed in
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-[#072432] transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0a0c0e]">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Placeholder spacer for fixed desktop sidebar */}
      <div className="hidden md:block md:w-64 shrink-0" />
    </>
  );
};
