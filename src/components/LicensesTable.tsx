import React, { useState, useMemo } from 'react';
import { 
  KeyRound, 
  Check,
  Search, 
  Laptop, 
  MoreVertical, 
  Sparkles, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  RotateCw, 
  Trash2, 
  AlertTriangle,
  Calendar,
  Infinity as InfinityIcon,
  Layers,
  Cpu,
  Zap,
  Cloud,
  Settings,
  BrainCircuit,
  Shield,
  Palette
} from 'lucide-react';
import { useLicense } from '../context/LicenseContext';
import { useAuth } from '../context/AuthContext';
import { License, LicenseStatus } from '../types';

interface LicensesTableProps {
  onOpenCreateModal: () => void;
  onSelectLicenseDetails: (license: License) => void;
}

export const LicensesTable: React.FC<LicensesTableProps> = ({
  onOpenCreateModal,
  onSelectLicenseDetails,
}) => {
  const { licenses, licenseTotal, licensesLoading, licenseQueryLoading, licensesError, refreshLicenseQuery, updateLicenseStatus, renewLicense, deleteLicense } = useLicense();
  const { isManager, currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [alertFeedback, setAlertFeedback] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshLicenseQuery({ search: searchTerm, status: statusFilter, type: typeFilter, plan: planFilter, page });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [refreshLicenseQuery, searchTerm, statusFilter, typeFilter, planFilter, page]);

  React.useEffect(() => { setPage(1); }, [searchTerm, statusFilter, typeFilter, planFilter]);

  const showNotificationFeedback = (msg: string) => {
    setAlertFeedback(msg);
    setTimeout(() => setAlertFeedback(null), 3500);
  };

  // Filter list based on role
  const accessibleLicenses = useMemo(() => {
    if (!isManager && currentUser?.email) {
      return licenses.filter(l => l.userEmail.toLowerCase() === currentUser.email.toLowerCase());
    }
    return licenses;
  }, [licenses, isManager, currentUser]);

  const filteredLicenses = accessibleLicenses;

  const getProductIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('devflow')) return <span className="font-bold text-base">D</span>;
    if (lower.includes('cloud')) return <Cloud className="w-5 h-5 text-[#46cbb5]" />;
    if (lower.includes('vector') || lower.includes('3d')) return <span className="font-bold text-base">V</span>;
    if (lower.includes('quantum') || lower.includes('db')) return <Settings className="w-5 h-5 text-[#46cbb5]" />;
    if (lower.includes('neural') || lower.includes('ai')) return <BrainCircuit className="w-5 h-5 text-[#46cbb5]" />;
    if (lower.includes('shield') || lower.includes('vpn')) return <Shield className="w-5 h-5 text-[#46cbb5]" />;
    if (lower.includes('render')) return <span className="font-bold text-base">R</span>;
    return <KeyRound className="w-5 h-5 text-[#46cbb5]" />;
  };

  const getStatusBadge = (status: LicenseStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[#15201e] text-[#10b981] border border-[#065f46]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] mr-1.5" />
            Active
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[#382608] text-[#f59e0b] border border-[#78350f]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] mr-1.5" />
            Expired
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[#381119] text-[#f43f5e] border border-[#881337]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] mr-1.5" />
            Revoked
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[#082a38] text-[#46cbb5] border border-[#0369a1]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#46cbb5] mr-1.5" />
            Suspended
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 text-slate-100 font-sans">
      
      {/* Toast alert feedback banner */}
      {alertFeedback && (
        <div className="bg-[#191c1f] border border-[#303438] text-white px-4 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-[#46cbb5]" />
            <span>{alertFeedback}</span>
          </div>
          <button onClick={() => setAlertFeedback(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Header & Controls Box */}
      <div className="space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {isManager ? 'All Software Licenses' : 'My Software Licenses'}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-[#073042] text-[#46cbb5] border border-[#303438]">
                {licenseTotal}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isManager 
                ? 'Issue, manage seats, monitor active hardware binds, and configure subscription lifecycles'
                : 'View your software keys, check bound workstations, and retrieve license details'}
            </p>
          </div>

          <button
            id="create-license-table-btn"
            onClick={onOpenCreateModal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-md text-xs font-bold text-white bg-[#2db39f] hover:bg-[#279b89] shadow-md shadow-cyan-950 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>Create New License</span>
          </button>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by key, product, email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-md text-xs bg-[#151719] border border-[#292d30] text-white placeholder-slate-500 focus:outline-hidden focus:border-[#2db39f]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-md text-xs bg-[#151719] border border-[#292d30] text-slate-200 focus:outline-hidden focus:border-[#2db39f]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="expired">Expired Only</option>
            <option value="revoked">Revoked Only</option>
            <option value="suspended">Suspended Only</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-md text-xs bg-[#151719] border border-[#292d30] text-slate-200 focus:outline-hidden focus:border-[#2db39f]"
          >
            <option value="all">All Device Seat Types</option>
            <option value="single_device">Single Device (1 Seat)</option>
            <option value="multi_device">Multi-Device (Cluster/Team)</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-md text-xs bg-[#151719] border border-[#292d30] text-slate-200 focus:outline-hidden focus:border-[#2db39f]"
          >
            <option value="all">All Plan Tiers</option>
            <option value="starter">Starter Plan</option>
            <option value="pro">Pro Plan</option>
            <option value="enterprise">Enterprise Plan</option>
            <option value="lifetime">Lifetime Perpetual</option>
            <option value="trial">Evaluation Trial</option>
          </select>

        </div>

      </div>

      {/* Table Column Headers */}
      <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
        <div className="col-span-3">PRODUCT &amp; LICENSE KEY</div>
        <div className="col-span-2">CUSTOMER / TIER</div>
        <div className="col-span-2">DEVICE SEATS</div>
        <div className="col-span-1">STATUS</div>
        <div className="col-span-2">EXPIRATION / CYCLE</div>
        <div className="col-span-2 text-right pr-2">ACTIONS</div>
      </div>

      {/* Card List of Licenses */}
      <div className="space-y-2.5">
        {licensesError && <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">Could not load server licenses: {licensesError}</div>}
        {licensesLoading || licenseQueryLoading ? (
          <div className="py-12 bg-[#191c1f] border border-[#292d30] rounded-lg text-center text-slate-400">Loading server licenses…</div>
        ) : filteredLicenses.length === 0 ? (
          <div className="py-12 bg-[#191c1f] border border-[#292d30] rounded-lg text-center text-slate-400">
            <KeyRound className="w-8 h-8 mx-auto text-slate-500 mb-2" />
            <p className="font-semibold text-slate-200">No matching licenses found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting search filters or issue a new license key</p>
          </div>
        ) : (
          filteredLicenses.map(license => {
            const activeDevicesCount = license.devices.filter(d => d.status === 'active').length;
            const seatPercentage = Math.min(100, Math.round((activeDevicesCount / license.maxDevices) * 100));
            const canArchive = license.status !== 'active'
              || Boolean(license.expiresAt && new Date(license.expiresAt).getTime() <= Date.now());

            return (
              <div
                key={license.id}
                className="bg-[#191c1f] hover:bg-[#151719] border border-[#292d30] hover:border-[#303438] rounded-lg p-3.5 transition-all shadow-xs relative"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  
                  {/* Column 1: Product & Key (3 cols) */}
                  <div className="lg:col-span-3 flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[#191c1f] border border-[#303438] flex items-center justify-center font-bold text-[#46cbb5] shrink-0">
                      {getProductIcon(license.productName)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-white text-xs truncate">
                          {license.productName}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-[#191c1f] text-slate-300 border border-slate-700 font-mono">
                          {license.plan}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="font-mono text-[11px] text-slate-300 truncate">
                          {license.key}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Customer / Tier (2 cols) */}
                  <div className="lg:col-span-2 min-w-0 text-xs">
                    <p className="font-semibold text-white truncate">{license.userName}</p>
                    <p className="text-[11px] text-slate-400 truncate font-mono">{license.userEmail}</p>
                  </div>

                  {/* Column 3: Device Seats (2 cols) */}
                  <div className="lg:col-span-2 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center space-x-1 text-slate-300">
                        <Laptop className="w-3.5 h-3.5 text-slate-400" />
                        <span>{activeDevicesCount}/{license.maxDevices} seats</span>
                      </span>
                      <span className="font-bold text-[#46cbb5] font-mono">{seatPercentage}%</span>
                    </div>

                    <div className="w-full bg-[#0a2b38] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-[#2db39f] h-full transition-all duration-300"
                        style={{ width: `${seatPercentage}%` }}
                      />
                    </div>

                    <span className="text-[10px] text-slate-400 block truncate">
                      {license.type === 'single_device' ? 'Single Device' : 'Multi-Workstation'}
                    </span>
                  </div>

                  {/* Column 4: Status (1 col) */}
                  <div className="lg:col-span-1">
                    {getStatusBadge(license.status)}
                  </div>

                  {/* Column 5: Expiration / Cycle (2 cols) */}
                  <div className="lg:col-span-2 text-xs">
                    <div className="flex items-center space-x-1 font-semibold text-slate-200">
                      {license.expiresAt ? (
                        <>
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(license.expiresAt).toLocaleDateString()}</span>
                        </>
                      ) : (
                        <>
                          <InfinityIcon className="w-3.5 h-3.5 text-[#46cbb5]" />
                          <span>Lifetime Perpetual</span>
                        </>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block capitalize mt-0.5">
                      {license.billingCycle} • ${license.price}
                    </span>
                  </div>

                  {/* Column 6: Actions (2 cols) */}
                  <div className="lg:col-span-2 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onSelectLicenseDetails(license)}
                      className="px-3 py-1.5 rounded-md bg-[#151719] hover:bg-[#191c1f] border border-[#303438] text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      Details
                    </button>

                    {/* Action Dropdown Trigger */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveActionMenu(activeActionMenu === license.id ? null : license.id)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#191c1f] transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeActionMenu === license.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 rounded-lg bg-[#191c1f] border border-[#292d30] shadow-2xl p-1 z-30 text-xs">
                          {isManager && (
                            <>
                              {license.billingCycle !== 'lifetime' && <button
                                onClick={async () => {
                                  try {
                                    await renewLicense(license.id, 12);
                                    showNotificationFeedback(`Renewed ${license.productName} for 12 months`);
                                  } catch (error) {
                                    showNotificationFeedback(error instanceof Error ? error.message : 'Renewal failed');
                                  }
                                  setActiveActionMenu(null);
                                }}
                                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded text-left text-slate-200 hover:bg-[#191c1f] hover:text-white"
                              >
                                <RotateCw className="w-3.5 h-3.5 text-[#46cbb5]" />
                                <span>Extend 1 Year</span>
                              </button>}

                              {license.status === 'active' || license.status === 'suspended' || license.status === 'expired' ? <button
                                onClick={async () => {
                                  if (license.status === 'expired') {
                                    showNotificationFeedback('Renew this expired license before reactivating it.');
                                    setActiveActionMenu(null);
                                    return;
                                  }
                                  const newStatus = license.status === 'active' ? 'suspended' : 'active';
                                  try {
                                    await updateLicenseStatus(license.id, newStatus, `Status changed from the license list.`);
                                    showNotificationFeedback(`Status changed to ${newStatus.toUpperCase()}`);
                                  } catch (error) {
                                    showNotificationFeedback(error instanceof Error ? error.message : 'Status update failed');
                                  }
                                  setActiveActionMenu(null);
                                }}
                                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded text-left text-slate-200 hover:bg-[#191c1f] hover:text-white"
                              >
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                                <span>{license.status === 'active' ? 'Suspend License' : license.status === 'expired' ? 'Renew before reactivation' : 'Reactivate License'}</span>
                              </button> : null}
                              {license.status !== 'revoked' && <button
                                onClick={async () => {
                                  if (!window.confirm(`Revoke this key permanently? ${license.productName} for ${license.userEmail}`)) return;
                                  try {
                                    await updateLicenseStatus(license.id, 'revoked', 'Revoked by administrator.');
                                    showNotificationFeedback('License revoked. This key cannot be reactivated.');
                                  } catch (error) {
                                    showNotificationFeedback(error instanceof Error ? error.message : 'Revocation failed');
                                  }
                                  setActiveActionMenu(null);
                                }}
                                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded text-left text-rose-300 hover:bg-rose-950/40"
                              >
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                                <span>Revoke permanently</span>
                              </button>}
                            </>
                          )}
                          {isManager && canArchive && (
                            <button
                              onClick={async () => {
                                if (window.confirm(`Archive the ${license.productName} license for ${license.userEmail} from the active list? Its audit history will be retained.`)) {
                                  try {
                                    await deleteLicense(license.id);
                                    showNotificationFeedback('License archived. Its audit history is retained.');
                                  } catch (error) {
                                    showNotificationFeedback(error instanceof Error ? error.message : 'Archive failed');
                                  }
                                  setActiveActionMenu(null);
                                }
                              }}
                              className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded text-left text-rose-400 hover:bg-rose-950/40"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>Archive License</span>
                            </button>
                          )}
                          {isManager && !canArchive && <div className="px-2.5 py-1.5 text-[10px] text-slate-500">Suspend or revoke before archiving</div>}
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {!licensesLoading && licenseTotal > 100 && <div className="flex items-center justify-between border border-[#292d30] rounded-lg bg-[#151719] px-3 py-2 text-xs text-slate-400">
        <span>Page {page} of {Math.ceil(licenseTotal / 100)} · {licenseTotal.toLocaleString()} matching licenses</span>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1 || licenseQueryLoading} onClick={() => setPage(current => Math.max(1, current - 1))} className="rounded border border-[#303438] px-2.5 py-1 disabled:opacity-40">Previous</button>
          <button type="button" disabled={page >= Math.ceil(licenseTotal / 100) || licenseQueryLoading} onClick={() => setPage(current => current + 1)} className="rounded border border-[#303438] px-2.5 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>}

    </div>
  );
};
