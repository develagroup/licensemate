import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  KeyRound, 
  Copy, 
  Check, 
  Laptop, 
  ShieldCheck, 
  Calendar, 
  Layers, 
  DollarSign,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useLicense } from '../context/LicenseContext';
import { LicensePlan, LicenseType, BillingCycle, License } from '../types';

interface CreateLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessCreated?: (license: License) => void;
}

const PRESET_PRODUCTS = [
  { name: 'DevFlow IDE Pro', prefix: 'DFLOW', defaultPrice: 299 },
  { name: 'CloudGuardian Shield', prefix: 'CGUARD', defaultPrice: 1890 },
  { name: 'VectorCraft 3D Studio', prefix: 'VCRAFT', defaultPrice: 49 },
  { name: 'QuantumDB Engine', prefix: 'QNTUM', defaultPrice: 2499 },
  { name: 'NeuralVision AI SDK', prefix: 'NEURL', defaultPrice: 149 },
  { name: 'Custom Software Product', prefix: 'CUSTOM', defaultPrice: 99 },
];

const AVAILABLE_FEATURES = [
  { id: 'core_engine', label: 'Core Software Engine' },
  { id: 'gpu_acceleration', label: 'GPU Acceleration / Hardware Render' },
  { id: 'cloud_workspace', label: 'Cloud Workspace & Sync' },
  { id: 'ai_autocomplete', label: 'AI Models & Neural Engine' },
  { id: 'api_access', label: 'REST API & Webhook Access' },
  { id: 'zero_trust_mesh', label: 'Zero-Trust Mesh Networking' },
  { id: 'unlimited_exports', label: 'Unlimited High-Res Exports' },
  { id: 'priority_support', label: '24/7 Priority SLA Support' },
];

