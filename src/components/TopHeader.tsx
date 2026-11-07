import React from 'react';
import { 
  Menu, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight, 
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
  Layout,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TopHeaderProps {
  activeTab: string;
  onOpenMobileSidebar: () => void;
  onOpenCreateModal: () => void;
  onSelectTab: (tab: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onOpenMobileSidebar,
  onOpenCreateModal,
  onSelectTab,
}) => {
  const { currentRole, currentUser } = useAuth();

  const getPageTitleAndIcon = (tab: string) => {
    switch (tab) {
      case 'portal_editor':
        return { title: 'Front-End Layout Editor', icon: Layout, category: 'Portal & Design' };
      case 'dashboard':
        return { title: 'Analytics Dashboard', icon: BarChart3, category: 'Licensing' };
      case 'licenses':
        return { title: 'Software Licenses Manager', icon: KeyRound, category: 'Licensing' };
      case 'order_delivery':
        return { title: 'Order & Email Delivery Pipeline', icon: ShoppingBag, category: 'Fulfillment' };
      case 'admin_products':
        return { title: 'Software Products & Matrix', icon: Package, category: 'Developer' };
      case 'webhooks':
        return { title: 'Webhooks & Inbound Billing', icon: Webhook, category: 'Integrations' };
      case 'offline_certs':
        return { title: 'Offline RSA-4096 Certificates', icon: FileCheck2, category: 'Security' };
      case 'code_generator':
        return { title: 'SDK & Client Code Generator', icon: Code2, category: 'Developer' };
      case 'simulator':
        return { title: 'Cloud API Live Simulator', icon: Terminal, category: 'Testing' };
      case 'audit_logs':
        return { title: 'Audit Logs & Telemetry', icon: Sliders, category: 'Security' };
      case 'email_automations':
        return { title: 'License Email Delivery', icon: Mail, category: 'Operations' };
      case 'profile':
        return { title: 'My Subscriptions & Devices', icon: User, category: 'Account' };
      default:
        return { title: 'Software Licenses Manager', icon: KeyRound, category: 'Licensing' };
    }
  };

  const pageInfo = getPageTitleAndIcon(activeTab);
  const PageIcon = pageInfo.icon;

  return (
    <header className="sticky top-0 z-20 w-full border-b border-[#262a2d] bg-[#0a0c0e]/95 backdrop-blur-md text-slate-100">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left Section: Mobile Menu Trigger + Breadcrumb */}
        <div className="flex items-center space-x-3">
          
          {/* Mobile Hamburger Menu */}
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden p-2 rounded-md text-slate-400 hover:text-white hover:bg-[#191c1f] transition-colors cursor-pointer"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb & Title */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 text-xs font-medium">
              <span className="text-slate-400 hover:text-slate-200 cursor-pointer" onClick={() => onSelectTab('dashboard')}>LicensePulse</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-slate-400">{pageInfo.category}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-white font-bold text-sm tracking-tight flex items-center space-x-1.5">
                <PageIcon className="w-4 h-4 text-[#46cbb5] inline-block mr-1" />
                <span>{pageInfo.title}</span>
              </span>
            </div>
          </div>

        </div>

        {/* Right Section: Actions, Notifications & Status */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          
          {/* Quick Issue License Button */}
          <button
            id="topheader-create-license-btn"
            onClick={onOpenCreateModal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold text-white bg-[#2db39f] hover:bg-[#279b89] shadow-md shadow-cyan-950 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Issue License</span>
          </button>

          <span className="hidden md:inline-flex rounded-md border border-[#303438] px-2.5 py-1.5 text-[10px] font-medium text-slate-400" title="Customer email delivery is scheduled for Phase 4">
            Email delivery · Phase 4
          </span>

          {/* Current Role Badge */}
          <div className="hidden sm:flex items-center space-x-2 pl-2 border-l border-[#262a2d]">
            <div className="w-2 h-2 rounded-full bg-[#10b981]" />
            <span className="text-xs font-semibold text-slate-300 capitalize">
              {currentUser?.name.split(' ')[0]} ({currentRole})
            </span>
          </div>

        </div>

      </div>
    </header>
  );
};
