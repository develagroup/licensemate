import React from 'react';
import { 
  X, 
  KeyRound, 
  Laptop, 
  Trash2, 
  ShieldAlert,
  Cpu,
} from 'lucide-react';
import { License } from '../types';
import { useLicense } from '../context/LicenseContext';

interface LicenseDetailsModalProps {
  license: License | null;
  isOpen?: boolean;
  onClose: () => void;
}

export const LicenseDetailsModal: React.FC<LicenseDetailsModalProps> = ({
  license,
  isOpen = true,
  onClose,
}) => {
  const { updateLicenseStatus, deleteLicense } = useLicense();

  if (!isOpen || !license) return null;

  const activeDeviceCount = license.devices?.filter(d => d.status === 'active').length || 0;
  const canArchive = license.status !== 'active'
    || Boolean(license.expiresAt && new Date(license.expiresAt).getTime() <= Date.now());

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-[#191c1f] border border-[#292d30] rounded-xl shadow-2xl overflow-hidden flex flex-col my-8">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#262a2d] bg-[#151719] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                License Details
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
                  license.status === 'active' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : license.status === 'expired'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}>
                  {license.status.toUpperCase()}
                </span>
              </h2>
              <p className="text-xs text-slate-400">{license.productName} • Issued on {new Date(license.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* Key Banner */}
          <div className="p-4 bg-[#101214] border border-[#292d30] rounded-xl relative overflow-hidden">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400 mb-1.5">
              License key prefix
            </div>
            <div className="flex items-center justify-between gap-2 bg-[#101214] px-3.5 py-2.5 rounded-lg border border-[#292d30]">
              <span className="font-mono text-sm sm:text-base font-bold text-cyan-200 tracking-wider break-all">
                {license.key}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">The full key was shown once when issued. It is stored only as a hash and cannot be recovered.</p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[#151719] border border-[#262a2d] rounded-lg">
              <div className="text-[11px] text-slate-400 font-medium">Customer</div>
              <div className="text-xs font-semibold text-white truncate mt-1">{license.userName}</div>
              <div className="text-[10px] text-slate-500 truncate">{license.userEmail}</div>
            </div>

            <div className="p-3 bg-[#151719] border border-[#262a2d] rounded-lg">
              <div className="text-[11px] text-slate-400 font-medium">Plan Tier</div>
              <div className="text-xs font-semibold text-cyan-300 mt-1 capitalize">{license.plan}</div>
              <div className="text-[10px] text-slate-500">{license.billingCycle} billing</div>
            </div>

            <div className="p-3 bg-[#151719] border border-[#262a2d] rounded-lg">
              <div className="text-[11px] text-slate-400 font-medium">Device seats</div>
              <div className="text-xs font-semibold text-white mt-1">Limit: {license.maxDevices}</div>
              <div className="text-[10px] text-slate-500 mt-1">{activeDeviceCount} active of {license.maxDevices} seats</div>
            </div>

            <div className="p-3 bg-[#151719] border border-[#262a2d] rounded-lg">
              <div className="text-[11px] text-slate-400 font-medium">Expires</div>
              <div className="text-xs font-semibold text-white mt-1">
                {license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Perpetual'}
              </div>
              <div className="text-[10px] text-slate-500">
                {license.expiresAt ? `${Math.ceil((new Date(license.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left` : 'No expiration'}
              </div>
            </div>
          </div>

          {/* Active Devices */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                Hardware Node Activations ({activeDeviceCount})
              </h3>
            </div>

            {license.devices && license.devices.length > 0 ? (
              <div className="space-y-2">
                {license.devices.map((device) => (
                  <div key={device.id} className="p-3 bg-[#101214] border border-[#292d30] rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-cyan-500/10 rounded-md border border-cyan-500/20 text-cyan-400">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-2">
                          {device.deviceName || 'Workstation Node'}
                          <span className="text-[10px] text-slate-400 font-mono">[{device.os}]</span>
                          {device.status === 'deactivated' && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded">Deactivated</span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          Fingerprint: {device.deviceFingerprint} • IP: {device.ip}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2 hidden sm:block">
                        <div className="text-[10px] text-slate-400">Last Seen</div>
                        <div className="text-xs font-medium text-slate-200">
                          {new Date(device.lastHeartbeat || device.activatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-[#101214] border border-[#292d30] rounded-lg text-center text-xs text-slate-400">
                No device activations recorded for this license.
              </div>
            )}
          </div>

          {/* Included Features */}
          {license.features && license.features.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Enabled Feature Entitlements
              </div>
              <div className="flex flex-wrap gap-1.5">
                {license.features.map((feat, i) => (
                  <span key={i} className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-medium rounded-md">
                    ✓ {feat}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#151719] border-t border-[#262a2d] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {license.status === 'active' && <button
              onClick={async () => {
                try { await updateLicenseStatus(license.id, 'suspended', 'Suspended from license details.'); }
                catch (error) { window.alert(error instanceof Error ? error.message : 'Could not suspend license.'); }
              }}
              className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-medium text-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Suspend
            </button>}
            {license.status === 'suspended' && <button
              onClick={async () => {
                try { await updateLicenseStatus(license.id, 'active', 'Reactivated from license details.'); }
                catch (error) { window.alert(error instanceof Error ? error.message : 'Could not reactivate license.'); }
              }}
              className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-medium text-emerald-300 rounded-lg transition-colors"
            >Reactivate</button>}
            {license.status === 'expired' && <span className="text-[10px] text-amber-300">Renew this license before reactivation.</span>}
            {license.status !== 'revoked' && <button
              onClick={async () => {
                if (!window.confirm('Revoke this key permanently? It cannot be reactivated.')) return;
                try { await updateLicenseStatus(license.id, 'revoked', 'Revoked from license details.'); }
                catch (error) { window.alert(error instanceof Error ? error.message : 'Could not revoke license.'); }
              }}
              className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-medium text-rose-300 rounded-lg transition-colors"
            >Revoke permanently</button>}
            {canArchive ? <button
              onClick={async () => {
                if (!window.confirm('Archive this license from the active list? Its audit history will remain.')) return;
                try { await deleteLicense(license.id); onClose(); }
                catch (error) { window.alert(error instanceof Error ? error.message : 'Could not archive license.'); }
              }}
              className="px-3 py-2 bg-[#101214] hover:bg-white/5 border border-[#292d30] text-xs font-medium text-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Archive
            </button> : <span className="text-[10px] text-slate-500">Suspend or revoke before archiving</span>}
            {license.status === 'revoked' && <span className="text-xs text-rose-300">Revoked keys are terminal.</span>}
          </div>
          <button onClick={onClose} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors">Close</button>
        </div>

      </div>
    </div>
  );
};
