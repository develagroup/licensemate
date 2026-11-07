import React, { useState } from 'react';
import { 
  Mail, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Bell, 
  Sparkles, 
  Eye, 
  X, 
  Check, 
  Zap, 
  KeyRound 
} from 'lucide-react';
import { useLicense } from '../context/LicenseContext';
import { NotificationRule } from '../types';

export const EmailAutomations: React.FC = () => {
  const { 
    notificationRules, 
    toggleNotificationRule, 
    triggerBatchRenewalNotifications,
    licenses,
    sendRenewalNotice
  } = useLicense();

  const [previewRule, setPreviewRule] = useState<NotificationRule | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Expiring licenses within 30 days
  const expiringSoonLicenses = licenses.filter(l => {
    if (!l.expiresAt || l.status !== 'active') return false;
    const days = Math.ceil((new Date(l.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 30;
  });

  const handleBroadcastAll = async () => {
    setIsBroadcasting(true);
    try {
      const count = await triggerBatchRenewalNotifications();
      setFeedback(`Dispatched automated renewal alerts to ${count} customers with licenses expiring in <30 days.`);
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans animate-in fade-in duration-200">
      
      {/* Toast Feedback */}
      {feedback && (
        <div className="fixed top-20 right-6 z-50 bg-[#15201e] text-[#10b981] border border-[#065f46] px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between shadow-2xl">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="ml-3 text-slate-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <Mail className="w-5 h-5 text-[#46cbb5]" />
            <h2 className="text-base sm:text-lg font-bold text-white font-mono">
              Automated Lifecycle &amp; Renewal Email Triggers
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Configure automated customer emails for 30-day, 7-day, and 1-day subscription renewals, expirations, and seat quota warnings.
          </p>
        </div>

        <button
          onClick={handleBroadcastAll}
          disabled={isBroadcasting}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-bold text-slate-950 bg-[#2db39f] hover:bg-[#279b89] shadow-md transition-all shrink-0 cursor-pointer disabled:opacity-50"
        >
          <Zap className="w-4 h-4 fill-slate-950" />
          <span>{isBroadcasting ? 'Broadcasting Emails...' : `Run Batch Renewal Checks (${expiringSoonLicenses.length} Due)`}</span>
        </button>
      </div>

      {/* Configured Automation Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {notificationRules.map(rule => (
          <div
            key={rule.id}
            className="bg-[#191c1f] border border-[#292d30] rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#292d30]">
                <div className="flex items-center space-x-2.5">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                    rule.enabled 
                      ? 'bg-[#15201e] text-[#46cbb5] border-[#303438]' 
                      : 'bg-[#101214] text-slate-500 border-[#292d30]'
                  }`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-white">
                      {rule.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Trigger: {rule.daysOffset === 0 ? 'On Expiration Date' : `${rule.daysOffset} Days Prior`}
                    </span>
                  </div>
                </div>

                {/* Enable/Disable Toggle */}
                <button
                  onClick={() => toggleNotificationRule(rule.id)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-[#292d30] transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    rule.enabled ? 'bg-[#2db39f]' : 'bg-[#101214]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full ${
                      rule.enabled ? 'bg-slate-950 translate-x-4' : 'bg-slate-400 translate-x-0'
                    } transition duration-200 ease-in-out shadow-xs`}
                  />
                </button>
              </div>

              {/* Template Subject & Preview text */}
              <div className="mt-3 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Subject Template</span>
                  <p className="font-semibold text-slate-200 mt-0.5">
                    {rule.subjectTemplate}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Description / Rule Logic</span>
                  <p className="text-slate-300 line-clamp-2 mt-0.5 font-mono text-[11px] bg-[#101214] p-2.5 rounded-lg border border-[#292d30]">
                    {rule.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#292d30] text-xs">
              <span className="text-[11px] text-slate-400 font-mono">
                Status: <strong className={rule.enabled ? 'text-[#10b981]' : 'text-slate-500'}>{rule.enabled ? 'ACTIVE' : 'PAUSED'}</strong>
              </span>

              <button
                onClick={() => setPreviewRule(rule)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold text-slate-200 bg-[#191c1f] hover:bg-[#292d30] border border-[#292d30] transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-[#46cbb5]" />
                <span>Preview Email</span>
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* Licenses Expiring Soon Queue */}
      <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#292d30]">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center space-x-2 font-mono">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Subscriptions Requiring Renewal Attention ({expiringSoonLicenses.length})</span>
            </h3>
            <p className="text-xs text-slate-300">
              Licenses due for expiration within the next 30 days
            </p>
          </div>
        </div>

        {expiringSoonLicenses.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6 font-mono">
            No licenses currently approaching expiration within 30 days.
          </p>
        ) : (
          <div className="space-y-2">
            {expiringSoonLicenses.map(lic => {
              const daysLeft = Math.ceil((new Date(lic.expiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div
                  key={lic.id}
                  className="p-3.5 rounded-lg bg-[#101214] border border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-950/70 text-amber-300 border border-amber-800 flex items-center justify-center font-bold font-mono">
                      {daysLeft}d
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">{lic.productName}</span>
                        <span className="font-mono text-[#46cbb5] font-semibold">{lic.key}</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Customer: {lic.userName} ({lic.userEmail}) • Expires {new Date(lic.expiresAt!).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      await sendRenewalNotice(lic.id);
                      setFeedback(`Renewal notice dispatched to ${lic.userEmail}`);
                      setTimeout(() => setFeedback(null), 3500);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-[#191c1f] hover:bg-[#292d30] border border-[#292d30] cursor-pointer"
                  >
                    <Send className="w-3 h-3 text-[#46cbb5]" />
                    <span>Send Immediate Reminder</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Email Template Preview Modal */}
      {previewRule && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-[#191c1f] border border-[#292d30] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between p-4 border-b border-[#292d30] bg-[#151719]">
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5 font-mono">
                <Mail className="w-4 h-4 text-[#46cbb5]" />
                <span>HTML Email Preview: {previewRule.name}</span>
              </span>
              <button
                onClick={() => setPreviewRule(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Email Client Frame */}
            <div className="p-6 space-y-4">
              
              <div className="p-3 rounded-lg bg-[#101214] border border-[#292d30] text-xs space-y-1">
                <p><strong className="text-slate-400 font-mono">From:</strong> LicensePulse Cloud &lt;licensing@licensepulse.io&gt;</p>
                <p><strong className="text-slate-400 font-mono">To:</strong> Sarah Connor &lt;sarah.connor@cyberdyne.tech&gt;</p>
                <p><strong className="text-slate-400 font-mono">Subject:</strong> {previewRule.subjectTemplate.replace('{{product_name}}', 'DevFlow IDE Pro')}</p>
              </div>

              {/* Email Content Body */}
              <div className="p-6 rounded-lg border border-[#292d30] bg-[#101214] text-slate-200 space-y-4 text-xs">
                
                <div className="flex items-center space-x-2 pb-3 border-b border-[#292d30]">
                  <div className="w-7 h-7 rounded-md bg-[#191c1f] border border-[#303438] text-[#46cbb5] flex items-center justify-center font-bold text-xs">
                    LP
                  </div>
                  <span className="font-bold text-sm text-white">LicensePulse Cloud Services</span>
                </div>

                <p className="font-semibold text-white">Hello Sarah,</p>

                <p className="text-slate-300 leading-relaxed">
                  {previewRule.description}
                </p>

                {/* Key Details Card inside Email */}
                <div className="p-4 rounded-lg bg-[#191c1f] border border-[#292d30] space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">License Key</span>
                  <p className="font-mono font-bold text-sm text-[#46cbb5]">DFLOW-9921A-K784X-P002</p>
                  <p className="text-[11px] text-slate-300 font-mono">Plan: PRO TIER (3 Workstations) • Auto-Renew Enabled</p>
                </div>

                <div className="pt-2 text-center">
                  <button className="px-6 py-2.5 rounded-lg bg-[#2db39f] hover:bg-[#279b89] text-slate-950 font-bold text-xs shadow-md cursor-pointer transition-all">
                    1-Click Extend Subscription ($299/yr)
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 text-center pt-2">
                  Need assistance? Contact our engineering team at support@licensepulse.io
                </p>

              </div>

            </div>

            <div className="p-4 border-t border-[#292d30] bg-[#101214] flex justify-end">
              <button
                onClick={() => setPreviewRule(null)}
                className="px-5 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-[#191c1f] hover:bg-[#292d30] border border-[#292d30] cursor-pointer"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
