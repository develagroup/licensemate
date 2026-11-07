import React, { useState, useMemo } from 'react';
import { 
  Search, 
  KeyRound, 
  Copy, 
  Check, 
  Mail, 
  Send, 
  Laptop, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  ExternalLink, 
  ShieldAlert, 
  Download, 
  Eye, 
  EyeOff, 
  Terminal, 
  HelpCircle, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  FileCheck2, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  ShoppingBag,
  AlertCircle,
  Cpu,
  Monitor,
  Smartphone,
  Server,
  ArrowLeft,
  Megaphone,
  LifeBuoy
} from 'lucide-react';
import { useLicense } from '../context/LicenseContext';
import { useAuth } from '../context/AuthContext';
import { License, ActivatedDevice, PortalAccentColor } from '../types';
import { signOfflineCertificate } from '../services/cryptoService';

interface CustomerFrontPageProps {
  onTestInSimulator?: (key: string) => void;
  onNavigateToTab?: (tab: string) => void;
  onReturnToAdmin?: () => void;
  defaultEmail?: string;
  isStandalone?: boolean;
  isEmbeddedPreview?: boolean;
}

export const CustomerFrontPage: React.FC<CustomerFrontPageProps> = ({ 
  onTestInSimulator = () => {}, 
  onNavigateToTab,
  onReturnToAdmin,
  defaultEmail = '',
  isStandalone = false,
  isEmbeddedPreview = false
}) => {
  const { licenses, orders, deactivateDevice, resendLicenseKeyEmail, portalConfig } = useLicense();
  const { currentUser, isManager } = useAuth();

  const [searchEmail, setSearchEmail] = useState(defaultEmail || currentUser?.email || 'mistervela@gmail.com');
  const [hasSearched, setHasSearched] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null);
  const [expandedDevices, setExpandedDevices] = useState<Record<string, boolean>>({});
  const [isDownloadingCert, setIsDownloadingCert] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [unbindingDeviceId, setUnbindingDeviceId] = useState<string | null>(null);

  // Search matches
  const matchedLicenses = useMemo(() => {
    if (!searchEmail.trim()) return [];
    const term = searchEmail.trim().toLowerCase();
    return licenses.filter(
      l => l.userEmail.toLowerCase() === term || l.key.toLowerCase() === term || (l.orderId && l.orderId.toLowerCase() === term)
    );
  }, [licenses, searchEmail]);

  // Matching orders
  const matchedOrders = useMemo(() => {
    if (!searchEmail.trim()) return [];
    const term = searchEmail.trim().toLowerCase();
    return orders.filter(
      o => o.customerEmail.toLowerCase() === term || o.orderNumber.toLowerCase() === term || o.externalOrderId.toLowerCase() === term
    );
  }, [orders, searchEmail]);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchEmail.trim()) {
      showToast('Please enter an email address or license key', 'info');
      return;
    }
    setHasSearched(true);
  };

  const setDemoEmail = (email: string) => {
    setSearchEmail(email);
    setHasSearched(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    showToast('License Key copied to clipboard!', 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleRevealKey = (id: string) => {
    setRevealedKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandDevices = (id: string) => {
    setExpandedDevices(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSendEmail = async (license: License) => {
    setIsSendingEmail(license.id);
    try {
      await resendLicenseKeyEmail(license.id);
      showToast(`License Key & activation instructions sent to ${license.userEmail}`, 'success');
    } catch (err) {
      showToast('Failed to dispatch email. Please try again.', 'error');
    } finally {
      setIsSendingEmail(null);
    }
  };

  const handleUnbindDevice = async (licenseId: string, deviceId: string, deviceName: string) => {
    setUnbindingDeviceId(deviceId);
    try {
      await deactivateDevice(licenseId, deviceId);
      showToast(`Workstation "${deviceName}" unlinked. Seat freed!`, 'success');
    } catch (err) {
      showToast('Failed to unlink device seat', 'error');
    } finally {
      setUnbindingDeviceId(null);
    }
  };

  const handleDownloadOfflineCert = async (license: License) => {
    setIsDownloadingCert(license.id);
    try {
      const signed = await signOfflineCertificate({
        header: {
          alg: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256',
          typ: 'LICENSEPULSE_OFFLINE_CERT_V2',
          kid: 'CA-LP-ENTERPRISE-ROOT-2026',
          version: '2.0.0'
        },
        licenseId: license.id,
        key: license.key,
        productName: license.productName,
        productSlug: license.productSlug || 'software',
        plan: license.plan,
        licensee: {
          email: license.userEmail,
          name: license.userName,
          organization: license.userName.includes('@') ? 'Customer Account' : `${license.userName} Org`
        },
        hardwareLock: {
          mode: license.type === 'single_device' ? 'node_locked' : 'multi_node',
          fingerprint: license.devices[0]?.deviceFingerprint || 'FPR-GENERIC-STATION',
          maxCpuCores: 64,
          maxRamGb: 256
        },
        validity: {
          issuedAt: new Date().toISOString(),
          validFrom: new Date().toISOString(),
          expiresAt: license.expiresAt || null,
          isPerpetual: !license.expiresAt,
          offlineGraceDays: license.offlineGraceDays || 30
        },
        entitlements: license.features || ['core_engine', 'cloud_sync']
      });

      const blob = new Blob([signed.armoredCertificate], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${license.productSlug || 'software'}_${license.key.substring(0, 8)}.lic`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`Offline .lic certificate generated and downloaded!`, 'success');
    } catch (err) {
      console.error(err);
      showToast(`Failed to generate offline certificate`, 'error');
    } finally {
      setIsDownloadingCert(null);
    }
  };

  const getOsIcon = (os: string) => {
    switch (os?.toLowerCase()) {
      case 'macos': return <Laptop className="w-3.5 h-3.5 text-[#46cbb5]" />;
      case 'windows': return <Monitor className="w-3.5 h-3.5 text-blue-400" />;
      case 'linux':
      case 'server': return <Server className="w-3.5 h-3.5 text-amber-400" />;
      case 'ios':
      case 'android': return <Smartphone className="w-3.5 h-3.5 text-emerald-400" />;
      default: return <Cpu className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Color theme helper classes
  const getThemeColorClasses = (accent: PortalAccentColor) => {
    switch (accent) {
      case 'teal':
        return {
          btnPrimary: 'bg-[#2db39f] hover:bg-[#0f766e] text-white shadow-teal-950',
          accentText: 'text-[#46cbb5]',
          accentBorder: 'border-[#115e59]',
          badgeBg: 'bg-[#042f2e]',
          pillActive: 'bg-[#115e59] text-[#46cbb5] border-[#134e4a]'
        };
      case 'emerald':
        return {
          btnPrimary: 'bg-[#10b981] hover:bg-[#059669] text-white shadow-emerald-950',
          accentText: 'text-[#34d399]',
          accentBorder: 'border-[#065f46]',
          badgeBg: 'bg-[#022c22]',
          pillActive: 'bg-[#064e3b] text-[#34d399] border-[#065f46]'
        };
      case 'purple':
        return {
          btnPrimary: 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-purple-950',
          accentText: 'text-[#c084fc]',
          accentBorder: 'border-[#6b21a8]',
          badgeBg: 'bg-[#3b0764]',
          pillActive: 'bg-[#581c87] text-[#c084fc] border-[#6b21a8]'
        };
      case 'amber':
        return {
          btnPrimary: 'bg-[#d97706] hover:bg-[#b45309] text-white shadow-amber-950',
          accentText: 'text-[#fbbf24]',
          accentBorder: 'border-[#92400e]',
          badgeBg: 'bg-[#451a03]',
          pillActive: 'bg-[#78350f] text-[#fbbf24] border-[#92400e]'
        };
      case 'blue':
        return {
          btnPrimary: 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-blue-950',
          accentText: 'text-[#60a5fa]',
          accentBorder: 'border-[#1e40af]',
          badgeBg: 'bg-[#172554]',
          pillActive: 'bg-[#1e3a8a] text-[#60a5fa] border-[#1e40af]'
        };
      case 'cyan':
      default:
        return {
          btnPrimary: 'bg-[#2db39f] hover:bg-[#279b89] text-white shadow-cyan-950',
          accentText: 'text-[#46cbb5]',
          accentBorder: 'border-[#303438]',
          badgeBg: 'bg-[#191c1f]',
          pillActive: 'bg-[#191c1f] text-[#46cbb5] border-[#303438]'
        };
    }
  };

  const themeClasses = getThemeColorClasses(portalConfig?.accentColor || 'cyan');

  const faqsToDisplay = portalConfig?.faqs && portalConfig.faqs.length > 0 ? portalConfig.faqs : [
    {
      id: 'f1',
      question: "How do I activate a license on a new computer?",
      answer: "Copy your cryptographic License Key above and paste it directly into the software's Activation / Registration dialog. Once you click Activate, our cloud server will securely bind your new workstation to your seat quota."
    },
    {
      id: 'f2',
      question: "What if I hit my maximum device seats limit?",
      answer: "You can free up seats yourself! In the 'Connected Workstations' section under any of your license cards above, click 'Unbind Seat' next to the computer you no longer use. This instantly frees the slot for your new device."
    }
  ];

  return (
    <div className={`text-slate-100 font-sans ${isStandalone ? 'min-h-screen bg-[#0b0d0f] flex flex-col' : 'min-h-full space-y-8 pb-12'}`}>
      
      {/* Standalone Public Header (Only when rendered as standalone page alone) */}
      {isStandalone && (
        <header className="sticky top-0 z-30 w-full border-b border-[#292d30] bg-[#101214]/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            
            {/* Brand Logo & Title */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-[#191c1f] border border-[#303438] text-[#46cbb5] flex items-center justify-center font-bold text-sm shadow-xs">
                LP
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-white text-base tracking-tight">
                    {portalConfig?.brandName || 'LicensePulse'}
                  </span>
                  <span className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${themeClasses.badgeBg} ${themeClasses.accentText} border ${themeClasses.accentBorder}`}>
                    Customer Portal
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  {portalConfig?.brandTagline || 'Secure Software Key Recovery & Seat Manager'}
                </p>
              </div>
            </div>

            {/* Right Action: Return to Admin Desk Button */}
            <div className="flex items-center space-x-3">
              {onReturnToAdmin && (
                <button
                  id="return-to-admin-desk-btn"
                  onClick={onReturnToAdmin}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold text-slate-200 bg-[#191c1f] hover:bg-[#191c1f] border border-[#303438] transition-all cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#46cbb5]" />
                  <span>Return to Admin Desk</span>
                </button>
              )}

              {portalConfig?.documentationUrl && (
                <a
                  href={portalConfig.documentationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden md:inline-flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs text-slate-300 hover:text-white transition-colors"
                >
                  <LifeBuoy className="w-3.5 h-3.5 text-slate-400" />
                  <span>User Guide</span>
                </a>
              )}
            </div>

          </div>
        </header>
      )}

      {/* Standalone Container wrapper */}
      <div className={isStandalone ? "flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" : "space-y-8"}>
        
        {/* Toast Alert Feedback */}
        {toastMessage && (
          <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-lg text-xs font-semibold shadow-2xl flex items-center space-x-3 transition-all animate-in slide-in-from-top-4 duration-200 border ${
            toastMessage.type === 'success' 
              ? 'bg-[#15201e] text-[#10b981] border-[#065f46]' 
              : toastMessage.type === 'error'
              ? 'bg-[#381119] text-[#f43f5e] border-[#881337]' 
              : 'bg-[#191c1f] text-slate-200 border-[#303438]'
          }`}>
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#10b981]" />}
            {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-[#f43f5e]" />}
            {toastMessage.type === 'info' && <Sparkles className="w-4 h-4 text-[#46cbb5]" />}
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Optional Announcement Banner */}
        {portalConfig?.showAnnouncementBanner && portalConfig?.announcementText && (
          <div className={`rounded-lg p-3.5 text-xs font-medium flex items-center justify-between gap-3 border shadow-md animate-in fade-in duration-150 ${
            portalConfig.announcementType === 'alert'
              ? 'bg-[#381119] text-[#fda4af] border-[#881337]'
              : portalConfig.announcementType === 'warning'
              ? 'bg-[#382608] text-[#fde68a] border-[#78350f]'
              : portalConfig.announcementType === 'success'
              ? 'bg-[#15201e] text-[#a7f3d0] border-[#065f46]'
              : 'bg-[#191c1f] text-[#bae6fd] border-[#303438]'
          }`}>
            <div className="flex items-center space-x-2.5">
              <Megaphone className="w-4 h-4 shrink-0" />
              <span>{portalConfig.announcementText}</span>
            </div>
            {portalConfig.documentationUrl && (
              <a
                href={portalConfig.documentationUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center space-x-1 font-bold underline shrink-0 hover:text-white"
              >
                <span>Learn more</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Front Page Hero Banner */}
        <div className="relative overflow-hidden rounded-lg bg-[#191c1f] border border-[#292d30] shadow-xl p-6 sm:p-10 text-center">
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            
            {/* Tagline / Badge */}
            <div className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-md ${themeClasses.badgeBg} border ${themeClasses.accentBorder} ${themeClasses.accentText} text-xs font-semibold shadow-xs`}>
              <KeyRound className="w-3.5 h-3.5" />
              <span>{portalConfig?.brandTagline || 'Customer Self-Service License Recovery Portal'}</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              {portalConfig?.heroHeading || 'Retrieve Your Software Licenses'}
            </h1>

            {/* Subtitle / Description */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl mx-auto">
              {portalConfig?.heroDescription || 'Lost your activation code, upgraded your workstation, or setting up a new device? Enter your billing email below to instantly retrieve all your active software keys, download offline certificates, or manage connected workstations.'}
            </p>

            {/* Search Input Box */}
            <form onSubmit={handleSearch} className="pt-3 max-w-xl mx-auto">
              <div className="flex flex-col sm:flex-row items-center gap-2 bg-[#151719] p-2 rounded-lg border border-[#292d30] shadow-inner focus-within:border-[#2db39f] transition-all">
                <div className="flex items-center flex-1 w-full pl-3 pr-2">
                  <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    id="front-page-email-input"
                    type="text"
                    placeholder={portalConfig?.searchPlaceholder || 'Enter your customer billing email (e.g. name@company.com)...'}
                    value={searchEmail}
                    onChange={e => setSearchEmail(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden py-1.5"
                  />
                </div>

                <button
                  type="submit"
                  id="front-page-retrieve-btn"
                  className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-md text-xs font-bold transition-all cursor-pointer shadow-md ${themeClasses.btnPrimary}`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{portalConfig?.searchButtonText || 'Retrieve Licenses'}</span>
                </button>
              </div>
            </form>

            {/* Quick Demo Previews */}
            {portalConfig?.showDemoPills && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] text-slate-400">
                <span className="font-medium text-slate-400">Demo Accounts:</span>
                <button
                  onClick={() => setDemoEmail('mistervela@gmail.com')}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer ${
                    searchEmail === 'mistervela@gmail.com'
                      ? themeClasses.pillActive
                      : 'bg-[#151719] hover:bg-[#191c1f] text-slate-300 border border-[#303438]'
                  }`}
                >
                  mistervela@gmail.com
                </button>
                <button
                  onClick={() => setDemoEmail('sarah.connor@cyberdyne.tech')}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer ${
                    searchEmail === 'sarah.connor@cyberdyne.tech'
                      ? themeClasses.pillActive
                      : 'bg-[#151719] hover:bg-[#191c1f] text-slate-300 border border-[#303438]'
                  }`}
                >
                  sarah.connor@cyberdyne.tech
                </button>
                <button
                  onClick={() => setDemoEmail('alex.chen@innovate.io')}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer ${
                    searchEmail === 'alex.chen@innovate.io'
                      ? themeClasses.pillActive
                      : 'bg-[#151719] hover:bg-[#191c1f] text-slate-300 border border-[#303438]'
                  }`}
                >
                  alex.chen@innovate.io
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Main Results Section */}
        {hasSearched && (
          <div className="space-y-6">
            
            {/* Results Summary Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262a2d] pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>Retrieved Licenses for:</span>
                  <span className={`font-mono text-sm underline ${themeClasses.accentText}`}>
                    {searchEmail}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {matchedLicenses.length > 0
                    ? `Found ${matchedLicenses.length} active software license registration(s)`
                    : 'No active licenses found with the provided email address'}
                </p>
              </div>

              {!isStandalone && onReturnToAdmin && (
                <button
                  onClick={onReturnToAdmin}
                  className="self-start sm:self-auto inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-200 bg-[#191c1f] hover:bg-[#191c1f] border border-[#303438] transition-all cursor-pointer"
                >
                  <span>Switch to Admin Console</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#46cbb5]" />
                </button>
              )}
            </div>

            {/* Empty State */}
            {matchedLicenses.length === 0 ? (
              <div className="rounded-lg bg-[#191c1f] border border-[#292d30] p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4">
                <div className="w-14 h-14 rounded-lg bg-[#382608] border border-[#78350f] text-[#f59e0b] flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">No Licenses Found</h3>
                  <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                    We could not find any software licenses assigned to <strong className="text-white">{searchEmail}</strong>. Please double-check for any typos or try the email used during checkout.
                  </p>
                </div>

                {portalConfig?.showTroubleshootingCard && (
                  <div className="p-4 rounded-lg bg-[#151719] border border-[#303438] text-left text-xs space-y-2 max-w-md mx-auto">
                    <p className="font-semibold text-slate-200 flex items-center space-x-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-[#46cbb5]" />
                      <span>Troubleshooting Tips:</span>
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                      <li>Check if you completed payment using Apple Pay, PayPal, or a company email.</li>
                      <li>Click one of the demo customer pills above to test with sample records.</li>
                      <li>If your purchase was processed in the last 2 minutes, allow a moment for webhook sync.</li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              
              /* License Cards Grid */
              <div className="grid grid-cols-1 gap-6">
                {matchedLicenses.map(lic => {
                  const isRevealed = !!revealedKeys[lic.id];
                  const isExpanded = !!expandedDevices[lic.id];
                  const activeDevices = lic.devices.filter(d => d.status === 'active');
                  const seatPercentage = Math.round((activeDevices.length / lic.maxDevices) * 100);

                  return (
                    <div
                      key={lic.id}
                      className="rounded-lg bg-[#191c1f] border border-[#292d30] shadow-lg overflow-hidden transition-all hover:border-[#303438]"
                    >
                      
                      {/* Card Top Header */}
                      <div className="p-5 sm:p-6 border-b border-[#262a2d] flex flex-col md:flex-row md:items-center justify-between gap-4">
                        
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#191c1f] text-[#46cbb5] border border-[#303438] flex items-center justify-center font-bold text-xs">
                              {lic.productName.substring(0, 2).toUpperCase()}
                            </div>
                            <h3 className="text-base font-bold text-white">
                              {lic.productName}
                            </h3>
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[#191c1f] text-slate-300 border border-slate-700 font-mono">
                              {lic.plan} Tier
                            </span>
                            
                            {/* Status Badge */}
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-semibold border ${
                              lic.status === 'active'
                                ? 'bg-[#15201e] text-[#10b981] border-[#065f46]'
                                : lic.status === 'expired'
                                ? 'bg-[#382608] text-[#f59e0b] border-[#78350f]'
                                : 'bg-[#381119] text-[#f43f5e] border-[#881337]'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                lic.status === 'active' ? 'bg-[#10b981] animate-pulse' : 'bg-[#f43f5e]'
                              }`} />
                              <span className="capitalize">{lic.status}</span>
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>Licensed to: <strong className="text-slate-200">{lic.userName}</strong></span>
                            <span>•</span>
                            <span>Email: <strong className="text-slate-200 font-mono">{lic.userEmail}</strong></span>
                            {lic.orderId && (
                              <>
                                <span>•</span>
                                <span>Order: <span className="font-mono text-slate-400">{lic.orderId}</span></span>
                              </>
                            )}
                          </p>
                        </div>

                        {/* Quick Top Actions */}
                        {onTestInSimulator && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => onTestInSimulator(lic.key)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-200 bg-[#151719] hover:bg-[#191c1f] border border-[#303438] transition-all cursor-pointer"
                            >
                              <Terminal className="w-3.5 h-3.5 text-[#46cbb5]" />
                              <span>Simulate Activation</span>
                            </button>
                          </div>
                        )}

                      </div>

                      {/* Cryptographic Key Display Bar */}
                      <div className="p-5 sm:p-6 bg-[#151719] border-b border-[#262a2d]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center space-x-1 font-mono">
                              <KeyRound className="w-3 h-3 text-[#46cbb5]" />
                              <span>Cryptographic Activation Key</span>
                            </span>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="font-mono text-sm sm:text-base font-bold text-white tracking-wider bg-[#191c1f] px-3 py-1.5 rounded-md border border-[#303438] select-all">
                                {isRevealed 
                                  ? lic.key 
                                  : `${lic.key.substring(0, 8)}-••••-••••-••••`}
                              </span>
                              <button
                                onClick={() => toggleRevealKey(lic.id)}
                                title={isRevealed ? 'Hide License Key' : 'Reveal Full License Key'}
                                className="p-2 rounded-md text-slate-400 hover:text-white bg-[#191c1f] hover:bg-[#191c1f] border border-[#303438] transition-all cursor-pointer"
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Direct Customer Recovery Buttons */}
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => copyToClipboard(lic.key)}
                              className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-md text-xs font-bold transition-all cursor-pointer shadow-md ${themeClasses.btnPrimary}`}
                            >
                              {copiedKey === lic.key ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-white" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-white" />
                                  <span>Copy Key</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleSendEmail(lic)}
                              disabled={isSendingEmail === lic.id}
                              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-md text-xs font-semibold text-slate-200 bg-[#191c1f] hover:bg-[#191c1f] border border-[#303438] transition-all cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5 text-[#46cbb5]" />
                              <span>{isSendingEmail === lic.id ? 'Sending...' : 'Email Key to Inbox'}</span>
                            </button>

                            {portalConfig?.showOfflineCertDownload && (
                              <button
                                onClick={() => handleDownloadOfflineCert(lic)}
                                disabled={isDownloadingCert === lic.id}
                                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-md text-xs font-semibold text-slate-300 bg-[#191c1f] hover:bg-[#191c1f] border border-[#303438] transition-all cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5 text-[#46cbb5]" />
                                <span>{isDownloadingCert === lic.id ? 'Generating...' : 'Offline .lic File'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Metadata Badges & Seat Quota Grid */}
                      <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        
                        {/* Seat Allocation */}
                        <div className="p-3.5 rounded-lg bg-[#151719] border border-[#303438] flex flex-col justify-between">
                          <div className="flex items-center justify-between text-slate-400 mb-1">
                            <span className="font-semibold text-[11px]">Device Seats Used</span>
                            <span className="font-mono font-bold text-white">
                              {activeDevices.length} / {lic.maxDevices}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[#0a2b38] rounded-full overflow-hidden my-1.5">
                            <div
                              className="h-full rounded-full transition-all bg-[#2db39f]"
                              style={{ width: `${Math.min(seatPercentage, 100)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                            <span>{lic.type === 'single_device' ? 'Single Workstation' : 'Multi-Device Pool'}</span>
                            {portalConfig?.showConnectedDevices && (
                              <button
                                onClick={() => toggleExpandDevices(lic.id)}
                                className="text-[#46cbb5] hover:underline font-semibold flex items-center space-x-0.5 cursor-pointer"
                              >
                                <span>{isExpanded ? 'Hide Devices' : 'Manage Seats'}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expiration & Validity */}
                        <div className="p-3.5 rounded-lg bg-[#151719] border border-[#303438] flex flex-col justify-between">
                          <span className="font-semibold text-slate-400 text-[11px]">Subscription Expiration</span>
                          <p className="font-bold text-sm text-white mt-1">
                            {lic.expiresAt ? (
                              <span className="flex items-center space-x-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{new Date(lic.expiresAt).toLocaleDateString()}</span>
                              </span>
                            ) : (
                              <span className="text-[#10b981] flex items-center space-x-1.5">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Perpetual Lifetime Access</span>
                              </span>
                            )}
                          </p>
                          <span className="text-[11px] text-slate-400 mt-1">
                            Billing: <span className="capitalize">{lic.billingCycle}</span>
                          </span>
                        </div>

                        {/* Offline Air-Gapped Grace */}
                        <div className="p-3.5 rounded-lg bg-[#151719] border border-[#303438] flex flex-col justify-between">
                          <span className="font-semibold text-slate-400 text-[11px]">Offline Grace Window</span>
                          <p className="font-bold text-sm text-white mt-1 flex items-center space-x-1.5">
                            <FileCheck2 className="w-3.5 h-3.5 text-[#46cbb5]" />
                            <span>{lic.offlineGraceDays || 30} Days Cached</span>
                          </p>
                          <span className="text-[11px] text-slate-400 mt-1">
                            RSA-4096 signature verification supported
                          </span>
                        </div>

                      </div>

                      {/* Expandable Connected Workstations Management Drawer */}
                      {portalConfig?.showConnectedDevices && isExpanded && (
                        <div className="p-5 sm:p-6 bg-[#151719] border-t border-[#262a2d] animate-in fade-in duration-150">
                          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#262a2d]">
                            <div>
                              <h4 className="font-bold text-xs text-white flex items-center space-x-2">
                                <Laptop className="w-4 h-4 text-[#46cbb5]" />
                                <span>Connected Workstations &amp; Hardware Fingerprints</span>
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Unlink any unused device to immediately free a seat for your new computer.
                              </p>
                            </div>
                            <span className="text-[11px] font-mono text-[#46cbb5] bg-[#191c1f] px-2 py-0.5 rounded border border-[#303438]">
                              {activeDevices.length} Active Node(s)
                            </span>
                          </div>

                          {activeDevices.length === 0 ? (
                            <div className="p-4 rounded-lg bg-[#191c1f] border border-[#292d30] text-center text-xs text-slate-400">
                              No workstations currently bound. Enter your key in the software to activate your first device.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {activeDevices.map(dev => (
                                <div
                                  key={dev.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-[#191c1f] border border-[#292d30] text-xs hover:border-[#303438] transition-colors"
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className="p-2 rounded-md bg-[#191c1f] border border-[#303438]">
                                      {getOsIcon(dev.os)}
                                    </div>
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-bold text-white">{dev.deviceName}</span>
                                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#191c1f] text-slate-300 border border-slate-700">
                                          {dev.os}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                        Fingerprint: {dev.deviceFingerprint} • IP: {dev.ip}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-3">
                                    <span className="text-[11px] text-slate-400 hidden md:inline">
                                      Activated: {new Date(dev.activatedAt).toLocaleDateString()}
                                    </span>
                                    <button
                                      onClick={() => handleUnbindDevice(lic.id, dev.id, dev.deviceName)}
                                      disabled={unbindingDeviceId === dev.id}
                                      className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#f43f5e] bg-[#381119] hover:bg-[#4c1622] border border-[#881337] transition-all cursor-pointer"
                                    >
                                      {unbindingDeviceId === dev.id ? 'Unlinking...' : 'Unbind Seat'}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Features Included */}
                      {lic.features && lic.features.length > 0 && (
                        <div className="px-5 sm:px-6 py-3 bg-[#0a0c0e] border-t border-[#262a2d] flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="font-semibold text-slate-400 mr-1">Entitlements:</span>
                          {lic.features.map((feat, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-[#073042] text-[#46cbb5] border border-[#303438] font-mono"
                            >
                              ✓ {feat}
                            </span>
                          ))}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

            {/* Linked Orders Section */}
            {portalConfig?.showLinkedOrders && matchedOrders.length > 0 && (
              <div className="mt-8 rounded-lg bg-[#191c1f] border border-[#292d30] p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#262a2d]">
                  <div className="flex items-center space-x-2">
                    <ShoppingBag className="w-4 h-4 text-[#10b981]" />
                    <h3 className="font-bold text-sm text-white">
                      Linked Invoices &amp; Purchase Orders ({matchedOrders.length})
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Instant checkout fulfillment records
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {matchedOrders.map(order => (
                    <div
                      key={order.id}
                      className="p-3.5 rounded-lg bg-[#151719] border border-[#303438] text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{order.productName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#15201e] text-[#10b981] border border-[#065f46]">
                          {order.paymentStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono">Order: {order.orderNumber}</span>
                        <span className="font-mono font-bold text-white">${order.amount} {order.currency}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        Provider: {order.provider.toUpperCase()} • Key: {order.licenseKey || 'Delivered'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* How License Recovery Works (3-Step Explainer) */}
        {portalConfig?.showRecoveryGuide && (
          <div className="rounded-lg bg-[#191c1f] border border-[#292d30] p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-1 max-w-lg mx-auto">
              <h3 className="text-base sm:text-lg font-bold text-white">
                How {portalConfig?.brandName || 'LicensePulse'} Recovery Works
              </h3>
              <p className="text-xs text-slate-400">
                Instant self-service retrieval without waiting for customer support tickets
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              
              <div className="p-4 rounded-lg bg-[#151719] border border-[#303438] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#191c1f] text-[#46cbb5] border border-[#303438] flex items-center justify-center font-bold">
                  1
                </div>
                <h4 className="font-bold text-white text-sm">Enter Billing Email</h4>
                <p className="text-slate-300 leading-relaxed">
                  We query real-time data across Stripe, Lemon Squeezy, Shopify, and purchase records.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-[#151719] border border-[#303438] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#191c1f] text-[#46cbb5] border border-[#303438] flex items-center justify-center font-bold">
                  2
                </div>
                <h4 className="font-bold text-white text-sm">Instant Cryptographic Match</h4>
                <p className="text-slate-300 leading-relaxed">
                  Retrieve your active 256-bit software keys, seat quotas, and bound workstation identifiers.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-[#151719] border border-[#303438] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#191c1f] text-[#46cbb5] border border-[#303438] flex items-center justify-center font-bold">
                  3
                </div>
                <h4 className="font-bold text-white text-sm">One-Click Activation</h4>
                <p className="text-slate-300 leading-relaxed">
                  Copy your code, download an offline .lic file for air-gapped systems, or send keys directly to your inbox.
                </p>
              </div>

            </div>
          </div>
        )}

        {/* Customer Frequently Asked Questions (FAQ) */}
        {portalConfig?.showFaqSection && faqsToDisplay.length > 0 && (
          <div className="rounded-lg bg-[#191c1f] border border-[#292d30] p-6 sm:p-8 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-[#262a2d]">
              <HelpCircle className="w-4 h-4 text-[#46cbb5]" />
              <h3 className="font-bold text-sm text-white">
                Customer Self-Service FAQ
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              {faqsToDisplay.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={faq.id || idx}
                    className="rounded-lg bg-[#151719] border border-[#303438] overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full p-4 text-left flex items-center justify-between text-slate-200 hover:text-white font-semibold cursor-pointer"
                    >
                      <span>{faq.question}</span>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 ml-2" />}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-slate-400 text-[11px] leading-relaxed border-t border-[#262a2d]">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Standalone Footer */}
        {isStandalone && (
          <footer className="mt-auto border-t border-[#262a2d] pt-8 pb-10 text-xs text-slate-400">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded bg-[#191c1f] border border-[#303438] text-[#46cbb5] flex items-center justify-center font-bold text-[10px]">
                  LP
                </div>
                <span className="font-semibold text-slate-300">
                  {portalConfig?.brandName || 'LicensePulse'} Customer Portal
                </span>
                <span>•</span>
                <span>Self-Service Cryptographic Recovery</span>
              </div>

              <div className="flex items-center space-x-4 text-[11px]">
                {portalConfig?.supportEmail && (
                  <a href={`mailto:${portalConfig.supportEmail}`} className="hover:text-white transition-colors">
                    Support: {portalConfig.supportEmail}
                  </a>
                )}
                {portalConfig?.termsUrl && (
                  <a href={portalConfig.termsUrl} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                    Terms
                  </a>
                )}
                {onReturnToAdmin && (
                  <button
                    onClick={onReturnToAdmin}
                    className="text-[#46cbb5] hover:underline font-semibold cursor-pointer"
                  >
                    Admin Desk ↗
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 text-center text-[10px] text-slate-500">
              {portalConfig?.footerCopyrightText || '© 2026 LicensePulse Technologies Inc. All rights reserved.'}
            </div>
          </footer>
        )}

      </div>
    </div>
  );
};
