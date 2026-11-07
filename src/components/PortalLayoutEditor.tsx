import React, { useState } from 'react';
import { 
  Palette, 
  Layout, 
  HelpCircle, 
  Link2, 
  ExternalLink, 
  Eye, 
  RotateCcw, 
  Save, 
  Check, 
  Plus, 
  Trash2, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Sparkles, 
  Megaphone, 
  ShieldCheck, 
  KeyRound, 
  FileCheck2, 
  ShoppingBag, 
  Laptop, 
  Mail,
  Copy,
  Layers,
  Settings
} from 'lucide-react';
import { useLicense } from '../context/LicenseContext';
import { PortalAccentColor, PortalFaqItem } from '../types';
import { CustomerFrontPage } from './CustomerFrontPage';

interface PortalLayoutEditorProps {
  onLaunchStandalonePage: () => void;
  onTestInSimulator?: (key: string) => void;
}

export const PortalLayoutEditor: React.FC<PortalLayoutEditorProps> = ({
  onLaunchStandalonePage,
  onTestInSimulator = () => {}
}) => {
  const { portalConfig, updatePortalConfig, resetPortalConfig } = useLicense();
  
  const [activeEditorTab, setActiveEditorTab] = useState<'branding' | 'sections' | 'announcement' | 'faqs' | 'support'>('branding');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [saveToast, setSaveToast] = useState(false);
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [showAddFaqForm, setShowAddFaqForm] = useState(false);

  const accentColors: { id: PortalAccentColor; label: string; bgClass: string; hex: string }[] = [
    { id: 'cyan', label: 'Electric Cyan', bgClass: 'bg-[#2db39f]', hex: '#2db39f' },
    { id: 'teal', label: 'Deep Teal', bgClass: 'bg-[#2db39f]', hex: '#2db39f' },
    { id: 'emerald', label: 'Emerald Green', bgClass: 'bg-[#10b981]', hex: '#10b981' },
    { id: 'purple', label: 'Cyber Purple', bgClass: 'bg-[#8b5cf6]', hex: '#8b5cf6' },
    { id: 'amber', label: 'Solar Amber', bgClass: 'bg-[#d97706]', hex: '#d97706' },
    { id: 'blue', label: 'Royal Blue', bgClass: 'bg-[#2563eb]', hex: '#2563eb' },
  ];

  const handleSave = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;
    
    const newFaq: PortalFaqItem = {
      id: `faq_${Date.now()}`,
      question: newFaqQuestion.trim(),
      answer: newFaqAnswer.trim()
    };

    updatePortalConfig({
      faqs: [...portalConfig.faqs, newFaq]
    });

    setNewFaqQuestion('');
    setNewFaqAnswer('');
    setShowAddFaqForm(false);
  };

  const handleDeleteFaq = (id: string) => {
    updatePortalConfig({
      faqs: portalConfig.faqs.filter(f => f.id !== id)
    });
  };

  const handleUpdateFaq = (id: string, question: string, answer: string) => {
    updatePortalConfig({
      faqs: portalConfig.faqs.map(f => f.id === id ? { ...f, question, answer } : f)
    });
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans animate-in fade-in duration-200">
      
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed top-20 right-6 z-50 px-4 py-3 rounded-lg text-xs font-semibold shadow-2xl flex items-center space-x-2.5 bg-[#15201e] text-[#10b981] border border-[#065f46] animate-in slide-in-from-top-4 duration-200">
          <Check className="w-4 h-4 text-[#10b981]" />
          <span>Customer portal settings updated and saved!</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-lg bg-[#191c1f] border border-[#292d30] shadow-lg p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#191c1f] border border-[#303438] text-[#46cbb5] flex items-center justify-center font-bold">
              <Layout className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Customer Front-End Layout Editor
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#191c1f] text-[#46cbb5] border border-[#303438]">
              Live Customizer
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Customize branding, theme color accents, announcements, and modular components for the standalone customer portal.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={resetPortalConfig}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-md text-xs font-semibold text-slate-300 bg-[#151719] hover:bg-[#191c1f] border border-[#303438] transition-all cursor-pointer"
            title="Reset to factory preset values"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-md text-xs font-bold text-slate-200 bg-[#072d3d] hover:bg-[#0a3a4d] border border-[#303438] transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-[#46cbb5]" />
            <span>Save Settings</span>
          </button>

          {/* Primary CTA: Launch Standalone Customer Front Page */}
          <button
            id="launch-standalone-portal-btn"
            onClick={onLaunchStandalonePage}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-bold text-white bg-[#2db39f] hover:bg-[#279b89] shadow-md shadow-cyan-950 transition-all cursor-pointer"
          >
            <span>Launch Standalone Customer Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Configuration Controls (5 cols or full if preview hidden) */}
        <div className={showLivePreview ? "lg:col-span-6 space-y-6" : "lg:col-span-12 space-y-6"}>
          
          {/* Section Navigation Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 rounded-lg bg-[#151719] border border-[#292d30]">
            <button
              onClick={() => setActiveEditorTab('branding')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeEditorTab === 'branding'
                  ? 'bg-[#2db39f] text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#191c1f]'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Branding &amp; Theme</span>
            </button>

            <button
              onClick={() => setActiveEditorTab('sections')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeEditorTab === 'sections'
                  ? 'bg-[#2db39f] text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#191c1f]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Modules &amp; Blocks</span>
            </button>

            <button
              onClick={() => setActiveEditorTab('announcement')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeEditorTab === 'announcement'
                  ? 'bg-[#2db39f] text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#191c1f]'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Announcement</span>
            </button>

            <button
              onClick={() => setActiveEditorTab('faqs')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeEditorTab === 'faqs'
                  ? 'bg-[#2db39f] text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#191c1f]'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>FAQ Manager</span>
            </button>

            <button
              onClick={() => setActiveEditorTab('support')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeEditorTab === 'support'
                  ? 'bg-[#2db39f] text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#191c1f]'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Support &amp; Footer</span>
            </button>
          </div>

          {/* Tab 1: Branding & Identity */}
          {activeEditorTab === 'branding' && (
            <div className="rounded-lg bg-[#191c1f] border border-[#292d30] p-5 space-y-4">
              <div className="border-b border-[#262a2d] pb-3">
                <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                  <Palette className="w-4 h-4 text-[#46cbb5]" />
                  <span>Branding &amp; Visual Identity</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set the brand name, hero copy, and primary color palette for the public customer page.
                </p>
              </div>

              {/* Color Accent Picker */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Accent Color Theme</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {accentColors.map(color => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => updatePortalConfig({ accentColor: color.id })}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center space-y-1.5 ${
                        portalConfig.accentColor === color.id
                          ? 'bg-[#092c3a] border-[#46cbb5] ring-1 ring-[#46cbb5]'
                          : 'bg-[#151719] border-[#303438] hover:border-slate-500'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full ${color.bgClass} shadow-xs`} />
                      <span className="text-[10px] font-medium text-slate-300 truncate w-full">{color.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Name & Tagline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Portal Brand Name</label>
                  <input
                    type="text"
                    value={portalConfig.brandName}
                    onChange={e => updatePortalConfig({ brandName: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-[#151719] border border-[#303438] text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#2db39f]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Top Header Tagline / Badge</label>
                  <input
                    type="text"
                    value={portalConfig.brandTagline}
                    onChange={e => updatePortalConfig({ brandTagline: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-[#151719] border border-[#303438] text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#2db39f]"
                  />
                </div>
              </div>

              {/* Hero Heading */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Hero Main Title</label>
                <input
                  type="text"
                  value={portalConfig.heroHeading}
                  onChange={e => updatePortalConfig({ heroHeading: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-[#151719] border border-[#303438] text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#2db39f]"
                />
              </div>

              {/* Hero Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Hero Subtitle / Customer Guide</label>
                <textarea
                  rows={3}
                  value={portalConfig.heroDescription}
                  onChange={e => updatePortalConfig({ heroDescription: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-[#151719] border border-[#303438] text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#2db39f]"
                />
              </div>

              {/* Search Bar Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Search Box Placeholder</label>
                  <input
                    type="text"
                    value={portalConfig.searchPlaceholder}
                    onChange={e => updatePortalConfig({ searchPlaceholder: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-[#151719] border border-[#303438] text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#2db39f]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Search Button Label</label>
                  <input
                    type="text"
                    value={portalConfig.searchButtonText}
                    onChange={e => updatePortalConfig({ searchButtonText: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-[#151719] border border-[#303438] text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#2db39f]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Modules & Block Visibility Toggles */}
          {activeEditorTab === 'sections' && (
            <div className="rounded-lg bg-[#191c1f] border border-[#292d30] p-5 space-y-4">
              <div className="border-b border-[#262a2d] pb-3">
                <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-[#46cbb5]" />
                  <span>Modular Blocks &amp; Section Toggles</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Toggle which functional cards, self-service features, and widgets are displayed to customers.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    key: 'showConnectedDevices' as const,
                    title: 'Workstation Seat Self-Service Unbinding',
                    desc: 'Allow end-users to unbind inactive computers directly to free license seats.',
                    icon: Laptop,
                    badge: 'Device Management'
                  },
                  {
                    key: 'showOfflineCertDownload' as const,
                    title: 'Offline RSA-4096 (.lic) Certificate Generation',
                    desc: 'Allow users to download signed cryptographic .lic files for air-gapped workstations.',
                    icon: FileCheck2,
                    badge: 'Air-Gapped'
                  },
                  {
                    key: 'showLinkedOrders' as const,
                    title: 'Linked Checkout Invoices & Purchase Orders',
                    desc: 'Display matched orders from Stripe, Lemon Squeezy, and Shopify.',
                    icon: ShoppingBag,
                    badge: 'E-Commerce'
                  },
                  {
                    key: 'showDemoPills' as const,
                    title: 'Demo Customer Account Quick Pills',
                    desc: 'Convenient one-click demo email pills for immediate trial testing.',
                    icon: Sparkles,
                    badge: 'Testing & Demo'
                  },
                  {
                    key: 'showRecoveryGuide' as const,
                    title: '3-Step Recovery Guide Widget',
                    desc: 'Explains how cryptographic license matching works in 3 clear steps.',
                    icon: ShieldCheck,
                    badge: 'Explainer'
                  },
                  {
                    key: 'showFaqSection' as const,
                    title: 'Customer FAQ Accordion Section',
                    desc: 'Collapsible questions and answers for self-service problem resolution.',
                    icon: HelpCircle,
                    badge: 'Knowledge'
                  },
                  {
                    key: 'showTroubleshootingCard' as const,
                    title: 'Troubleshooting Tips on Empty Search',
                    desc: 'Helpful guidance when a customer searches for an unassigned email.',
                    icon: HelpCircle,
                    badge: 'Guidance'
                  }
                ].map(item => {
                  const Icon = item.icon;
                  const isChecked = portalConfig[item.key];
                  return (
                    <label
                      key={item.key}
                      className={`flex items-start justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                        isChecked 
                          ? 'bg-[#052535] border-[#303438]' 
                          : 'bg-[#151719] border-[#262a2d] opacity-75'
                      }`}
                    >
                      <div className="flex items-start space-x-3 pr-4">
                        <div className={`p-2 rounded-md ${isChecked ? 'bg-[#073347] text-[#46cbb5]' : 'bg-[#03141c] text-slate-500'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white">{item.title}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#0b0d0f] text-slate-400 border border-[#303438]">
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{item.desc}</p>
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => updatePortalConfig({ [item.key]: e.target.checked })}
                        className="mt-1 w-4 h-4 rounded text-[#2db39f] focus:ring-[#2db39f] bg-[#101214] border-slate-700 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Announcement Banner */}
          {activeEditorTab === 'announcement' && (
            <div className="rounded-lg bg-[#191c1f] border border-[#292d30] p-5 space-y-4">
              <div className="border-b border-[#262a2d] pb-3">
                <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                  <Megaphone className="w-4 h-4 text-[#46cbb5]" />
                  <span>Announcement Banner Settings</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Display high-visibility notices, version release alerts, or scheduled maintenance messages.
                </p>
              </div>

              <label className="flex items-center justify-between p-3 rounded-lg bg-[#151719] border border-[#303438] cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-white">Enable Top Announcement Banner</span>
                  <p className="text-[11px] text-slate-400">Shows an eye-catching banner at the top of the customer portal</p>
                </div>
                <input
                  type="checkbox"
                  checked={portalConfig.showAnnouncementBanner}
                  onChange={e => updatePortalConfig({ showAnnouncementBanner: e.target.checked })}
                  className="w-4 h-4 rounded text-[#2db39f] focus:ring-[#2db39f] bg-[#101214] border-slate-700 cursor-pointer"
                />
              </label>

              {portalConfig.showAnnouncementBanner && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Banner Notice Type</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'info' as const, label: 'Information', color: 'border-[#46cbb5] text-[#46cbb5]' },
                        { id: 'success' as const, label: 'Success / Deal', color: 'border-[#10b981] text-[#10b981]' },
                        { id: 'warning' as const, label: 'Warning', color: 'border-[#f59e0b] text-[#f59e0b]' },
                        { id: 'alert' as const, label: 'Critical Alert', color: 'border-[#f43f5e] text-[#f43f5e]' },
                      ].map(type => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => updatePortalConfig({ announcementType: type.id })}
                          className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border text-center transition-all cursor-pointer ${
                            portalConfig.announcementType === type.id
                              ? `bg-[#191c1f] ${type.color} font-bold`
                              : 'bg-[#151719] border-[#303438] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Announcement Text</label>
                    <textarea
                      rows={2}
                      value={portalConfig.announcementText}
                      onChange={e => updatePortalConfig({ announcementText: e.target.value })}
                      placeholder="e.g. 🚀 Version 4.2.0 Engine Update released! Download offline license files below."
                      className="w-full px-3 py-2 rounded-md bg-[#151719] border border-[#303438] text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#2db39f]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: FAQ Content Manager */}
          {activeEditorTab === 'faqs' && (
            <div className="rounded-lg bg-[#191c1f] border border-[#292d30] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#262a2d] pb-3">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                    <HelpCircle className="w-4 h-4 text-[#46cbb5]" />
                    <span>Frequently Asked Questions ({portalConfig.faqs.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Manage the accordion FAQs available on the public customer front page.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddFaqForm(!showAddFaqForm)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-white bg-[#2db39f] hover:bg-[#279b89] transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add FAQ</span>
                </button>
              </div>

              {/* Add FAQ Form */}
              {showAddFaqForm && (
                <form onSubmit={handleAddFaq} className="p-4 rounded-lg bg-[#151719] border border-[#2db39f]/50 space-y-3">
                  <h4 className="text-xs font-bold text-[#46cbb5]">New FAQ Question &amp; Answer</h4>
                  
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Question</label>
                    <input
                      type="text"
                      placeholder="e.g. How do I transfer a license to a replacement laptop?"
                      value={newFaqQuestion}
                      onChange={e => setNewFaqQuestion(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md bg-[#101214] border border-[#303438] text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#2db39f]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Answer</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. In the connected devices section, click Unbind Seat on the old laptop, then enter the key on your new computer."
                      value={newFaqAnswer}
                      onChange={e => setNewFaqAnswer(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md bg-[#101214] border border-[#303438] text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#2db39f]"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddFaqForm(false)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-md text-xs font-bold text-white bg-[#2db39f] hover:bg-[#279b89]"
                    >
                      Save FAQ Item
                    </button>
                  </div>
                </form>
              )}

              {/* Existing FAQs List */}
              <div className="space-y-3">
                {portalConfig.faqs.map((faq, index) => (
                  <div
                    key={faq.id}
                    className="p-3.5 rounded-lg bg-[#151719] border border-[#303438] space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <input
                        type="text"
                        value={faq.question}
                        onChange={e => handleUpdateFaq(faq.id, e.target.value, faq.answer)}
                        className="w-full bg-[#101214] px-2.5 py-1.5 rounded font-bold text-white text-xs border border-[#262a2d] focus:border-[#2db39f]"
                      />
                      <button
                        onClick={() => handleDeleteFaq(faq.id)}
                        className="p-1.5 rounded text-rose-400 hover:text-white hover:bg-rose-950/60 transition-colors shrink-0"
                        title="Delete FAQ Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={faq.answer}
                      onChange={e => handleUpdateFaq(faq.id, faq.question, e.target.value)}
                      className="w-full bg-[#101214] px-2.5 py-1.5 rounded text-slate-300 text-xs border border-[#262a2d] focus:border-[#2db39f]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 5: Support & Footer */}
          {activeEditorTab === 'support' && (
            <div className="rounded-lg bg-[#191c1f] border border-[#292d30] p-5 space-y-4">
              <div className="border-b border-[#262a2d] pb-3">
                <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                  <Link2 className="w-4 h-4 text-[#46cbb5]" />
                  <span>Support Contacts &amp; Footer Text</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure help links and copyright notices for your customers.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Customer Support Desk Email</label>
                  <input
                    type="email"
                    value={portalConfig.supportEmail}
                    onChange={e => updatePortalConfig({ supportEmail: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-[#151719] border border-[#303438] text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#2db39f]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Documentation / User Guide URL</label>
                  <input
                    type="url"
                    value={portalConfig.documentationUrl}
                    onChange={e => updatePortalConfig({ documentationUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-[#151719] border border-[#303438] text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#2db39f]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Terms of Service URL</label>
                  <input
                    type="url"
                    value={portalConfig.termsUrl}
                    onChange={e => updatePortalConfig({ termsUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-[#151719] border border-[#303438] text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#2db39f]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Footer Copyright &amp; Legal Notice</label>
                  <textarea
                    rows={2}
                    value={portalConfig.footerCopyrightText}
                    onChange={e => updatePortalConfig({ footerCopyrightText: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-[#151719] border border-[#303438] text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#2db39f]"
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Live Interactive Sandbox Preview */}
        {showLivePreview && (
          <div className="lg:col-span-6 space-y-3">
            
            {/* Preview Frame Controls */}
            <div className="p-3 rounded-lg bg-[#191c1f] border border-[#292d30] flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                <span className="text-xs font-bold text-slate-200">Live Customer Viewport Preview</span>
              </div>

              {/* Viewport Width Switchers */}
              <div className="flex items-center space-x-1.5 bg-[#0a0c0e] p-1 rounded-md border border-[#262a2d]">
                <button
                  type="button"
                  onClick={() => setPreviewViewport('desktop')}
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    previewViewport === 'desktop'
                      ? 'bg-[#2db39f] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Desktop View"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('tablet')}
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    previewViewport === 'tablet'
                      ? 'bg-[#2db39f] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Tablet View"
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('mobile')}
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    previewViewport === 'mobile'
                      ? 'bg-[#2db39f] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Mobile View"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Scrollable Canvas Frame */}
            <div className="rounded-lg bg-[#020e14] border border-[#292d30] p-2 shadow-2xl overflow-hidden flex justify-center">
              <div 
                className={`transition-all duration-300 max-h-[720px] overflow-y-auto rounded-md border border-[#262a2d] bg-[#0b0d0f] p-3 sm:p-4 ${
                  previewViewport === 'mobile' 
                    ? 'w-[375px]' 
                    : previewViewport === 'tablet' 
                    ? 'w-[720px]' 
                    : 'w-full'
                }`}
              >
                <CustomerFrontPage 
                  onTestInSimulator={onTestInSimulator}
                  isEmbeddedPreview={true}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Changes in the left editor update this viewport in real-time.</span>
              <button
                onClick={onLaunchStandalonePage}
                className="text-[#46cbb5] hover:underline font-semibold flex items-center space-x-1"
              >
                <span>Open Full Page Alone</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
