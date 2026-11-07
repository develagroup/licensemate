import React, { useState } from 'react';
import { 
  KeyRound, 
  Copy, 
  Check, 
  Laptop, 
  Clock, 
  Mail, 
  RotateCw,
  Terminal,
  Layers,
  Sparkles,
  User,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLicense } from '../context/LicenseContext';
import { License } from '../types';

interface UserProfileSectionProps {
  onTestInSimulator: (key: string) => void;
  onOpenCreateModal: () => void;
}

export const UserProfileSection: React.FC<UserProfileSectionProps> = ({
  onTestInSimulator,
  onOpenCreateModal,
}) => {
  const { currentUser } = useAuth();
  const { licenses, deactivateDevice, renewLicense, resendLicenseKeyEmail } = useLicense();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const userEmail = currentUser?.email || 'mistervela@gmail.com';
  const myLicenses = licenses.filter(
    l => l.userEmail.toLowerCase() === userEmail.toLowerCase()
  );

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans animate-in fade-in duration-200">
      
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-[#15201e] text-[#10b981] border border-[#065f46] px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between shadow-2xl">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="ml-3 text-slate-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* User Profile Card Header */}
      <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-xl bg-[#191c1f] border border-[#303438] text-[#46cbb5] flex items-center justify-center font-extrabold text-2xl shadow-md">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {currentUser?.name || 'Customer Account'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#15201e] text-[#46cbb5] border border-[#303438] font-mono">
                  {currentUser?.role || 'Customer'}
                </span>
              </div>
              <p className="text-xs text-[#46cbb5] font-mono mt-0.5">
                {currentUser?.email}
              </p>
              <div className="flex items-center space-x-3 text-xs text-slate-400 mt-2">
                <span>Account ID: <strong className="font-mono text-slate-200">usr_9921_sv</strong></span>
                <span>•</span>
                <span>Customer since: <strong className="text-slate-200">Jan 2025</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="p-3.5 rounded-xl bg-[#101214] border border-[#292d30] text-center w-full sm:w-auto min-w-[140px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Total Subscriptions</span>
              <span className="text-xl font-extrabold text-[#46cbb5]">{myLicenses.length} Active</span>
            </div>
          </div>

        </div>
      </div>

      {/* Subscriptions & Key Retrieval Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2 font-mono">
              <KeyRound className="w-4 h-4 text-[#46cbb5]" />
              <span>My Software Subscriptions &amp; License Keys</span>
            </h3>
            <p className="text-xs text-slate-300">
              Directly retrieve your cryptographic license codes, manage connected workstation hardware, and renew subscriptions
            </p>
          </div>
        </div>

        {myLicenses.length === 0 ? (
          <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-12 text-center text-xs text-slate-400 space-y-3">
            <KeyRound className="w-10 h-10 mx-auto text-slate-600" />
            <p className="font-bold text-sm text-slate-200">No active software keys found under this account</p>
            <p className="text-slate-400 max-w-sm mx-auto">
              Use the Customer Front Page to query purchases by alternate billing email or issue a new license.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {myLicenses.map(lic => {
              const activeDevs = lic.devices.filter(d => d.status === 'active');
              const percent = Math.min(100, Math.round((activeDevs.length / lic.maxDevices) * 100));

              return (
                <div
                  key={lic.id}
                  className="bg-[#191c1f] border border-[#292d30] rounded-xl p-6 shadow-xl space-y-5"
                >
                  
                  {/* Product Header & Key Bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#292d30]">
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-extrabold text-base text-white">
                          {lic.productName}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[#191c1f] text-[#46cbb5] border border-[#292d30] font-mono">
                          {lic.plan} Tier
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold capitalize bg-[#15201e] text-[#10b981] border border-[#065f46] font-mono">
                          {lic.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        {lic.type === 'single_device' ? 'Single Device License (1 Workstation)' : `Multi-Device Team License (${lic.maxDevices} Workstations)`}
                      </p>
                    </div>

                    {/* License Key with 1-Click Copy */}
                    <div className="flex items-center space-x-2 bg-[#101214] p-2 rounded-lg border border-[#292d30]">
                      <div className="px-2">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Your License Key</span>
                        <span className="font-mono text-xs sm:text-sm font-bold text-[#46cbb5] select-all">
                          {lic.key}
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(lic.key)}
                        className="p-2 rounded-md bg-[#191c1f] text-slate-200 shadow-xs border border-[#292d30] hover:bg-[#292d30] transition-all cursor-pointer"
                        title="Copy Key"
                      >
                        {copiedKey === lic.key ? (
                          <Check className="w-4 h-4 text-[#10b981]" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-300" />
                        )}
                      </button>
                    </div>

                  </div>

                  {/* Subscription Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    
                    <div className="p-3.5 rounded-lg bg-[#101214] border border-[#292d30]">
                      <span className="text-slate-400 uppercase text-[10px] font-bold block font-mono">Renewal Date</span>
                      <div className="mt-1 flex items-center space-x-1.5 font-bold text-white">
                        <Clock className="w-3.5 h-3.5 text-[#46cbb5]" />
                        <span>{lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString() : 'Lifetime Perpetual'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 capitalize">
                        Billing: ${lic.price} / {lic.billingCycle}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#101214] border border-[#292d30]">
                      <span className="text-slate-400 uppercase text-[10px] font-bold block font-mono">Hardware Seat Usage</span>
                      <div className="mt-1 flex items-center justify-between text-white font-bold">
                        <span>{activeDevs.length} / {lic.maxDevices} Devices</span>
                        <span className="text-[#46cbb5] text-[11px] font-mono">{percent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#191c1f] rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-[#2db39f] rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#101214] border border-[#292d30] flex flex-col justify-between">
                      <span className="text-slate-400 uppercase text-[10px] font-bold block font-mono">Automated Email Delivery</span>
                      <button
                        onClick={async () => {
                          await resendLicenseKeyEmail(lic.id);
                          showToast(`Delivered license key to ${lic.userEmail}`);
                        }}
                        className="mt-1 inline-flex items-center space-x-1.5 text-xs text-[#46cbb5] font-semibold hover:underline cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email Key Backup</span>
                      </button>
                    </div>

                  </div>

                  {/* Bound Hardware Workstations */}
                  <div>
                    <span className="text-xs font-bold text-white block mb-2 font-mono">
                      Active Bound Workstations ({activeDevs.length} of {lic.maxDevices})
                    </span>

                    {activeDevs.length === 0 ? (
                      <div className="p-4 rounded-lg border border-[#292d30] bg-[#101214] text-center text-xs text-slate-400">
                        No devices currently activated. Open the desktop app or API simulator to register your workstation.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeDevs.map(dev => (
                          <div
                            key={dev.id}
                            className="p-3 rounded-lg bg-[#101214] border border-[#292d30] flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center space-x-3">
                              <Laptop className="w-4 h-4 text-[#46cbb5]" />
                              <div>
                                <span className="font-bold text-white">{dev.deviceName}</span>
                                <span className="text-slate-400 ml-2 font-mono text-[11px]">{dev.os} • {dev.ip}</span>
                              </div>
                            </div>

                            <button
                              onClick={async () => {
                                await deactivateDevice(lic.id, dev.id);
                                showToast(`Workstation seat unlinked.`);
                              }}
                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 transition-colors cursor-pointer"
                            >
                              Release Seat
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#292d30]">
                    <button
                      onClick={() => onTestInSimulator(lic.key)}
                      className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-200 bg-[#191c1f] hover:bg-[#292d30] border border-[#292d30] transition-colors cursor-pointer"
                    >
                      Test in API Simulator
                    </button>

                    <button
                      onClick={async () => {
                        await renewLicense(lic.id, 12);
                        showToast(`Subscription renewed for 1 Year!`);
                      }}
                      className="px-4 py-2 rounded-lg text-xs font-bold text-slate-950 bg-[#2db39f] hover:bg-[#279b89] shadow-md transition-colors cursor-pointer"
                    >
                      Renew Subscription (+1 Year)
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
