import React from 'react';
import { 
  KeyRound, 
  Laptop, 
  Activity, 
  Mail,
  ShieldAlert, 
  TrendingUp, 
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useLicense } from '../context/LicenseContext';
import { useAuth } from '../context/AuthContext';

interface DashboardStatsProps {
  onNavigateToTab: (tab: string) => void;
  onOpenCreateModal: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ onNavigateToTab }) => {
  const { stats, licenses, licensesLoading } = useLicense();
  const { isManager, currentUser } = useAuth();
  const [operational, setOperational] = React.useState<{
    licenses: { total: number; active: number };
    activeDevices: number;
    validations24h: { successful: number; failed: number; successRate: number | null };
    emails24h: { accepted: number; failed: number };
  } | null>(null);

  React.useEffect(() => {
    if (!isManager) { setOperational(null); return; }
    let cancelled = false;
    fetch('/api/v1/admin/metrics', { credentials: 'same-origin' })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error('Metrics unavailable');
        if (!cancelled) setOperational(result);
      })
      .catch(() => { if (!cancelled) setOperational(null); });
    return () => { cancelled = true; };
  }, [isManager, currentUser]);

  const userLicenses: typeof licenses = [];
  const userDevices = 0;

  // If customer view, show personalized customer metrics
  if (!isManager) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Customer Stat 1 */}
        <div className="bg-[#191c1f] border border-[#292d30] rounded-lg p-5 shadow-xs hover:border-[#303438] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              My Active Licenses
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#191c1f] text-[#46cbb5] border border-[#303438] flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">
              {licensesLoading ? '…' : userLicenses.filter(l => l.status === 'active').length}
            </span>
            <span className="text-xs text-slate-400">
              of {userLicenses.length} total keys
            </span>
          </div>
          <div className="mt-3 flex items-center text-xs text-[#46cbb5] cursor-pointer font-medium hover:underline" onClick={() => onNavigateToTab('licenses')}>
            <span>View license details →</span>
          </div>
        </div>

        {/* Customer Stat 2 */}
        <div className="bg-[#191c1f] border border-[#292d30] rounded-lg p-5 shadow-xs hover:border-[#303438] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Connected Devices
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#191c1f] text-[#10b981] border border-[#303438] flex items-center justify-center">
              <Laptop className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">
              {userDevices}
            </span>
            <span className="text-xs text-slate-400">
              active workstations
            </span>
          </div>
          <div className="mt-3 flex items-center text-xs text-emerald-400 cursor-pointer font-medium hover:underline" onClick={() => onNavigateToTab('profile')}>
            <span>Manage &amp; unbind seats →</span>
          </div>
        </div>

        {/* Customer Stat 3 (RC1 is admin-only; customer roles are disabled) */}
        <div className="bg-[#191c1f] border border-[#292d30] rounded-lg p-5 shadow-xs hover:border-[#303438] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Validation Health
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#191c1f] text-[#46cbb5] border border-[#303438] flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-400 font-mono">
              —
            </span>
            <span className="text-xs text-slate-400">
              Phase 3
            </span>
          </div>
          <div className="mt-3 flex items-center text-xs text-[#46cbb5] cursor-pointer font-medium hover:underline" onClick={() => onNavigateToTab('simulator')}>
            <span>Test key in simulator →</span>
          </div>
        </div>

        {/* Customer Stat 4 */}
        <div className="bg-[#191c1f] border border-[#292d30] rounded-lg p-5 shadow-xs hover:border-[#303438] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Retrieve / Key Backup
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#191c1f] text-[#46cbb5] border border-[#303438] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-sm font-semibold text-slate-200">
              Not available
            </span>
          </div>
          <div className="mt-3 flex items-center text-xs text-[#46cbb5] cursor-pointer font-medium hover:underline" onClick={() => onNavigateToTab('front_page')}>
            <span>Instant email key retrieval →</span>
          </div>
        </div>

      </div>
    );
  }

  // Admin / Manager View
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      
      {/* 1. Active Licenses */}
      <div 
        onClick={() => onNavigateToTab('licenses')}
        className="group cursor-pointer bg-[#191c1f] border border-[#292d30] hover:border-[#2db39f] rounded-lg p-4 shadow-xs transition-all hover:bg-[#151719]"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Active Licenses
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#191c1f] text-[#46cbb5] border border-[#303438] flex items-center justify-center group-hover:border-[#2db39f] transition-transform">
            <KeyRound className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline space-x-2">
          <span className="text-2xl font-extrabold text-white">
            {operational?.licenses.active ?? stats.activeLicenses}
          </span>
          <span className="text-xs text-slate-400">
            / {operational?.licenses.total ?? stats.totalLicenses} keys
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-emerald-400 font-semibold flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-0.5" />
            {Math.round(((operational?.licenses.active ?? stats.activeLicenses) / ((operational?.licenses.total ?? stats.totalLicenses) || 1)) * 100)}% valid
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#46cbb5] transition-colors" />
        </div>
      </div>

      {/* 2. Connected Devices / Seats */}
      <div 
        onClick={() => onNavigateToTab('audit_logs')}
        className="group cursor-pointer bg-[#191c1f] border border-[#292d30] hover:border-[#2db39f] rounded-lg p-4 shadow-xs transition-all hover:bg-[#151719]"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Active Devices
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#191c1f] text-[#10b981] border border-[#303438] flex items-center justify-center group-hover:border-[#2db39f] transition-transform">
            <Laptop className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline space-x-2">
          <span className="text-2xl font-extrabold text-white">
              {licensesLoading && !operational ? '…' : operational?.activeDevices ?? stats.totalActiveDevices}
          </span>
          <span className="text-xs text-slate-400">
            hardware seats
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">
            Single &amp; multi-device
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
        </div>
      </div>

      {/* 3. Real-Time Success Rate */}
      <div 
        onClick={() => onNavigateToTab('audit_logs')}
        className="group cursor-pointer bg-[#191c1f] border border-[#292d30] hover:border-[#2db39f] rounded-lg p-4 shadow-xs transition-all hover:bg-[#151719]"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            API Validation
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#191c1f] text-[#46cbb5] border border-[#303438] flex items-center justify-center group-hover:border-[#2db39f] transition-transform">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline space-x-2">
          <span className="text-2xl font-extrabold text-white font-mono">
            {operational?.validations24h.successRate === null || !operational ? '—' : `${operational.validations24h.successRate}%`}
          </span>
          <span className="text-xs text-emerald-400 font-semibold">
            rolling 24h
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">
            {operational ? `${operational.validations24h.successful + operational.validations24h.failed} checks · ${operational.validations24h.failed} rejected` : 'Metrics unavailable'}
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#46cbb5] transition-colors" />
        </div>
      </div>

      {/* 4. Expiring Soon (<30 days) */}
      <div 
        onClick={() => onNavigateToTab('licenses')}
        className="group cursor-pointer bg-[#191c1f] border border-[#292d30] hover:border-[#2db39f] rounded-lg p-4 shadow-xs transition-all hover:bg-[#151719]"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Expiring &lt;30d
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#191c1f] text-[#f59e0b] border border-[#303438] flex items-center justify-center group-hover:border-[#2db39f] transition-transform">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline space-x-2">
          <span className="text-2xl font-extrabold text-amber-400 font-mono">
            {stats.expiringSoonCount}
          </span>
          <span className="text-xs text-slate-400">
            subscriptions
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-amber-400 font-medium">
            {operational ? 'Expires within 30 days' : 'Expiration metrics unavailable'}
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
        </div>
      </div>

      {/* 5. Email delivery */}
      <div 
        onClick={() => onNavigateToTab('email_automations')}
        className="group cursor-pointer bg-[#191c1f] border border-[#292d30] hover:border-[#2db39f] rounded-lg p-4 shadow-xs transition-all hover:bg-[#151719]"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Emails Accepted · 24h
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#191c1f] text-[#46cbb5] border border-[#303438] flex items-center justify-center group-hover:border-[#2db39f] transition-transform">
            <Mail className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline space-x-2">
          <span className="text-2xl font-extrabold text-white">
            {operational ? operational.emails24h.accepted : '—'}
          </span>
          <span className="text-xs text-slate-400">
            accepted
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-slate-300 font-medium flex items-center">
            <TrendingUp className="w-3 h-3 mr-0.5 text-[#46cbb5]" />
            Email accepts · rolling 24h
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#46cbb5] transition-colors" />
        </div>
      </div>

      {/* 6. Blocked Attempts / Audit Alerts */}
      <div 
        onClick={() => onNavigateToTab('audit_logs')}
        className="group cursor-pointer bg-[#191c1f] border border-[#292d30] hover:border-[#2db39f] rounded-lg p-4 shadow-xs transition-all hover:bg-[#151719]"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Blocked Attempts
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#191c1f] text-rose-400 border border-[#303438] flex items-center justify-center group-hover:border-[#2db39f] transition-transform">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline space-x-2">
          <span className="text-2xl font-extrabold text-rose-400 font-mono">
            {operational?.validations24h.failed ?? '—'}
          </span>
          <span className="text-xs text-slate-400">
            in audit logs
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">
            Device caps &amp; expired
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400 transition-colors" />
        </div>
      </div>

    </div>
  );
};
