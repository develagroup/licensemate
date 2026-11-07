import React, { useState, useMemo } from 'react';
import { 
  Package, 
  GitBranch, 
  Clock, 
  ToggleLeft, 
  ToggleRight, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Copy, 
  Edit3, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  Zap, 
  RefreshCw, 
  Check, 
  X, 
  Sliders, 
  Sparkles, 
  KeyRound, 
  Terminal
} from 'lucide-react';
import { useLicense } from '../context/LicenseContext';
import { useAuth } from '../context/AuthContext';
import { 
  SoftwareProduct, 
  ProductVersion, 
  TrialPolicy, 
  ProductFeature, 
  License, 
  ProductCategory, 
  ReleaseChannel, 
  FeatureCategory,
  LicensePlan 
} from '../types';

type AdminTab = 'products' | 'versions' | 'trials' | 'features';

export const AdminProductManager: React.FC = () => {
  const { isManager } = useAuth();
  const { 
    products, 
    productVersions, 
    trialPolicies, 
    productFeatures, 
    licenses,
    addProduct, 
    updateProduct, 
    deleteProduct, 
    duplicateProduct,
    addProductVersion,
    updateProductVersion,
    deleteProductVersion,
    setMinSupportedVersion,
    setLatestVersion,
    checkVersionCompatibility,
    updateTrialPolicy,
    generateTrialLicense,
    addProductFeature,
    updateProductFeature,
    deleteProductFeature,
    toggleLicenseFeatureAddon
  } = useLicense();

  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || 'prod_devflow_01');

  // Modal / Form States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SoftwareProduct | null>(null);
  
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<ProductVersion | null>(null);

  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<ProductFeature | null>(null);

  // Version Matrix Compatibility Tester State
  const [testerClientVer, setTesterClientVer] = useState('v3.8.2');
  const [testerOS, setTesterOS] = useState<'macOS' | 'Windows' | 'Linux' | 'iOS' | 'Android' | 'Server'>('macOS');
  const [testResult, setTestResult] = useState<any>(null);

  // 1-Click Trial Generator State
  const [trialUserEmail, setTrialUserEmail] = useState('evaluator.test@company.io');
  const [trialUserName, setTrialUserName] = useState('Alex Chen');
  const [trialHardwareFp, setTrialHardwareFp] = useState('hw_mac_8f99a1bc');
  const [generatedTrialResult, setGeneratedTrialResult] = useState<{ license: License; policy: TrialPolicy } | null>(null);
  const [isGeneratingTrial, setIsGeneratingTrial] = useState(false);

  // Feature Add-on Live Toggler State
  const [selectedLicenseForEntitlements, setSelectedLicenseForEntitlements] = useState<string>(licenses[0]?.id || '');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Selected Product Reference
  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || products[0];
  }, [products, selectedProductId]);

  // Filtered Lists
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const currentProductVersions = useMemo(() => {
    if (!selectedProduct) return [];
    return productVersions.filter(v => v.productId === selectedProduct.id);
  }, [productVersions, selectedProduct]);

  const currentProductTrialPolicy = useMemo(() => {
    if (!selectedProduct) return null;
    return trialPolicies.find(t => t.productId === selectedProduct.id) || null;
  }, [trialPolicies, selectedProduct]);

  const currentProductFeatures = useMemo(() => {
    if (!selectedProduct) return [];
    return productFeatures.filter(f => f.productId === selectedProduct.id);
  }, [productFeatures, selectedProduct]);

  const activeCustomerLicense = useMemo(() => {
    return licenses.find(l => l.id === selectedLicenseForEntitlements) || licenses[0];
  }, [licenses, selectedLicenseForEntitlements]);

  // Product Form state
  const [productForm, setProductForm] = useState({
    name: '',
    slug: '',
    description: '',
    category: 'Developer Tools' as ProductCategory,
    keyPrefix: 'LIC',
    iconName: 'Package',
    colorTheme: 'indigo',
    supportedPlatforms: ['macOS', 'Windows', 'Linux'] as ('macOS' | 'Windows' | 'Linux' | 'iOS' | 'Android' | 'Server' | 'Web')[],
    pricingTiers: {
      starter: 49,
      pro: 149,
      enterprise: 499,
      lifetime: 999
    },
    defaultSeatLimits: {
      starter: 1,
      pro: 5,
      enterprise: 25,
      lifetime: 3
    },
    status: 'active' as 'active' | 'beta' | 'deprecated'
  });

  // Version Form state
  const [versionForm, setVersionForm] = useState({
    version: 'v',
    releaseChannel: 'stable' as ReleaseChannel,
    releaseDate: new Date().toISOString().split('T')[0],
    isMinSupported: false,
    isLatest: false,
    isDeprecated: false,
    sunsetDate: '',
    minOsRequirements: {
      macOS: '12.0+',
      Windows: '10+',
      Linux: 'Kernel 5.4+'
    },
    downloadUrl: '',
    binaryChecksum: '',
    changelogSummary: '',
    criticalSecurityPatch: false
  });

  // Feature Form state
  const [featureForm, setFeatureForm] = useState({
    featureKey: '',
    name: '',
    description: '',
    category: 'Core' as FeatureCategory,
    isModularAddOn: true,
    defaultPlans: ['pro', 'enterprise'] as LicensePlan[],
    monthlyAddonPrice: 29,
    annualAddonPrice: 290,
    trialAllowed: true,
    requiresMinVersion: 'v1.0.0'
  });

  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(identifier);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Open Product Modal
  const openNewProductModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      slug: '',
      description: '',
      category: 'Developer Tools',
      keyPrefix: 'QNT',
      iconName: 'Package',
      colorTheme: 'indigo',
      supportedPlatforms: ['macOS', 'Windows', 'Linux'],
      pricingTiers: {
        starter: 49,
        pro: 149,
        enterprise: 499,
        lifetime: 999
      },
      defaultSeatLimits: {
        starter: 1,
        pro: 5,
        enterprise: 25,
        lifetime: 3
      },
      status: 'active'
    });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod: SoftwareProduct) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      slug: prod.slug,
      description: prod.description,
      category: prod.category,
      keyPrefix: prod.keyPrefix,
      iconName: prod.iconName,
      colorTheme: prod.colorTheme,
      supportedPlatforms: [...prod.supportedPlatforms],
      pricingTiers: { ...prod.pricingTiers },
      defaultSeatLimits: { ...prod.defaultSeatLimits },
      status: prod.status
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name) return;

    const slug = productForm.slug || productForm.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const keyPrefix = (productForm.keyPrefix || productForm.name.slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (editingProduct) {
      await updateProduct(editingProduct.id, {
        ...productForm,
        slug,
        keyPrefix
      });
    } else {
      const created = await addProduct({
        ...productForm,
        slug,
        keyPrefix
      });
      setSelectedProductId(created.id);
    }
    setIsProductModalOpen(false);
  };

  // Open Version Modal
  const openNewVersionModal = () => {
    setEditingVersion(null);
    setVersionForm({
      version: 'v',
      releaseChannel: 'stable',
      releaseDate: new Date().toISOString().split('T')[0],
      isMinSupported: false,
      isLatest: true,
      isDeprecated: false,
      sunsetDate: '',
      minOsRequirements: {
        macOS: '12.0+',
        Windows: '10+',
        Linux: 'Kernel 5.4+'
      },
      downloadUrl: 'https://downloads.licensepulse.io/latest',
      binaryChecksum: '',
      changelogSummary: 'Optimized cryptographic handshake and resolved connection timeout.',
      criticalSecurityPatch: false
    });
    setIsVersionModalOpen(true);
  };

  const openEditVersionModal = (v: ProductVersion) => {
    setEditingVersion(v);
    setVersionForm({
      version: v.version,
      releaseChannel: v.releaseChannel,
      releaseDate: v.releaseDate ? v.releaseDate.split('T')[0] : new Date().toISOString().split('T')[0],
      isMinSupported: v.isMinSupported,
      isLatest: v.isLatest,
      isDeprecated: v.isDeprecated,
      sunsetDate: v.sunsetDate || '',
      minOsRequirements: {
        macOS: v.minOsRequirements?.macOS || '12.0+',
        Windows: v.minOsRequirements?.Windows || '10+',
        Linux: v.minOsRequirements?.Linux || 'Kernel 5.4+',
        ...(v.minOsRequirements || {})
      },
      downloadUrl: v.downloadUrl || 'https://downloads.licensepulse.io/latest',
      binaryChecksum: v.binaryChecksum || '',
      changelogSummary: v.changelogSummary || '',
      criticalSecurityPatch: v.criticalSecurityPatch || false
    });
    setIsVersionModalOpen(true);
  };

  const handleSaveVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionForm.version || !selectedProduct) return;

    if (editingVersion) {
      await updateProductVersion(editingVersion.id, {
        ...versionForm,
        productId: selectedProduct.id
      });
    } else {
      await addProductVersion({
        ...versionForm,
        productId: selectedProduct.id
      });
    }
    setIsVersionModalOpen(false);
  };

  // Open Feature Modal
  const openNewFeatureModal = () => {
    setEditingFeature(null);
    setFeatureForm({
      featureKey: '',
      name: '',
      description: '',
      category: 'Core',
      isModularAddOn: true,
      defaultPlans: ['pro', 'enterprise'],
      monthlyAddonPrice: 29,
      annualAddonPrice: 290,
      trialAllowed: true,
      requiresMinVersion: 'v1.0.0'
    });
    setIsFeatureModalOpen(true);
  };

  const openEditFeatureModal = (feat: ProductFeature) => {
    setEditingFeature(feat);
    setFeatureForm({
      featureKey: feat.featureKey,
      name: feat.name,
      description: feat.description,
      category: feat.category,
      isModularAddOn: feat.isModularAddOn,
      defaultPlans: [...feat.defaultPlans],
      monthlyAddonPrice: feat.monthlyAddonPrice,
      annualAddonPrice: feat.annualAddonPrice,
      trialAllowed: feat.trialAllowed,
      requiresMinVersion: feat.requiresMinVersion || 'v1.0.0'
    });
    setIsFeatureModalOpen(true);
  };

  const handleSaveFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureForm.featureKey || !featureForm.name || !selectedProduct) return;

    const cleanKey = featureForm.featureKey.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    if (editingFeature) {
      await updateProductFeature(editingFeature.id, {
        ...featureForm,
        featureKey: cleanKey,
        productId: selectedProduct.id
      });
    } else {
      await addProductFeature({
        ...featureForm,
        featureKey: cleanKey,
        productId: selectedProduct.id
      });
    }
    setIsFeatureModalOpen(false);
  };

  // Run Matrix Compatibility Test
  const handleRunCompatibilityTest = () => {
    if (!selectedProduct) return;
    const result = checkVersionCompatibility(selectedProduct.id, testerClientVer, testerOS);
    setTestResult(result);
  };

  // Run 1-Click Trial Generation
  const handleGenerateTrial = async () => {
    if (!selectedProduct || !trialUserEmail) return;
    setIsGeneratingTrial(true);
    try {
      const result = await generateTrialLicense(
        selectedProduct.id,
        trialUserEmail,
        trialUserName,
        {
          hardwareFingerprint: trialHardwareFp,
          customDurationDays: currentProductTrialPolicy?.trialDurationDays || 14
        }
      );
      setGeneratedTrialResult(result);
    } finally {
      setIsGeneratingTrial(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Banner Header */}
      <div className="rounded-xl bg-[#191c1f] border border-[#292d30] p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Package className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Software Products &amp; Matrix Engine</h1>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                ADMIN CONSOLE
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Define multi-tier desktop &amp; server software products, maintain minimum-supported version matrices, configure self-expiring 14-day trial policies, and toggle modular feature entitlements in real time.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={openNewProductModal}
              id="admin-create-product-btn"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Product</span>
            </button>
          </div>
        </div>

        {/* Global Catalog Snapshot Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#262a2d]">
          <div className="p-3 bg-[#151719] border border-[#262a2d] rounded-lg">
            <span className="text-xs text-slate-400 font-mono">Total Products</span>
            <p className="text-xl sm:text-2xl font-bold text-white mt-0.5">{products.length}</p>
          </div>
          <div className="p-3 bg-[#151719] border border-[#262a2d] rounded-lg">
            <span className="text-xs text-slate-400 font-mono">Active Versions</span>
            <p className="text-xl sm:text-2xl font-bold text-cyan-300 mt-0.5">{productVersions.length}</p>
          </div>
          <div className="p-3 bg-[#151719] border border-[#262a2d] rounded-lg">
            <span className="text-xs text-slate-400 font-mono">Trial Rules Configured</span>
            <p className="text-xl sm:text-2xl font-bold text-emerald-400 mt-0.5">{trialPolicies.length}</p>
          </div>
          <div className="p-3 bg-[#151719] border border-[#262a2d] rounded-lg">
            <span className="text-xs text-slate-400 font-mono">Modular Add-ons</span>
            <p className="text-xl sm:text-2xl font-bold text-cyan-200 mt-0.5">{productFeatures.length}</p>
          </div>
        </div>
      </div>

      {/* Admin Module Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#262a2d] pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('products')}
          id="tab-admin-products"
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'products'
              ? 'bg-[#151719] text-cyan-300 border border-cyan-500/30 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-[#191c1f] border border-transparent'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Software Catalog ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('versions')}
          id="tab-admin-versions"
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'versions'
              ? 'bg-[#151719] text-cyan-300 border border-cyan-500/30 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-[#191c1f] border border-transparent'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>Version Matrices &amp; Enforcements</span>
        </button>

        <button
          onClick={() => setActiveTab('trials')}
          id="tab-admin-trials"
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'trials'
              ? 'bg-[#151719] text-cyan-300 border border-cyan-500/30 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-[#191c1f] border border-transparent'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Trial Rules &amp; Self-Expiring Engine</span>
        </button>

        <button
          onClick={() => setActiveTab('features')}
          id="tab-admin-features"
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'features'
              ? 'bg-[#151719] text-cyan-300 border border-cyan-500/30 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-[#191c1f] border border-transparent'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Modular Feature Add-on Toggles</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: SOFTWARE PRODUCTS CATALOG
          ========================================================================= */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Search and Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products, key prefixes, slugs..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Showing <span className="font-semibold text-cyan-300">{filteredProducts.length}</span> registered products
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(prod => {
              const prodVers = productVersions.filter(v => v.productId === prod.id);
              const prodFeats = productFeatures.filter(f => f.productId === prod.id);
              const trialRule = trialPolicies.find(t => t.productId === prod.id);
              const activeLics = licenses.filter(l => l.productName.toLowerCase() === prod.name.toLowerCase() || l.productSlug === prod.slug);
              const latestVer = prodVers.find(v => v.isLatest)?.version || 'v1.0.0';
              const minVer = prodVers.find(v => v.isMinSupported)?.version || 'v1.0.0';

              return (
                <div 
                  key={prod.id}
                  id={`product-card-${prod.id}`}
                  className="rounded-xl border border-[#292d30] bg-[#191c1f] p-5 shadow-sm hover:border-cyan-500/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Icon & Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-[#151719] border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-white leading-tight">{prod.name}</h3>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-xs text-slate-400 font-mono">
                              prefix: <span className="text-cyan-300 font-semibold">{prod.keyPrefix}-*</span>
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#101214] border border-[#262a2d] text-slate-300 font-mono">
                              {prod.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono border ${
                        prod.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : prod.status === 'beta'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {prod.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-3 line-clamp-2">
                      {prod.description}
                    </p>

                    {/* Metadata Badges */}
                    <div className="grid grid-cols-2 gap-2 mt-4 p-3 rounded-lg bg-[#151719] border border-[#262a2d] text-xs font-mono">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Current / Min Ver</span>
                        <span className="font-semibold text-white">
                          {latestVer} <span className="text-slate-500">/</span> {minVer}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Pricing Tiers</span>
                        <span className="font-semibold text-cyan-300">
                          ${prod.pricingTiers?.starter || 49} - ${prod.pricingTiers?.enterprise || 499}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Trial Policy</span>
                        <span className="font-semibold text-emerald-400">
                          {trialRule?.trialDurationDays || 14}-Day Eval
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Active Licenses</span>
                        <span className="font-semibold text-white">
                          {activeLics.length} active
                        </span>
                      </div>
                    </div>

                    {/* Platforms */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {prod.supportedPlatforms.map(os => (
                        <span key={os} className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[#101214] border border-[#262a2d] text-slate-300">
                          {os}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 pt-4 border-t border-[#262a2d] flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedProductId(prod.id);
                          setActiveTab('versions');
                        }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline font-medium flex items-center space-x-1 cursor-pointer"
                      >
                        <GitBranch className="w-3.5 h-3.5" />
                        <span>{prodVers.length} Versions</span>
                      </button>
                      <span className="text-slate-600">•</span>
                      <button
                        onClick={() => {
                          setSelectedProductId(prod.id);
                          setActiveTab('features');
                        }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline font-medium flex items-center space-x-1 cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{prodFeats.length} Add-ons</span>
                      </button>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => duplicateProduct(prod.id)}
                        title="Duplicate Product Blueprint"
                        className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-[#292d30] transition-colors cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditProductModal(prod)}
                        title="Edit Product"
                        className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-[#292d30] transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${prod.name}" and all associated matrices?`)) {
                            deleteProduct(prod.id);
                          }
                        }}
                        title="Delete Product"
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-white/5 border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: VERSION MATRICES & COMPATIBILITY ENFORCEMENT
          ========================================================================= */}
      {activeTab === 'versions' && (
        <div className="space-y-6">
          {/* Product Selector Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#191c1f] border border-[#292d30]">
            <div className="flex items-center space-x-3">
              <label className="text-xs font-semibold text-slate-400 font-mono">Target Product:</label>
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#292d30] bg-[#101214] text-xs font-semibold text-white focus:outline-none"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={openNewVersionModal}
              id="admin-add-version-btn"
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Publish Version to Matrix</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Version List & Rules Table */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-xl border border-[#292d30] bg-[#191c1f] overflow-hidden shadow-sm">
                <div className="p-4 border-b border-[#262a2d] flex items-center justify-between bg-[#151719]">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {selectedProduct?.name} — Active Release Matrix
                    </h3>
                    <p className="text-xs text-slate-400">
                      Enforce backward compatibility boundaries. Clients below minimum supported version will receive mandatory update prompts.
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-md font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    Min Req: {currentProductVersions.find(v => v.isMinSupported)?.version || 'v1.0.0'}
                  </span>
                </div>

                <div className="divide-y divide-[#262a2d]">
                  {currentProductVersions.map(ver => {
                    return (
                      <div key={ver.id} className="p-4 hover:bg-[#151719]/60 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-base font-bold font-mono text-white">
                                {ver.version}
                              </span>

                              {/* Badges */}
                              {ver.isLatest && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  LATEST
                                </span>
                              )}
                              {ver.isMinSupported && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                                  MIN SUPPORTED
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono border border-[#262a2d] bg-[#101214] text-slate-300 uppercase">
                                {ver.releaseChannel}
                              </span>
                              {ver.criticalSecurityPatch && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center font-mono">
                                  <AlertTriangle className="w-3 h-3 mr-1" /> Security Patch
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono">
                              <span>Released: {ver.releaseDate.split('T')[0]}</span>
                              <span>•</span>
                              <span>OS: {Object.keys(ver.minOsRequirements || {}).join(', ') || 'All Platforms'}</span>
                            </div>

                            {/* Changelog Summary */}
                            {ver.changelogSummary && (
                              <p className="text-xs text-slate-300 mt-1">
                                {ver.changelogSummary}
                              </p>
                            )}
                          </div>

                          {/* Quick Matrix Action Buttons */}
                          <div className="flex sm:flex-col items-end gap-1.5 shrink-0">
                            {!ver.isLatest && (
                              <button
                                onClick={() => setLatestVersion(selectedProduct.id, ver.id)}
                                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#151719] text-cyan-300 hover:bg-[#151719] border border-cyan-500/30 transition-colors cursor-pointer"
                              >
                                Set as Latest
                              </button>
                            )}
                            {!ver.isMinSupported && (
                              <button
                                onClick={() => setMinSupportedVersion(selectedProduct.id, ver.id)}
                                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#151719] text-cyan-300 hover:bg-[#151719] border border-cyan-500/30 transition-colors cursor-pointer"
                              >
                                Set as Minimum
                              </button>
                            )}
                            <div className="flex items-center space-x-1 pt-1">
                              <button
                                onClick={() => openEditVersionModal(ver)}
                                className="p-1 rounded-md text-slate-400 hover:text-white cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteProductVersion(ver.id)}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Interactive Live Client Version Compatibility Tester */}
            <div className="space-y-4">
              <div className="rounded-xl border border-[#292d30] bg-[#191c1f] p-5 shadow-sm">
                <div className="flex items-center space-x-2 text-cyan-400 mb-2">
                  <Terminal className="w-4 h-4" />
                  <h3 className="text-sm font-bold font-mono text-white">Client Handshake Simulator</h3>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Simulate a client daemon initiating license validation with a specific build version and OS.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1 font-mono">
                      Client Build Version
                    </label>
                    <input
                      type="text"
                      value={testerClientVer}
                      onChange={e => setTesterClientVer(e.target.value)}
                      placeholder="e.g. v3.8.0 or v4.2.1"
                      className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1 font-mono">
                      Client Operating System
                    </label>
                    <select
                      value={testerOS}
                      onChange={e => setTesterOS(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="macOS">macOS (Apple Silicon / Intel)</option>
                      <option value="Windows">Windows (x64 / ARM64)</option>
                      <option value="Linux">Linux (Ubuntu / RHEL / Alpine)</option>
                      <option value="Server">Enterprise Server (RHEL / Debian)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleRunCompatibilityTest}
                    id="btn-run-compat-test"
                    className="w-full py-2.5 rounded-lg bg-[#151719] hover:bg-[#0c475f] border border-cyan-500/30 text-cyan-300 text-xs font-bold shadow-sm transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Evaluate Matrix Handshake</span>
                  </button>

                  {/* Evaluation Result Output */}
                  {testResult && (
                    <div className={`mt-4 p-4 rounded-lg border text-xs ${
                      testResult.compatible
                        ? testResult.status === 'outdated_recommended'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    }`}>
                      <div className="flex items-center space-x-2 font-bold mb-1 font-mono">
                        {testResult.compatible ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                        )}
                        <span className="uppercase">{testResult.status.replace('_', ' ')}</span>
                      </div>
                      <p className="mt-1 leading-relaxed text-slate-300">{testResult.message}</p>
                      <div className="mt-3 pt-2 border-t border-[#262a2d] flex justify-between text-[11px] font-mono text-slate-400">
                        <span>Min Req: {testResult.minRequired}</span>
                        <span>Latest: {testResult.latest}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: TRIAL RULES & SELF-EXPIRING ENGINE
          ========================================================================= */}
      {activeTab === 'trials' && currentProductTrialPolicy && (
        <div className="space-y-6">
          {/* Target Product Picker */}
          <div className="flex items-center space-x-3 p-4 rounded-xl bg-[#191c1f] border border-[#292d30]">
            <label className="text-xs font-semibold text-slate-400 font-mono">Target Product:</label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#292d30] bg-[#101214] text-xs font-semibold text-white focus:outline-none"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trial Policy Rules Form */}
            <div className="lg:col-span-2 rounded-xl border border-[#292d30] bg-[#191c1f] p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <span>Evaluation &amp; Self-Expiring Trial Rules for {selectedProduct?.name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Configure trial duration limits, hardware binding restrictions, and feature gating for unverified evaluators.
                </p>
              </div>

              <div className="space-y-4">
                {/* 14-Day Duration Slider & Input */}
                <div className="p-4 rounded-lg bg-[#151719] border border-[#262a2d]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-white font-mono">
                      Trial Evaluation Duration
                    </label>
                    <span className="text-sm font-bold text-cyan-300 font-mono bg-[#101214] px-2.5 py-0.5 border border-cyan-500/30 rounded-md">
                      {currentProductTrialPolicy.trialDurationDays} Days
                    </span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="60"
                    step="1"
                    value={currentProductTrialPolicy.trialDurationDays}
                    onChange={e => updateTrialPolicy(selectedProduct.id, { trialDurationDays: parseInt(e.target.value, 10) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-1">
                    <span>3 Days</span>
                    <span className="text-cyan-300 font-bold">14 Days (Standard)</span>
                    <span>30 Days (PoC)</span>
                    <span>60 Days</span>
                  </div>
                </div>

                {/* Toggles Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Auto-Expire Hard Block */}
                  <div 
                    onClick={() => updateTrialPolicy(selectedProduct.id, { selfExpiring: !currentProductTrialPolicy.selfExpiring })}
                    className="p-4 rounded-lg border border-[#262a2d] bg-[#151719] hover:border-cyan-500/40 cursor-pointer transition-all flex items-start justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">Self-Expiring Hard Lockout</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Revokes daemon authorization immediately upon trial date expiry.</p>
                    </div>
                    {currentProductTrialPolicy.selfExpiring ? (
                      <ToggleRight className="w-6 h-6 text-cyan-400 shrink-0" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-600 shrink-0" />
                    )}
                  </div>

                  {/* Email Verification Required */}
                  <div 
                    onClick={() => updateTrialPolicy(selectedProduct.id, { requireEmailVerification: !currentProductTrialPolicy.requireEmailVerification })}
                    className="p-4 rounded-lg border border-[#262a2d] bg-[#151719] hover:border-cyan-500/40 cursor-pointer transition-all flex items-start justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">Email Verification Required</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Prevents disposable emails from auto-generating trial keys.</p>
                    </div>
                    {currentProductTrialPolicy.requireEmailVerification ? (
                      <ToggleRight className="w-6 h-6 text-cyan-400 shrink-0" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-600 shrink-0" />
                    )}
                  </div>

                  {/* Grace Period Days */}
                  <div className="p-4 rounded-lg border border-[#262a2d] bg-[#151719] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Grace Period (Days)</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Extra days post-expiry before hard block.</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="14"
                      value={currentProductTrialPolicy.gracePeriodDays}
                      onChange={e => updateTrialPolicy(selectedProduct.id, { gracePeriodDays: parseInt(e.target.value, 10) || 0 })}
                      className="w-16 px-2 py-1 rounded-md border border-[#292d30] bg-[#101214] text-xs text-center font-bold text-white"
                    />
                  </div>

                  {/* Watermark / Evaluation Banner */}
                  <div 
                    onClick={() => updateTrialPolicy(selectedProduct.id, { watermarkOrThrottle: !currentProductTrialPolicy.watermarkOrThrottle })}
                    className="p-4 rounded-lg border border-[#262a2d] bg-[#151719] hover:border-cyan-500/40 cursor-pointer transition-all flex items-start justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">Watermark / Throttle Banner</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Instructs client UI to display evaluation watermark.</p>
                    </div>
                    {currentProductTrialPolicy.watermarkOrThrottle ? (
                      <ToggleRight className="w-6 h-6 text-cyan-400 shrink-0" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-600 shrink-0" />
                    )}
                  </div>
                </div>

                {/* Restricted Feature Add-ons Checkboxes */}
                <div>
                  <label className="text-xs font-bold text-white block mb-2 font-mono">
                    Restricted Feature Add-ons in Trial Mode (Excluded by default)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentProductFeatures.map(feat => {
                      const isRestricted = currentProductTrialPolicy.restrictedFeatures.includes(feat.featureKey);
                      return (
                        <label 
                          key={feat.featureKey}
                          className="flex items-center space-x-2 p-2.5 rounded-lg border border-[#262a2d] bg-[#151719] text-xs cursor-pointer hover:border-cyan-500/40"
                        >
                          <input
                            type="checkbox"
                            checked={isRestricted}
                            onChange={e => {
                              const updated = e.target.checked
                                ? [...currentProductTrialPolicy.restrictedFeatures, feat.featureKey]
                                : currentProductTrialPolicy.restrictedFeatures.filter(k => k !== feat.featureKey);
                              updateTrialPolicy(selectedProduct.id, { restrictedFeatures: updated });
                            }}
                            className="rounded-md accent-cyan-400"
                          />
                          <div className="flex-1">
                            <span className="font-semibold text-slate-200">{feat.name}</span>
                            <span className="text-[10px] text-slate-500 block font-mono">key: {feat.featureKey}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 1-Click Self-Serve Trial Provisioner & Test Generator */}
            <div className="space-y-4">
              <div className="rounded-xl border border-[#292d30] bg-[#191c1f] p-5 shadow-sm">
                <div className="flex items-center space-x-2 text-cyan-400 mb-2">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="text-sm font-bold font-mono text-white">1-Click Trial Key Generator</h3>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Generate and provision an instant {currentProductTrialPolicy.trialDurationDays}-day self-expiring evaluation license with the configured trial rules.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1 font-mono">
                      Evaluator Email
                    </label>
                    <input
                      type="email"
                      value={trialUserEmail}
                      onChange={e => setTrialUserEmail(e.target.value)}
                      placeholder="tester@company.com"
                      className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1 font-mono">
                      Evaluator Name
                    </label>
                    <input
                      type="text"
                      value={trialUserName}
                      onChange={e => setTrialUserName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1 font-mono">
                      Workstation Fingerprint (Optional)
                    </label>
                    <input
                      type="text"
                      value={trialHardwareFp}
                      onChange={e => setTrialHardwareFp(e.target.value)}
                      placeholder="hw_mac_8f99a1bc"
                      className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <button
                    onClick={handleGenerateTrial}
                    disabled={isGeneratingTrial || !trialUserEmail}
                    id="btn-issue-trial-license"
                    className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingTrial ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <KeyRound className="w-4 h-4" />
                    )}
                    <span>Issue {currentProductTrialPolicy.trialDurationDays}-Day Trial License</span>
                  </button>

                  {/* Generated Trial Output Result */}
                  {generatedTrialResult && (
                    <div className="mt-4 p-4 rounded-lg border border-cyan-500/30 bg-[#151719] text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400 flex items-center font-mono">
                          <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-400" /> Trial Ready
                        </span>
                        <button
                          onClick={() => handleCopy(generatedTrialResult.license.key, 'trial_key')}
                          className="px-2 py-0.5 rounded-md bg-[#151719] text-cyan-300 border border-cyan-500/30 font-mono text-[10px] cursor-pointer"
                        >
                          {copiedKey === 'trial_key' ? 'Copied!' : 'Copy Key'}
                        </button>
                      </div>

                      <div className="font-mono text-xs sm:text-sm font-bold text-cyan-200 bg-[#101214] p-2 rounded-lg border border-[#292d30] select-all">
                        {generatedTrialResult.license.key}
                      </div>

                      <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                        <p><strong>Expires:</strong> {new Date(generatedTrialResult.license.expiresAt!).toLocaleDateString()}</p>
                        <p><strong>Max Seats:</strong> {generatedTrialResult.license.maxDevices} device seat</p>
                        <p><strong>Features:</strong> {generatedTrialResult.license.features.join(', ')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: MODULAR FEATURE ADD-ON TOGGLES
          ========================================================================= */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          {/* Target Product Picker */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#191c1f] border border-[#292d30]">
            <div className="flex items-center space-x-3">
              <label className="text-xs font-semibold text-slate-400 font-mono">Target Product:</label>
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#292d30] bg-[#101214] text-xs font-semibold text-white focus:outline-none"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={openNewFeatureModal}
              id="admin-add-feature-btn"
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Modular Feature</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Feature Catalog Grid */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-xl border border-[#292d30] bg-[#191c1f] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#262a2d]">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Feature &amp; Entitlement Catalog ({currentProductFeatures.length})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Modular add-ons that can be toggled on customer licenses or bundled into specific pricing tiers.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentProductFeatures.map(feat => {
                    return (
                      <div 
                        key={feat.id}
                        className="p-4 rounded-xl border border-[#262a2d] bg-[#151719] hover:border-cyan-500/40 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-sm font-bold text-white">{feat.name}</h4>
                              <span className="text-[11px] font-mono text-cyan-400">
                                {feat.featureKey}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                              +${feat.monthlyAddonPrice}/mo
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 mt-2">
                            {feat.description}
                          </p>

                          {/* Plan Inclusion */}
                          <div className="mt-3 flex flex-wrap gap-1">
                            {feat.defaultPlans.map((plan: LicensePlan) => (
                              <span key={plan} className="px-1.5 py-0.5 rounded-md text-[10px] bg-[#101214] border border-[#292d30] text-slate-300 uppercase font-mono">
                                {plan}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#262a2d] flex items-center justify-between text-xs text-slate-400">
                          <span className="capitalize text-[11px] font-mono">Cat: {feat.category}</span>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => openEditFeatureModal(feat)}
                              className="p-1 text-slate-400 hover:text-white cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteProductFeature(feat.id)}
                              className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Customer Entitlement Toggler */}
            <div className="space-y-4">
              <div className="rounded-xl border border-[#292d30] bg-[#191c1f] p-5 shadow-sm">
                <div className="flex items-center space-x-2 text-cyan-400 mb-2">
                  <Sliders className="w-5 h-5" />
                  <h3 className="text-sm font-bold font-mono text-white">Live Customer Entitlement Toggler</h3>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Select an active customer license to instantly grant or revoke modular add-on capabilities without reissue.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1 font-mono">
                      Customer License Key
                    </label>
                    <select
                      value={selectedLicenseForEntitlements}
                      onChange={e => setSelectedLicenseForEntitlements(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    >
                      {licenses.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.key} ({l.userEmail}) - {l.productName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {activeCustomerLicense && (
                    <div className="p-3 rounded-lg bg-[#151719] border border-[#262a2d] text-xs space-y-1 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Customer:</span>
                        <span className="font-semibold text-white">{activeCustomerLicense.userName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tier:</span>
                        <span className="font-semibold uppercase text-cyan-300">{activeCustomerLicense.plan}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status:</span>
                        <span className="font-semibold text-emerald-400 uppercase">{activeCustomerLicense.status}</span>
                      </div>
                    </div>
                  )}

                  {/* Toggle Switch List */}
                  <div className="space-y-2 mt-4">
                    <label className="text-xs font-bold text-white block font-mono">
                      Active Entitlements:
                    </label>

                    {currentProductFeatures.map(feat => {
                      const isEnabled = activeCustomerLicense?.features?.includes(feat.featureKey) || false;
                      return (
                        <div
                          key={feat.featureKey}
                          onClick={() => {
                            if (activeCustomerLicense) {
                              toggleLicenseFeatureAddon(activeCustomerLicense.id, feat.featureKey, !isEnabled);
                            }
                          }}
                          className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                            isEnabled
                              ? 'bg-cyan-500/10 border-cyan-500/30'
                              : 'bg-[#151719] border-[#262a2d]'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-bold text-white">{feat.name}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">key: {feat.featureKey}</span>
                          </div>

                          {isEnabled ? (
                            <span className="inline-flex items-center text-xs font-bold text-emerald-400 font-mono">
                              <Check className="w-4 h-4 mr-1" /> ACTIVE
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 font-medium font-mono">
                              DISABLED
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: PRODUCT CREATE / EDIT
          ========================================================================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="rounded-xl bg-[#191c1f] border border-[#292d30] w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-[#262a2d] pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Package className="w-5 h-5 text-cyan-400" />
                <span>{editingProduct ? 'Edit Software Product' : 'Register New Software Product'}</span>
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1 font-mono">Product Name</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="e.g. QuantumIDE Studio Pro"
                    className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1 font-mono">Key Prefix (3-5 letters)</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={productForm.keyPrefix}
                    onChange={e => setProductForm({ ...productForm, keyPrefix: e.target.value.toUpperCase() })}
                    placeholder="e.g. QNT"
                    className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs font-mono text-white uppercase focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1 font-mono">Description</label>
                <textarea
                  rows={2}
                  value={productForm.description}
                  onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Describe software capabilities, target architecture, and enterprise features..."
                  className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1 font-mono">Category</label>
                  <select
                    value={productForm.category}
                    onChange={e => setProductForm({ ...productForm, category: e.target.value as ProductCategory })}
                    className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs text-white focus:outline-none"
                  >
                    <option value="Developer Tools">Developer Tools</option>
                    <option value="Security & Network">Security &amp; Network</option>
                    <option value="3D & Creative">3D &amp; Creative</option>
                    <option value="Database & Storage">Database &amp; Storage</option>
                    <option value="AI & Machine Learning">AI &amp; Machine Learning</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Productivity">Productivity</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1 font-mono">Starter ($/mo)</label>
                  <input
                    type="number"
                    value={productForm.pricingTiers.starter}
                    onChange={e => setProductForm({ 
                      ...productForm, 
                      pricingTiers: { ...productForm.pricingTiers, starter: parseInt(e.target.value, 10) || 0 } 
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1 font-mono">Enterprise ($/mo)</label>
                  <input
                    type="number"
                    value={productForm.pricingTiers.enterprise}
                    onChange={e => setProductForm({ 
                      ...productForm, 
                      pricingTiers: { ...productForm.pricingTiers, enterprise: parseInt(e.target.value, 10) || 0 } 
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[#262a2d]">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#292d30] text-slate-300 text-xs font-semibold cursor-pointer hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-sm cursor-pointer"
                >
                  {editingProduct ? 'Save Changes' : 'Register Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: VERSION CREATE / EDIT
          ========================================================================= */}
      {isVersionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="rounded-xl bg-[#191c1f] border border-[#292d30] w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#262a2d] pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <GitBranch className="w-5 h-5 text-cyan-400" />
                <span>{editingVersion ? 'Edit Release Version' : 'Publish Version to Matrix'}</span>
              </h3>
              <button onClick={() => setIsVersionModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVersion} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1 font-mono">Version String</label>
                  <input
                    type="text"
                    required
                    value={versionForm.version}
                    onChange={e => setVersionForm({ ...versionForm, version: e.target.value })}
                    placeholder="v4.2.0"
                    className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1 font-mono">Release Channel</label>
                  <select
                    value={versionForm.releaseChannel}
                    onChange={e => setVersionForm({ ...versionForm, releaseChannel: e.target.value as ReleaseChannel })}
                    className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs text-white focus:outline-none"
                  >
                    <option value="stable">Stable (Production)</option>
                    <option value="beta">Beta</option>
                    <option value="nightly">Nightly</option>
                    <option value="lts">LTS (Long-Term Support)</option>
                    <option value="sunset">Sunset (Blocked)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={versionForm.isLatest}
                    onChange={e => setVersionForm({ ...versionForm, isLatest: e.target.checked })}
                    className="rounded-md accent-cyan-400"
                  />
                  <span className="font-semibold text-slate-200">Set as Latest Release</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={versionForm.isMinSupported}
                    onChange={e => setVersionForm({ ...versionForm, isMinSupported: e.target.checked })}
                    className="rounded-md accent-cyan-400"
                  />
                  <span className="font-semibold text-slate-200">Set as Min Supported Boundary</span>
                </label>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1 font-mono">Changelog Summary</label>
                <textarea
                  rows={2}
                  value={versionForm.changelogSummary}
                  onChange={e => setVersionForm({ ...versionForm, changelogSummary: e.target.value })}
                  placeholder="Security patch, performance tuning, architecture update..."
                  className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[#262a2d]">
                <button
                  type="button"
                  onClick={() => setIsVersionModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#292d30] text-slate-300 text-xs font-semibold cursor-pointer hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer shadow-sm"
                >
                  Save Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: FEATURE ADD-ON CREATE / EDIT
          ========================================================================= */}
      {isFeatureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="rounded-xl bg-[#191c1f] border border-[#292d30] w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#262a2d] pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <span>{editingFeature ? 'Edit Feature Add-on' : 'Add Modular Feature Add-on'}</span>
              </h3>
              <button onClick={() => setIsFeatureModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFeature} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1 font-mono">Feature Name</label>
                  <input
                    type="text"
                    required
                    value={featureForm.name}
                    onChange={e => setFeatureForm({ ...featureForm, name: e.target.value })}
                    placeholder="e.g. AI Code Copilot"
                    className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1 font-mono">Unique Key</label>
                  <input
                    type="text"
                    required
                    value={featureForm.featureKey}
                    onChange={e => setFeatureForm({ ...featureForm, featureKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                    placeholder="ai_copilot"
                    className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1 font-mono">Description</label>
                <textarea
                  rows={2}
                  value={featureForm.description}
                  onChange={e => setFeatureForm({ ...featureForm, description: e.target.value })}
                  placeholder="Describe the entitlement capability..."
                  className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1 font-mono">Monthly Add-on Price ($)</label>
                  <input
                    type="number"
                    value={featureForm.monthlyAddonPrice}
                    onChange={e => setFeatureForm({ 
                      ...featureForm, 
                      monthlyAddonPrice: parseInt(e.target.value, 10) || 0,
                      annualAddonPrice: (parseInt(e.target.value, 10) || 0) * 10
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1 font-mono">Category</label>
                  <select
                    value={featureForm.category}
                    onChange={e => setFeatureForm({ ...featureForm, category: e.target.value as FeatureCategory })}
                    className="w-full px-3 py-2 rounded-lg border border-[#292d30] bg-[#101214] text-xs text-white focus:outline-none"
                  >
                    <option value="Core">Core</option>
                    <option value="AI & Intelligence">AI &amp; Intelligence</option>
                    <option value="Security & Compliance">Security &amp; Compliance</option>
                    <option value="Cloud & Sync">Cloud &amp; Sync</option>
                    <option value="Performance & Hardware">Performance &amp; Hardware</option>
                    <option value="Support & SLA">Support &amp; SLA</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[#262a2d]">
                <button
                  type="button"
                  onClick={() => setIsFeatureModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#292d30] text-slate-300 text-xs font-semibold cursor-pointer hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer shadow-sm"
                >
                  Save Feature
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