export const CreateLicenseModal: React.FC<CreateLicenseModalProps> = ({ isOpen, onClose, onSuccessCreated }) => {
  const { createLicense, retryEmailDelivery } = useLicense();

  const [productName, setProductName] = useState(PRESET_PRODUCTS[0].name);
  const [customKeyPrefix, setCustomKeyPrefix] = useState(PRESET_PRODUCTS[0].prefix);
  const [plan, setPlan] = useState<LicensePlan>('pro');
  const [licenseType, setLicenseType] = useState<LicenseType>('multi_device');
  const [maxDevices, setMaxDevices] = useState<number>(3);
  const [durationOption, setDurationOption] = useState<string>('365');
  const [userEmail, setUserEmail] = useState('sarah.connor@cyberdyne.tech');
  const [userName, setUserName] = useState('Sarah Connor');
  const [price, setPrice] = useState(299);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [autoRenew, setAutoRenew] = useState(true);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['core_engine', 'cloud_workspace', 'gpu_acceleration']);
  const [notes, setNotes] = useState('');
  
  // Post-creation view
  const [createdLicense, setCreatedLicense] = useState<License | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isRetryingEmail, setIsRetryingEmail] = useState(false);

  if (!isOpen) return null;

  const handleProductSelect = (pName: string) => {
    setProductName(pName);
    const matched = PRESET_PRODUCTS.find(p => p.name === pName);
    if (matched) {
      setCustomKeyPrefix(matched.prefix);
      setPrice(matched.defaultPrice);
    }
  };

  const handleTypeChange = (type: LicenseType) => {
    setLicenseType(type);
    if (type === 'single_device') {
      setMaxDevices(1);
    } else {
      setMaxDevices(3);
    }
  };

  const toggleFeature = (fId: string) => {
    setSelectedFeatures(prev => 
      prev.includes(fId) ? prev.filter(id => id !== fId) : [...prev, fId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const durationDays = durationOption === 'lifetime' ? null : parseInt(durationOption, 10);
      
      const newLic = await createLicense({
        productName,
        customKeyPrefix,
        plan,
        type: licenseType,
        userEmail,
        userName,
        maxDevices: licenseType === 'single_device' ? 1 : maxDevices,
        durationDays,
        features: selectedFeatures,
        price,
        billingCycle: durationOption === 'lifetime' ? 'lifetime' : billingCycle,
        autoRenew: durationOption === 'lifetime' ? false : autoRenew,
        notes
      });

      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {}

      setCreatedLicense(newLic);
      if (onSuccessCreated) {
        onSuccessCreated(newLic);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'The license could not be issued.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyKey = () => {
    if (!createdLicense) return;
    navigator.clipboard.writeText(createdLicense.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetAndClose = () => {
    setCreatedLicense(null);
    onClose();
  };

  const handleRetryEmail = async () => {
    const delivery = createdLicense?.emailDelivery;
    if (!delivery?.retryable) return;
    setIsRetryingEmail(true);
    try {
      const updated = await retryEmailDelivery(delivery.id);
      setCreatedLicense(current => current ? { ...current, emailDelivery: updated } : current);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Email retry could not be started.');
    } finally {
      setIsRetryingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 text-slate-100">
      <div className="relative w-full max-w-2xl bg-[#191c1f] border border-[#292d30] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#262a2d] bg-[#151719]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#191c1f] border border-[#303438] text-[#46cbb5] flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-[#46cbb5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono">
                {createdLicense ? 'License Generated Successfully' : 'Issue New Software License'}
              </h3>
              <p className="text-xs text-slate-400">
                {createdLicense 
                  ? 'The license is saved on the server. Email status below reflects the SMTP response.'
                  : 'Configure seat quotas, validity timeframe, and cryptographic entitlements'}
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#191c1f] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {createdLicense ? (
          <div className="p-6 space-y-6">
            
            {/* Generated Key Card */}
            <div className="p-5 rounded-lg bg-[#151719] border border-[#303438] text-center space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                License Key · Shown Once
              </span>
              <div className="flex items-center justify-center space-x-3">
                <span className="font-mono text-xl sm:text-2xl font-extrabold text-white tracking-wider select-all">
                  {createdLicense.key}
                </span>
                <button
                  onClick={copyKey}
                  className="p-2 rounded-md bg-[#2db39f] hover:bg-[#279b89] text-white shadow-xs transition-all cursor-pointer"
                  title="Copy Key"
                >
                  {copied ? <Check className="w-5 h-5 text-white" /> : <Copy className="w-5 h-5 text-white" />}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Allocated Seats: <strong className="text-slate-200">{createdLicense.maxDevices} {createdLicense.type === 'single_device' ? 'device' : 'devices'}</strong> • 
                Plan: <strong className="text-slate-200 uppercase">{createdLicense.plan}</strong> • 
                Expires: <strong className="text-slate-200">{createdLicense.expiresAt ? new Date(createdLicense.expiresAt).toLocaleDateString() : 'Perpetual Lifetime'}</strong>
              </p>
              <p className="text-xs text-amber-300">Copy and store this key before closing. Only its hash is saved, so it cannot be revealed again.</p>
            </div>

            <div className={`rounded-lg border p-4 text-xs ${createdLicense.emailDelivery?.status === 'accepted' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {createdLicense.emailDelivery?.status === 'accepted' ? 'SMTP accepted the license email' : `Email ${createdLicense.emailDelivery?.status || 'status unavailable'}`}
                  </p>
                  <p className="mt-1 opacity-80">
                    {createdLicense.emailDelivery?.status === 'accepted'
                      ? `Accepted for ${createdLicense.emailDelivery.recipientEmail}. Inbox delivery is not confirmed by SMTP.`
                      : createdLicense.emailDelivery?.lastErrorSummary || 'Copy the one-time key above and provide it securely if email is unavailable.'}
                  </p>
                </div>
                {createdLicense.emailDelivery?.retryable && <button type="button" onClick={() => void handleRetryEmail()} disabled={isRetryingEmail} className="rounded-md border border-current/30 px-3 py-2 font-semibold disabled:opacity-50">
                  {isRetryingEmail ? 'Retrying…' : 'Retry email'}
                </button>}
              </div>
            </div>

            {/* Recipient & Features Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-lg bg-[#151719] border border-[#303438] space-y-1.5">
                <span className="font-bold text-slate-400 uppercase text-[10px] font-mono">Customer Details</span>
                <p className="font-semibold text-white text-sm">{createdLicense.userName}</p>
                <p className="text-slate-400 font-mono">{createdLicense.userEmail}</p>
              </div>

              <div className="p-4 rounded-lg bg-[#151719] border border-[#303438] space-y-1.5">
                <span className="font-bold text-slate-400 uppercase text-[10px] font-mono">Activated Features</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {createdLicense.features.map(f => (
                    <span key={f} className="px-2 py-0.5 rounded bg-[#191c1f] text-[#46cbb5] text-[10px] font-mono border border-[#303438]">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-[#262a2d]">
              <button
                onClick={handleResetAndClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-md text-xs font-bold text-white bg-[#2db39f] hover:bg-[#279b89] shadow-md transition-all cursor-pointer"
              >
                Done / Back to Dashboard
              </button>
            </div>

          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {submitError && <div role="alert" className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{submitError}</div>}
            
            {/* 1. Product & Prefix */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Software Product
                </label>
                <select
                  value={productName}
                  onChange={e => handleProductSelect(e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-xs bg-[#151719] border border-[#292d30] text-white focus:border-[#2db39f]"
                >
                  {PRESET_PRODUCTS.map(p => (
                    <option key={p.name} value={p.name}>{p.name} ({p.prefix})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Key Prefix
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={customKeyPrefix}
                  onChange={e => setCustomKeyPrefix(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-md text-xs font-mono uppercase bg-[#151719] border border-[#292d30] text-white focus:border-[#2db39f]"
                />
              </div>
            </div>

            {/* 2. Plan Tier & Device Limit Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Plan Tier
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['starter', 'pro', 'enterprise', 'lifetime', 'trial'] as LicensePlan[]).map(p => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPlan(p)}
                      className={`py-2 px-2 text-center rounded-md text-xs font-semibold capitalize transition-all cursor-pointer ${
                        plan === p
                          ? 'bg-[#2db39f] text-white font-bold shadow-xs'
                          : 'bg-[#151719] text-slate-400 border border-[#303438] hover:border-[#303438]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Single vs Multi Device Quota */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Hardware Seat Quota
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('single_device')}
                    className={`p-2.5 rounded-md text-left text-xs transition-all cursor-pointer ${
                      licenseType === 'single_device'
                        ? 'bg-[#191c1f] border-2 border-[#2db39f] text-white font-bold'
                        : 'bg-[#151719] border border-[#303438] text-slate-400 hover:border-[#303438]'
                    }`}
                  >
                    <span className="font-bold block">1 Device</span>
                    <span className="text-[10px] text-slate-400">Single-seat node</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTypeChange('multi_device')}
                    className={`p-2.5 rounded-md text-left text-xs transition-all cursor-pointer ${
                      licenseType === 'multi_device'
                        ? 'bg-[#191c1f] border-2 border-[#2db39f] text-white font-bold'
                        : 'bg-[#151719] border border-[#303438] text-slate-400 hover:border-[#303438]'
                    }`}
                  >
                    <span className="font-bold block">Multi-Device</span>
                    <span className="text-[10px] text-slate-400">Cluster / Workstations</span>
                  </button>
                </div>

                {licenseType === 'multi_device' && (
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Allowed Workstations:</span>
                    <select
                      value={maxDevices}
                      onChange={e => setMaxDevices(parseInt(e.target.value, 10))}
                      className="px-2 py-1 rounded-md text-xs bg-[#151719] border border-[#292d30] text-white"
                    >
                      <option value={3}>3 Devices</option>
                      <option value={5}>5 Devices</option>
                      <option value={10}>10 Devices</option>
                      <option value={25}>25 Devices (Enterprise)</option>
                      <option value={100}>100 Devices (Unlimited)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Customer Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Customer Full Name
                </label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full px-3 py-2 rounded-md text-xs bg-[#151719] border border-[#292d30] text-white focus:border-[#2db39f]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Customer Email (Email delivery is not available yet)
                </label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  placeholder="e.g. sarah@cyberdyne.tech"
                  className="w-full px-3 py-2 rounded-md text-xs bg-[#151719] border border-[#292d30] text-white focus:border-[#2db39f]"
                />
              </div>
            </div>

            {/* 4. Validity Duration & Pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Validity Duration
                </label>
                <select
                  value={durationOption}
                  onChange={e => setDurationOption(e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-xs bg-[#151719] border border-[#292d30] text-white focus:border-[#2db39f]"
                >
                  <option value="30">30 Days (Evaluation)</option>
                  <option value="90">90 Days (Quarterly)</option>
                  <option value="365">1 Year (Standard)</option>
                  <option value="1095">3 Years (Enterprise)</option>
                  <option value="lifetime">Perpetual Lifetime</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Price ($ USD)
                </label>
                <input
                  type="number"
                  min={0}
                  value={price}
                  onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-md text-xs bg-[#151719] border border-[#292d30] text-white focus:border-[#2db39f]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Billing Cycle
                </label>
                <select
                  value={billingCycle}
                  onChange={e => setBillingCycle(e.target.value as BillingCycle)}
                  disabled={durationOption === 'lifetime'}
                  className="w-full px-3 py-2 rounded-md text-xs bg-[#151719] border border-[#292d30] text-white focus:border-[#2db39f]"
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                  <option value="lifetime">One-Time Perpetual</option>
                </select>
              </div>
            </div>

            {/* 5. Feature Entitlements */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                Entitlement Flags / Encrypted Features
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_FEATURES.map(feat => {
                  const isChecked = selectedFeatures.includes(feat.id);
                  return (
                    <label
                      key={feat.id}
                      onClick={() => toggleFeature(feat.id)}
                      className={`flex items-center space-x-2.5 p-2 rounded-md cursor-pointer text-xs transition-colors ${
                        isChecked
                          ? 'bg-[#191c1f] border border-[#2db39f] text-white'
                          : 'bg-[#151719] border border-[#303438] text-slate-400 hover:border-[#303438]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-[#2db39f] focus:ring-0"
                      />
                      <span>{feat.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Submit Bar */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#262a2d]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md text-xs font-medium text-slate-400 hover:text-white hover:bg-[#151719] cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-md text-xs font-bold text-white bg-[#2db39f] hover:bg-[#279b89] shadow-md transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>{isSubmitting ? 'Registering Key...' : 'Generate & Dispatch Key'}</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
