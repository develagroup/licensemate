import React, { useState } from 'react';
import { 
  Search, 
  KeyRound, 
  Copy, 
  Check, 
  Mail, 
  Laptop, 
  Clock, 
  Sparkles,
  ShieldAlert,
  Terminal,
  Play
} from 'lucide-react';
import { useLicense } from '../context/LicenseContext';
import { License } from '../types';

interface KeyRetrievalPortalProps {
  onTestInSimulator: (key: string) => void;
}

export const KeyRetrievalPortal: React.FC<KeyRetrievalPortalProps> = ({ onTestInSimulator }) => {
  const { licenses, resendLicenseKeyEmail } = useLicense();

  const [lookupEmail, setLookupEmail] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [matchedLicenses, setMatchedLicenses] = useState<License[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null);

  const handleLookup = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!lookupEmail.trim()) return;

    const term = lookupEmail.trim().toLowerCase();
    const results = licenses.filter(
      l => l.userEmail.toLowerCase() === term || l.key.toLowerCase().includes(term)
    );
    setMatchedLicenses(results);
    setHasSearched(true);
  };

  const setDemoLookup = (email: string) => {
    setLookupEmail(email);
    const results = licenses.filter(l => l.userEmail.toLowerCase() === email.toLowerCase());
    setMatchedLicenses(results);
    setHasSearched(true);
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSendEmail = async (licenseId: string, email: string) => {
    setIsSendingEmail(licenseId);
    try {
      await resendLicenseKeyEmail(licenseId);
      setFeedback(`License backup & cryptographic token dispatched to ${email}`);
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setIsSendingEmail(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-slate-100 font-sans">
      
      {/* Toast Feedback */}
      {feedback && (
        <div className="fixed top-20 right-6 z-50 bg-[#15201e] text-[#10b981] border border-[#065f46] px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between shadow-2xl">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-[#10b981]" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="ml-3 text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-[#191c1f] border border-[#292d30] rounded-lg p-8 shadow-xl text-center space-y-4">
        <div className="w-12 h-12 rounded-lg bg-[#191c1f] border border-[#303438] text-[#46cbb5] mx-auto flex items-center justify-center shadow-md">
          <KeyRound className="w-6 h-6 text-[#46cbb5]" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            Software License Key Recovery Portal
          </h2>
          <p className="text-xs text-slate-300 max-w-lg mx-auto">
            Lost your activation code or setting up a new computer? Enter your purchase email address to retrieve all assigned cryptographic license keys and seat allocations.
          </p>
        </div>

        {/* Lookup Form */}
        <form onSubmit={handleLookup} className="max-w-md mx-auto pt-2">
          <div className="flex items-center space-x-2 bg-[#151719] p-1.5 rounded-lg border border-[#292d30] focus-within:border-[#2db39f]">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input
              type="email"
              required
              placeholder="Enter customer email (e.g. name@company.com)..."
              value={lookupEmail}
              onChange={e => setLookupEmail(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-hidden py-1 px-2"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-md text-xs font-bold text-white bg-[#2db39f] hover:bg-[#279b89] shadow-md transition-all cursor-pointer whitespace-nowrap"
            >
              Find Keys
            </button>
          </div>
        </form>

        {/* Demo Fast Fill Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-slate-400">
          <span>Quick test:</span>
          <button
            onClick={() => setDemoLookup('mistervela@gmail.com')}
            className="px-2 py-0.5 rounded-md bg-[#151719] hover:bg-[#191c1f] text-[#46cbb5] border border-[#303438] font-mono cursor-pointer"
          >
            mistervela@gmail.com
          </button>
          <button
            onClick={() => setDemoLookup('sarah.connor@cyberdyne.tech')}
            className="px-2 py-0.5 rounded-md bg-[#151719] hover:bg-[#191c1f] text-[#46cbb5] border border-[#303438] font-mono cursor-pointer"
          >
            sarah.connor@cyberdyne.tech
          </button>
        </div>

      </div>

      {/* Results Section */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">
              Recovery Results ({matchedLicenses.length})
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Query: {lookupEmail}
            </span>
          </div>

          {matchedLicenses.length === 0 ? (
            <div className="p-8 rounded-lg bg-[#191c1f] border border-[#292d30] text-center space-y-2">
              <ShieldAlert className="w-8 h-8 text-[#f59e0b] mx-auto" />
              <p className="font-bold text-sm text-white">No active licenses found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                We could not locate any active subscriptions matching <strong className="text-slate-200">{lookupEmail}</strong>. Check for typos or try the email used during checkout.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {matchedLicenses.map(license => {
                const activeDevices = license.devices.filter(d => d.status === 'active');
                return (
                  <div
                    key={license.id}
                    className="p-5 rounded-lg bg-[#191c1f] border border-[#292d30] shadow-md space-y-4 hover:border-[#303438] transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#262a2d]">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-sm text-white">{license.productName}</h4>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#191c1f] text-slate-300 border border-slate-700 font-mono">
                            {license.plan}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Assigned to: <strong className="text-slate-200">{license.userName}</strong> ({license.userEmail})
                        </p>
                      </div>

                      <span className={`px-2.5 py-1 rounded text-xs font-semibold self-start sm:self-auto border ${
                        license.status === 'active'
                          ? 'bg-[#15201e] text-[#10b981] border-[#065f46]'
                          : 'bg-[#382608] text-[#f59e0b] border-[#78350f]'
                      }`}>
                        {license.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Key Box */}
                    <div className="p-3.5 rounded-lg bg-[#151719] border border-[#303438] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                          Cryptographic License Key
                        </span>
                        <span className="font-mono text-sm sm:text-base font-bold text-white select-all">
                          {license.key}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyKey(license.key)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-white bg-[#2db39f] hover:bg-[#279b89] shadow-xs cursor-pointer"
                        >
                          {copiedKey === license.key ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === license.key ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                          onClick={() => handleSendEmail(license.id, license.userEmail)}
                          disabled={isSendingEmail === license.id}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-200 bg-[#191c1f] hover:bg-[#191c1f] border border-[#303438] cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#46cbb5]" />
                          <span>{isSendingEmail === license.id ? 'Sending...' : 'Email Key'}</span>
                        </button>

                        <button
                          onClick={() => onTestInSimulator(license.key)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-200 bg-[#191c1f] hover:bg-[#191c1f] border border-[#303438] cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 text-[#46cbb5] fill-[#46cbb5]" />
                          <span>Simulate</span>
                        </button>
                      </div>
                    </div>

                    {/* Metadata Specs */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-300">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Bound Devices:</span>
                        <span className="font-bold text-white font-mono">
                          {activeDevices.length} / {license.maxDevices} seats
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Expiration:</span>
                        <span className="font-bold text-white">
                          {license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Perpetual Lifetime'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Entitlements:</span>
                        <span className="font-mono text-[11px] text-[#46cbb5]">
                          {(license.features || []).join(', ') || 'Standard Features'}
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
