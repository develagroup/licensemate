import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { 
  License, 
  AuditLog, 
  EmailNotification, 
  NotificationRule, 
  ValidationResponse, 
  LicenseStatus,
  LicenseEmailDelivery,
  ActivatedDevice,
  AuditAction,
  WebhookEndpoint,
  WebhookDeliveryLog,
  WebhookEventType,
  WebhookProvider,
  SoftwareProduct,
  ProductVersion,
  TrialPolicy,
  ProductFeature,
  PurchaseOrder,
  ProcessOrderParams,
  ProcessOrderResult,
  PortalConfig
} from '../types';
import { 
  INITIAL_NOTIFICATION_RULES,
  INITIAL_WEBHOOK_ENDPOINTS,
  INITIAL_WEBHOOK_DELIVERY_LOGS,
  INITIAL_PRODUCTS,
  INITIAL_PRODUCT_VERSIONS,
  INITIAL_TRIAL_POLICIES,
  INITIAL_PRODUCT_FEATURES,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_PORTAL_CONFIG
} from '../data/mockData';
import { buildEventPayload, dispatchWebhookEvent } from '../services/webhookService';

interface LicenseContextType {
  licenses: License[];
  licenseTotal: number;
  licensesLoading: boolean;
  licenseQueryLoading: boolean;
  licensesError: string | null;
  refreshLicenses: () => Promise<void>;
  refreshLicenseQuery: (params: { search?: string; status?: string; type?: string; plan?: string; page?: number }) => Promise<void>;
  auditLogs: AuditLog[];
  auditTotal: number;
  refreshAuditQuery: (params: { event?: string; outcome?: string; page?: number }) => Promise<void>;
  notifications: EmailNotification[];
  notificationRules: NotificationRule[];
  webhookEndpoints: WebhookEndpoint[];
  webhookDeliveryLogs: WebhookDeliveryLog[];
  
  // Orders & Automated Fulfillment Pipeline
  orders: PurchaseOrder[];
  processIncomingOrder: (params: ProcessOrderParams) => Promise<ProcessOrderResult>;
  resendOrderEmail: (orderId: string) => Promise<boolean>;
  deleteOrder: (orderId: string) => Promise<void>;
  clearOrders: () => void;
  
  // Products, Versions, Trial Policies, & Modular Features
  products: SoftwareProduct[];
  productVersions: ProductVersion[];
  trialPolicies: TrialPolicy[];
  productFeatures: ProductFeature[];
  
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (t: 'dark' | 'light') => void;
  
  // Real-time API actions
  validateKey: (key: string, deviceData?: { deviceName?: string; os?: string; fingerprint?: string; ip?: string; version?: string; clientVersion?: string; location?: string }) => Promise<ValidationResponse>;
  activateDevice: (key: string, deviceData: { deviceName: string; os: 'macOS' | 'Windows' | 'Linux' | 'iOS' | 'Android' | 'Server'; fingerprint?: string; ip?: string; version?: string; clientVersion?: string; location?: string }) => Promise<ValidationResponse>;
  deactivateDevice: (licenseId: string, deviceId: string) => Promise<boolean>;
  sendHeartbeat: (licenseId: string, deviceFingerprint: string) => Promise<boolean>;
  
  // Admin & Management operations
  createLicense: (data: {
    productName: string;
    productSlug?: string;
    plan: License['plan'];
    type: License['type'];
    userEmail: string;
    userName: string;
    maxDevices: number;
    durationDays?: number | null; // null for lifetime
    features: string[];
    price: number;
    billingCycle: License['billingCycle'];
    autoRenew?: boolean;
    notes?: string;
    customKeyPrefix?: string;
  }) => Promise<License>;
  updateLicenseStatus: (id: string, status: LicenseStatus, reason?: string) => Promise<void>;
  renewLicense: (id: string, monthsToAdd?: number) => Promise<void>;
  deleteLicense: (id: string) => Promise<void>;
  
  // Product Operations
  addProduct: (product: Omit<SoftwareProduct, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SoftwareProduct>;
  updateProduct: (id: string, updates: Partial<SoftwareProduct>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  duplicateProduct: (id: string) => Promise<SoftwareProduct>;
  
  // Version Matrix Operations
  addProductVersion: (version: Omit<ProductVersion, 'id'>) => Promise<ProductVersion>;
  updateProductVersion: (id: string, updates: Partial<ProductVersion>) => Promise<void>;
  deleteProductVersion: (id: string) => Promise<void>;
  setMinSupportedVersion: (productId: string, versionId: string) => Promise<void>;
  setLatestVersion: (productId: string, versionId: string) => Promise<void>;
  checkVersionCompatibility: (productId: string, clientVersion: string, os?: string) => {
    compatible: boolean;
    status: 'compatible' | 'outdated_recommended' | 'unsupported_blocked' | 'sunset';
    minRequired: string;
    latest: string;
    downloadUrl?: string;
    message: string;
  };

  // Trial Rule / Policy Operations
  updateTrialPolicy: (productId: string, updates: Partial<TrialPolicy>) => Promise<void>;
  generateTrialLicense: (
    productId: string, 
    userEmail: string, 
    userName: string, 
    options?: { customDurationDays?: number; hardwareFingerprint?: string; maxDevices?: number }
  ) => Promise<{ license: License; policy: TrialPolicy }>;

  // Modular Feature Add-on Operations
  addProductFeature: (feature: Omit<ProductFeature, 'id'>) => Promise<ProductFeature>;
  updateProductFeature: (id: string, updates: Partial<ProductFeature>) => Promise<void>;
  deleteProductFeature: (id: string) => Promise<void>;
  toggleLicenseFeatureAddon: (licenseId: string, featureKey: string, enabled: boolean) => Promise<License>;

  // Notification actions
  sendRenewalNotice: (licenseId: string, customMessage?: string) => Promise<EmailNotification>;
  resendLicenseKeyEmail: (licenseId: string) => Promise<EmailNotification>;
  retryEmailDelivery: (deliveryId: string) => Promise<LicenseEmailDelivery>;
  toggleNotificationRule: (ruleId: string) => void;
  triggerAutomatedRuleCheck: () => { processedCount: number; dispatchedCount: number };
  triggerBatchRenewalNotifications: () => Promise<number>;
  
  // Webhooks & Billing Integrations
  addWebhookEndpoint: (data: {
    name: string;
    url: string;
    secret?: string;
    events: WebhookEventType[];
    provider?: WebhookProvider;
  }) => Promise<WebhookEndpoint>;
  updateWebhookEndpoint: (id: string, updates: Partial<WebhookEndpoint>) => Promise<void>;
  deleteWebhookEndpoint: (id: string) => Promise<void>;
  testDispatchWebhook: (endpointId: string, event: WebhookEventType, customPayload?: Record<string, any>) => Promise<WebhookDeliveryLog>;
  processInboundBillingWebhook: (provider: WebhookProvider, payload: Record<string, any>) => Promise<{ success: boolean; action: string; license?: License; message: string }>;
  retryWebhookDelivery: (logId: string) => Promise<WebhookDeliveryLog>;
  clearWebhookLogs: () => void;

  // Lookup & Retrieval
  retrieveLicensesByEmail: (email: string) => License[];
  
  // Front-End Customer Portal Layout Customizer
  portalConfig: PortalConfig;
  updatePortalConfig: (updates: Partial<PortalConfig>) => void;
  resetPortalConfig: () => void;

  // Logs and telemetry
  exportAuditLogs: (format: 'csv' | 'json') => void | Promise<void>;
  
  // Computed metrics
  stats: {
    totalLicenses: number;
    activeLicenses: number;
    expiredLicenses: number;
    revokedLicenses: number;
    suspendedLicenses: number;
    expiringSoonCount: number;
    totalActiveDevices: number;
    validationSuccessRate: number;
    failedAttempts24h: number;
    successAttempts24h: number;
    mrr: number;
  };
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

const STORAGE_RULES = 'licensepulse_rules_v1';
const STORAGE_THEME = 'licensepulse_theme_v1';
const STORAGE_WEBHOOK_ENDPOINTS = 'licensepulse_webhook_endpoints_v1';
const STORAGE_WEBHOOK_LOGS = 'licensepulse_webhook_logs_v1';
const STORAGE_PRODUCTS = 'licensepulse_products_v1';
const STORAGE_VERSIONS = 'licensepulse_versions_v1';
const STORAGE_TRIAL_POLICIES = 'licensepulse_trials_v1';
const STORAGE_FEATURES = 'licensepulse_features_v1';
const STORAGE_ORDERS = 'licensepulse_orders_v1';
const STORAGE_PORTAL_CONFIG = 'licensepulse_portal_config_v1';

async function adminApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...options.headers },
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'License API request failed.');
  return result as T;
}

async function fetchServerLicenses(params: { page?: number; pageSize?: number; search?: string; status?: string; type?: string; plan?: string } = {}) {
  const query = new URLSearchParams();
  query.set('page', String(params.page || 1));
  query.set('pageSize', String(params.pageSize || 100));
  if (params.search) query.set('search', params.search);
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.type && params.type !== 'all') query.set('type', params.type);
  if (params.plan && params.plan !== 'all') query.set('plan', params.plan);
  return adminApi<{ licenses: License[]; total: number; page: number; pageSize: number }>(`/api/v1/admin/licenses?${query.toString()}`);
}

async function fetchServerAuditLogs(params: { page?: number; pageSize?: number; event?: string; outcome?: string } = {}) {
  const query = new URLSearchParams();
  query.set('page', String(params.page || 1));
  query.set('pageSize', String(params.pageSize || 100));
  if (params.event && params.event !== 'all') query.set('event', params.event);
  if (params.outcome && params.outcome !== 'all') query.set('outcome', params.outcome.toLowerCase());
  const result = await adminApi<{ auditLogs: AuditLog[]; total: number }>(`/api/v1/admin/audit-events?${query.toString()}`);
  return result;
}

export const LicenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  // Theme state
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem(STORAGE_THEME);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark'; // default to sleek dark
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_THEME, theme);
  }, [theme]);

  const toggleTheme = () => setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  const setTheme = (t: 'dark' | 'light') => setThemeState(t);

  // Licenses and lifecycle audit history are server-owned; legacy browser data is ignored.
  const [licenses, setLicenses] = useState<License[]>([]);
  const [licenseTotal, setLicenseTotal] = useState(0);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [licensesLoading, setLicensesLoading] = useState(false);
  const [licenseQueryLoading, setLicenseQueryLoading] = useState(false);
  const [licensesError, setLicensesError] = useState<string | null>(null);

  const refreshLicenses = useCallback(async () => {
    const licensePage = await fetchServerLicenses({ page: 1, pageSize: 1000 });
    setLicenses(licensePage.licenses);
    setLicenseTotal(licensePage.total);
    setLicensesError(null);
  }, []);

  const refreshLicenseQuery = useCallback(async (params: { search?: string; status?: string; type?: string; plan?: string; page?: number }) => {
    setLicenseQueryLoading(true);
    try {
      const data = await fetchServerLicenses({ ...params, page: params.page || 1, pageSize: 100 });
      setLicenses(data.licenses);
      setLicenseTotal(data.total);
      setLicensesError(null);
    } catch (error) {
      setLicensesError(error instanceof Error ? error.message : 'Could not load server licenses.');
    } finally {
      setLicenseQueryLoading(false);
    }
  }, []);

  const refreshAuditQuery = useCallback(async (params: { event?: string; outcome?: string; page?: number }) => {
    try {
      const data = await fetchServerAuditLogs({ ...params, page: params.page || 1, pageSize: 100 });
      setAuditLogs(data.auditLogs);
      setAuditTotal(data.total);
    } catch {
      // Keep the last successful audit view visible.
    }
  }, []);

  const refreshAuditLogs = useCallback(async () => {
    try {
      const page = await fetchServerAuditLogs({ page: 1, pageSize: 1000 });
      setAuditLogs(page.auditLogs);
      setAuditTotal(page.total);
    } catch {
      // A history refresh must not misreport a committed license mutation as failed.
    }
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setLicenses([]);
      setLicenseTotal(0);
      setAuditLogs([]);
      setAuditTotal(0);
      setLicensesError(null);
      setLicensesLoading(false);
      return;
    }
    let cancelled = false;
    setLicensesLoading(true);
    setLicensesError(null);
    Promise.all([fetchServerLicenses({ page: 1, pageSize: 1000 }), fetchServerAuditLogs({ page: 1, pageSize: 1000 })])
      .then(([nextLicenses, nextAuditLogs]) => {
        if (cancelled) return;
        setLicenses(nextLicenses.licenses);
        setLicenseTotal(nextLicenses.total);
        setAuditLogs(nextAuditLogs.auditLogs);
        setAuditTotal(nextAuditLogs.total);
      })
      .catch(error => {
        if (cancelled) return;
        setLicenses([]);
        setAuditLogs([]);
        setAuditTotal(0);
        setLicensesError(error instanceof Error ? error.message : 'Could not load license data.');
      })
      .finally(() => { if (!cancelled) setLicensesLoading(false); });
    return () => { cancelled = true; };
  }, [currentUser]);

  // Legacy in-app notification fixtures are intentionally not shown as real delivery outcomes.
  const [notifications] = useState<EmailNotification[]>([]);

  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>(() => {
    const saved = localStorage.getItem(STORAGE_RULES);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_NOTIFICATION_RULES;
  });

  const [webhookEndpoints, setWebhookEndpoints] = useState<WebhookEndpoint[]>(() => {
    const saved = localStorage.getItem(STORAGE_WEBHOOK_ENDPOINTS);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_WEBHOOK_ENDPOINTS;
  });

  const [webhookDeliveryLogs, setWebhookDeliveryLogs] = useState<WebhookDeliveryLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_WEBHOOK_LOGS);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_WEBHOOK_DELIVERY_LOGS;
  });

  // Software Products, Version Matrix, Trial Policies & Modular Feature Add-ons
  const [products, setProducts] = useState<SoftwareProduct[]>(() => {
    const saved = localStorage.getItem(STORAGE_PRODUCTS);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_PRODUCTS;
  });

  const [productVersions, setProductVersions] = useState<ProductVersion[]>(() => {
    const saved = localStorage.getItem(STORAGE_VERSIONS);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_PRODUCT_VERSIONS;
  });

  const [trialPolicies, setTrialPolicies] = useState<TrialPolicy[]>(() => {
    const saved = localStorage.getItem(STORAGE_TRIAL_POLICIES);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_TRIAL_POLICIES;
  });

  const [productFeatures, setProductFeatures] = useState<ProductFeature[]>(() => {
    const saved = localStorage.getItem(STORAGE_FEATURES);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_PRODUCT_FEATURES;
  });

  const [orders, setOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem(STORAGE_ORDERS);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_PURCHASE_ORDERS;
  });

  const [portalConfig, setPortalConfig] = useState<PortalConfig>(() => {
    const saved = localStorage.getItem(STORAGE_PORTAL_CONFIG);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_PORTAL_CONFIG;
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_PORTAL_CONFIG, JSON.stringify(portalConfig));
  }, [portalConfig]);

  const updatePortalConfig = (updates: Partial<PortalConfig>) => {
    setPortalConfig(prev => ({
      ...prev,
      ...updates
    }));
  };

  const resetPortalConfig = () => {
    setPortalConfig(INITIAL_PORTAL_CONFIG);
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_RULES, JSON.stringify(notificationRules));
  }, [notificationRules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_WEBHOOK_ENDPOINTS, JSON.stringify(webhookEndpoints));
  }, [webhookEndpoints]);

  useEffect(() => {
    localStorage.setItem(STORAGE_WEBHOOK_LOGS, JSON.stringify(webhookDeliveryLogs));
  }, [webhookDeliveryLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_VERSIONS, JSON.stringify(productVersions));
  }, [productVersions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_TRIAL_POLICIES, JSON.stringify(trialPolicies));
  }, [trialPolicies]);

  useEffect(() => {
    localStorage.setItem(STORAGE_FEATURES, JSON.stringify(productFeatures));
  }, [productFeatures]);

  useEffect(() => {
    localStorage.setItem(STORAGE_ORDERS, JSON.stringify(orders));
  }, [orders]);

  // Mock client actions do not write fake events into the server-owned audit history.
  const logAudit = (_log: Omit<AuditLog, 'id' | 'timestamp'>) => undefined;

  // Real-time API: Validate Key
  const validateKey = async (
    key: string,
    deviceData?: { deviceName?: string; os?: string; fingerprint?: string; ip?: string; version?: string }
  ): Promise<ValidationResponse> => {
    return {
      valid: false, status: 'pending', code: 503, error_code: 'CLIENT_API_NOT_READY',
      message: 'Client validation is not available yet. It is planned for Phase 3.', timestamp: new Date().toISOString(),
    };
  };

  // Real-time API: Activate Device
  const activateDevice = async (
    key: string,
    deviceData: { deviceName: string; os: 'macOS' | 'Windows' | 'Linux' | 'iOS' | 'Android' | 'Server'; fingerprint?: string; ip?: string; version?: string; location?: string }
  ): Promise<ValidationResponse> => {
    return {
      valid: false, status: 'pending', code: 503, error_code: 'CLIENT_API_NOT_READY',
      message: 'Device activation is not available yet. It is planned for Phase 3.', timestamp: new Date().toISOString(),
    };
  };

  // Deactivate a device
  const deactivateDevice = async (licenseId: string, deviceId: string): Promise<boolean> => {
    return false;
  };

  // Send Heartbeat Ping
  const sendHeartbeat = async (licenseId: string, deviceFingerprint: string): Promise<boolean> => {
    return false;
  };

  // Batch renewal notification trigger
  const triggerBatchRenewalNotifications = async (): Promise<number> => {
    const now = new Date();
    let sentCount = 0;

    for (const lic of licenses) {
      if (lic.expiresAt && lic.status === 'active') {
        const diffDays = Math.ceil((new Date(lic.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 30) {
          await sendRenewalNotice(lic.id);
          sentCount++;
        }
      }
    }

    return sentCount;
  };

  // Create new license
  const createLicense = async (data: {
    productName: string;
    productSlug?: string;
    plan: License['plan'];
    type: License['type'];
    userEmail: string;
    userName: string;
    maxDevices: number;
    durationDays?: number | null;
    features: string[];
    price: number;
    billingCycle: License['billingCycle'];
    autoRenew?: boolean;
    notes?: string;
    customKeyPrefix?: string;
  }): Promise<License> => {
    const { license, emailDelivery } = await adminApi<{ license: License; keyRevealOnce: boolean; emailDelivery: LicenseEmailDelivery }>('/api/v1/admin/licenses', {
      method: 'POST', body: JSON.stringify(data),
    });
    await refreshLicenses();
    void refreshAuditLogs();
    return { ...license, emailDelivery };
  };

  // Update status (Revoke, Suspend, Reinstate)
  const updateLicenseStatus = async (id: string, newStatus: LicenseStatus, reason?: string) => {
    if (newStatus === 'expired' || newStatus === 'pending') throw new Error('That status is computed or unavailable for manual changes.');
    await adminApi(`/api/v1/admin/licenses/${encodeURIComponent(id)}/status`, {
      method: 'PATCH', body: JSON.stringify({ status: newStatus, reason }),
    });
    await refreshLicenses();
    void refreshAuditLogs();
  };

  // Renew License
  const renewLicense = async (id: string, monthsToAdd = 12) => {
    const result = await adminApi<{ expiresAt: string }>(`/api/v1/admin/licenses/${encodeURIComponent(id)}/renew`, {
      method: 'POST', body: JSON.stringify({ months: monthsToAdd }),
    });
    await refreshLicenses();
    void refreshAuditLogs();
  };

  // Archive license; history remains in the database and its key can never be reused.
  const deleteLicense = async (id: string) => {
    await adminApi(`/api/v1/admin/licenses/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await refreshLicenses();
    void refreshAuditLogs();
  };

  // Send Renewal Notification email
  const sendRenewalNotice = async (licenseId: string, customMessage?: string): Promise<EmailNotification> => {
    void licenseId;
    void customMessage;
    throw new Error('Customer email delivery is not enabled until Phase 4.');
  };

  // Resend license key
  const resendLicenseKeyEmail = async (licenseId: string): Promise<EmailNotification> => {
    const { delivery } = await adminApi<{ delivery: LicenseEmailDelivery }>(`/api/v1/admin/licenses/${encodeURIComponent(licenseId)}/email`, { method: 'POST' });
    void refreshAuditLogs();
    const license = licenses.find(item => item.id === licenseId);
    return {
      id: delivery.id, type: 'key_delivery', recipientEmail: delivery.recipientEmail,
      recipientName: license?.userName || '', licenseKey: license?.key || '••••-••••-••••',
      productName: license?.productName || 'License', subject: delivery.subject, body: '',
      sentAt: delivery.acceptedAt || delivery.createdAt, status: delivery.status === 'accepted' ? 'sent' : delivery.status === 'failed' ? 'failed' : 'scheduled',
    };
  };

  const retryEmailDelivery = async (deliveryId: string): Promise<LicenseEmailDelivery> => {
    const { delivery } = await adminApi<{ delivery: LicenseEmailDelivery }>(`/api/v1/admin/email-deliveries/${encodeURIComponent(deliveryId)}/retry`, { method: 'POST' });
    void refreshAuditLogs();
    return delivery;
  };

  // Toggle notification rule
  const toggleNotificationRule = (ruleId: string) => {
    setNotificationRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
  };

  // Trigger automated notification rule check
  const triggerAutomatedRuleCheck = () => {
    const now = new Date();
    let dispatched = 0;

    licenses.forEach(lic => {
      if (!lic.expiresAt || lic.status !== 'active') return;
      const exp = new Date(lic.expiresAt);
      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      notificationRules.forEach(rule => {
        if (!rule.enabled) return;

        if (rule.type === 'renewal_reminder' && diffDays > 0 && diffDays <= rule.daysOffset) {
          // Check if we already sent in last 24h
          const alreadySent = notifications.some(
            n => n.recipientEmail === lic.userEmail && n.licenseKey === lic.key && n.type === 'renewal_reminder'
          );
          if (!alreadySent) {
            sendRenewalNotice(lic.id);
            dispatched++;
          }
        }
      });
    });

    return { processedCount: licenses.length, dispatchedCount: dispatched };
  };

  // Retrieve license by customer email
  const retrieveLicensesByEmail = (email: string): License[] => {
    void email;
    return [];
  };

  // Export audit logs
  const exportAuditLogs = async (format: 'csv' | 'json') => {
    let exportRows = auditLogs;
    try {
      const allEvents = await fetchServerAuditLogs({ page: 1, pageSize: 1000 });
      exportRows = allEvents.auditLogs;
    } catch {
      // Keep the currently loaded server page available if a full export is temporarily unavailable.
    }
    if (format === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportRows, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `licensepulse_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      const headers = ['ID', 'Timestamp', 'License Key', 'Product', 'Action', 'Status', 'Reason', 'IP Address', 'Location', 'Device Name', 'OS', 'Latency (ms)'];
      const rows = exportRows.map(l => [
        l.id,
        l.timestamp,
        l.licenseKey,
        `"${l.productName || 'N/A'}"`,
        l.action,
        l.status,
        `"${(l.reason || '').replace(/"/g, '""')}"`,
        l.ipAddress,
        `"${l.location}"`,
        `"${l.deviceName}"`,
        l.os,
        l.latencyMs
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `licensepulse_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };


  // --- Webhooks & Billing Integrations ---
  const addWebhookEndpoint = async (data: {
    name: string;
    url: string;
    secret?: string;
    events: WebhookEventType[];
    provider?: WebhookProvider;
  }): Promise<WebhookEndpoint> => {
    const chars = 'abcdef0123456789';
    const randomHex = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const generatedSecret = data.secret || `whsec_${data.provider === 'stripe' ? 'stripe_' : data.provider === 'lemonsqueezy' ? 'ls_' : data.provider === 'shopify' ? 'shps_' : 'live_'}${randomHex(32)}`;

    const newEndpoint: WebhookEndpoint = {
      id: `ep_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name,
      url: data.url,
      secret: generatedSecret,
      events: data.events,
      status: 'active',
      provider: data.provider || 'generic',
      createdAt: new Date().toISOString(),
      successRate: 100.0,
    };

    setWebhookEndpoints(prev => [newEndpoint, ...prev]);

    logAudit({
      licenseKey: 'SYSTEM-CONFIG',
      action: 'CREATION',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1',
      location: 'Local Infrastructure',
      deviceFingerprint: 'SYS-ADMIN',
      deviceName: 'LicensePulse Webhook Engine',
      os: 'Cloud',
      clientVersion: 'v2.4',
      reason: `Created Webhook Subscription: ${newEndpoint.name} (${newEndpoint.events.join(', ')})`,
      latencyMs: 12,
    });

    return newEndpoint;
  };

  const updateWebhookEndpoint = async (id: string, updates: Partial<WebhookEndpoint>): Promise<void> => {
    setWebhookEndpoints(prev => prev.map(ep => ep.id === id ? { ...ep, ...updates } : ep));
  };

  const deleteWebhookEndpoint = async (id: string): Promise<void> => {
    setWebhookEndpoints(prev => prev.filter(ep => ep.id !== id));
  };

  const testDispatchWebhook = async (
    endpointId: string,
    event: WebhookEventType,
    customPayload?: Record<string, any>
  ): Promise<WebhookDeliveryLog> => {
    const endpoint = webhookEndpoints.find(e => e.id === endpointId) || {
      id: 'ep_ad_hoc',
      name: 'Ad-Hoc Endpoint',
      url: 'https://api.licensepulse.io/webhooks/test',
      secret: 'demo-only-placeholder',
      events: [event],
      status: 'active' as const,
      provider: 'generic' as const,
      createdAt: new Date().toISOString(),
      successRate: 100,
    };

    const targetLicense = licenses[0] || null;
    const payload = customPayload || buildEventPayload(event, targetLicense);
    
    const deliveryLog = await dispatchWebhookEvent(endpoint, event, payload);
    setWebhookDeliveryLogs(prev => [deliveryLog, ...prev]);

    // Update endpoint stats
    if (endpoint.id !== 'ep_ad_hoc') {
      setWebhookEndpoints(prev => prev.map(ep => {
        if (ep.id === endpoint.id) {
          return {
            ...ep,
            lastTriggeredAt: deliveryLog.timestamp,
            status: deliveryLog.status === 'delivered' ? 'active' : 'failing',
          };
        }
        return ep;
      }));
    }

    return deliveryLog;
  };

  const retryWebhookDelivery = async (logId: string): Promise<WebhookDeliveryLog> => {
    const targetLog = webhookDeliveryLogs.find(l => l.id === logId);
    if (!targetLog) throw new Error('Delivery log not found');

    const endpoint = webhookEndpoints.find(e => e.id === targetLog.endpointId) || {
      id: targetLog.endpointId || 'ep_retry',
      name: 'Webhook Endpoint',
      url: targetLog.endpointUrl,
      secret: 'demo-only-placeholder',
      events: [targetLog.event],
      status: 'active' as const,
      provider: targetLog.provider,
      createdAt: new Date().toISOString(),
      successRate: 100,
    };

    const retriedLog = await dispatchWebhookEvent(endpoint, targetLog.event, targetLog.requestPayload);
    retriedLog.attempts = (targetLog.attempts || 1) + 1;

    setWebhookDeliveryLogs(prev => [retriedLog, ...prev.filter(l => l.id !== logId)]);
    return retriedLog;
  };

  const clearWebhookLogs = () => {
    setWebhookDeliveryLogs([]);
  };

  // --- Software Product Operations ---
  const addProduct = async (productData: Omit<SoftwareProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<SoftwareProduct> => {
    const nowIso = new Date().toISOString();
    const newProduct: SoftwareProduct = {
      ...productData,
      id: `prod_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setProducts(prev => [newProduct, ...prev]);

    // Automatically seed a default 14-day self-expiring trial policy for this product
    const defaultTrialPolicy: TrialPolicy = {
      id: `trial_${newProduct.id}`,
      productId: newProduct.id,
      enabled: true,
      trialDurationDays: 14,
      selfExpiring: true,
      gracePeriodDays: 2,
      maxActivationsPerHardware: 1,
      maxActivationsPerEmail: 1,
      requireEmailVerification: true,
      restrictedFeatures: ['fips_compliance', 'airgap_certs', 'cluster_nodes'],
      watermarkOrThrottle: false,
      autoConvertRule: 'expire_and_lock',
      customTrialNotes: '14-Day Free Trial Evaluation. For production usage, please purchase a license.'
    };
    setTrialPolicies(prev => [...prev, defaultTrialPolicy]);

    // Automatically seed an initial v1.0.0 product version
    const initialVersion: ProductVersion = {
      id: `ver_${Date.now().toString(36)}`,
      productId: newProduct.id,
      version: 'v1.0.0',
      releaseChannel: 'stable',
      releaseDate: nowIso.split('T')[0],
      isMinSupported: true,
      isLatest: true,
      isDeprecated: false,
      minOsRequirements: { macOS: '12.0+', Windows: '10+', Linux: 'Kernel 5.4+' },
      changelogSummary: 'Initial product release. Standard core licensing engine enabled.',
      criticalSecurityPatch: false
    };
    setProductVersions(prev => [initialVersion, ...prev]);

    logAudit({
      licenseKey: 'PRODUCT-CATALOG',
      action: 'CREATION',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1',
      location: 'Admin Console',
      deviceFingerprint: 'SYS-ADMIN',
      deviceName: 'Product Catalog Engine',
      os: 'Cloud',
      clientVersion: 'v2.4',
      reason: `Registered new software product: "${newProduct.name}" (Slug: ${newProduct.slug}, Key Prefix: ${newProduct.keyPrefix}) with 14-day trial rule and v1.0.0 baseline`,
      latencyMs: 14,
    });

    return newProduct;
  };

  const updateProduct = async (id: string, updates: Partial<SoftwareProduct>): Promise<void> => {
    const target = products.find(p => p.id === id);
    if (!target) return;

    const nowIso = new Date().toISOString();
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: nowIso } : p));

    logAudit({
      licenseKey: 'PRODUCT-CATALOG',
      action: 'CREATION',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1',
      location: 'Admin Console',
      deviceFingerprint: 'SYS-ADMIN',
      deviceName: 'Product Catalog Engine',
      os: 'Cloud',
      clientVersion: 'v2.4',
      reason: `Updated software product "${target.name}" metadata (Status: ${updates.status || target.status})`,
      latencyMs: 11,
    });
  };

  const deleteProduct = async (id: string): Promise<void> => {
    const target = products.find(p => p.id === id);
    if (!target) return;

    setProducts(prev => prev.filter(p => p.id !== id));
    setProductVersions(prev => prev.filter(v => v.productId !== id));
    setTrialPolicies(prev => prev.filter(t => t.productId !== id));
    setProductFeatures(prev => prev.filter(f => f.productId !== id));

    logAudit({
      licenseKey: 'PRODUCT-CATALOG',
      action: 'REVOCATION',
      status: 'WARN',
      ipAddress: '127.0.0.1',
      location: 'Admin Console',
      deviceFingerprint: 'SYS-ADMIN',
      deviceName: 'Product Catalog Engine',
      os: 'Cloud',
      clientVersion: 'v2.4',
      reason: `Deleted product "${target.name}" and purged its version matrix, trial policies, and feature catalog`,
      latencyMs: 18,
    });
  };

  const duplicateProduct = async (id: string): Promise<SoftwareProduct> => {
    const source = products.find(p => p.id === id);
    if (!source) throw new Error('Product not found');

    const rand = Math.random().toString(36).substring(2, 6);
    const newProduct = await addProduct({
      name: `${source.name} (Copy)`,
      slug: `${source.slug}-copy-${rand}`,
      description: source.description,
      category: source.category,
      keyPrefix: `${source.keyPrefix}C`.slice(0, 5),
      iconName: source.iconName,
      colorTheme: source.colorTheme,
      supportedPlatforms: [...source.supportedPlatforms],
      pricingTiers: { ...source.pricingTiers },
      defaultSeatLimits: { ...source.defaultSeatLimits },
      status: 'active'
    });

    return newProduct;
  };

  // --- Version Matrix Operations ---
  const addProductVersion = async (versionData: Omit<ProductVersion, 'id'>): Promise<ProductVersion> => {
    const newVersion: ProductVersion = {
      ...versionData,
      id: `ver_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    };

    setProductVersions(prev => {
      let list = [...prev];
      if (newVersion.isLatest) {
        list = list.map(v => v.productId === newVersion.productId ? { ...v, isLatest: false } : v);
      }
      if (newVersion.isMinSupported) {
        list = list.map(v => v.productId === newVersion.productId ? { ...v, isMinSupported: false } : v);
      }
      return [newVersion, ...list];
    });

    logAudit({
      licenseKey: 'VERSION-MATRIX',
      action: 'CREATION',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1',
      location: 'Admin Console',
      deviceFingerprint: 'SYS-ADMIN',
      deviceName: 'Version Matrix Manager',
      os: 'Cloud',
      clientVersion: 'v2.4',
      reason: `Added version ${newVersion.version} (${newVersion.releaseChannel}) to product matrix`,
      latencyMs: 12,
    });

    return newVersion;
  };

  const updateProductVersion = async (id: string, updates: Partial<ProductVersion>): Promise<void> => {
    setProductVersions(prev => prev.map(v => {
      if (v.id === id) {
        const updated = { ...v, ...updates };
        return updated;
      }
      if (updates.isLatest && v.productId === updates.productId && v.id !== id) {
        return { ...v, isLatest: false };
      }
      if (updates.isMinSupported && v.productId === updates.productId && v.id !== id) {
        return { ...v, isMinSupported: false };
      }
      return v;
    }));
  };

  const deleteProductVersion = async (id: string): Promise<void> => {
    setProductVersions(prev => prev.filter(v => v.id !== id));
  };

  const setMinSupportedVersion = async (productId: string, versionId: string): Promise<void> => {
    const targetVer = productVersions.find(v => v.id === versionId);
    if (!targetVer) return;

    setProductVersions(prev => prev.map(v => {
      if (v.productId === productId) {
        return { ...v, isMinSupported: v.id === versionId };
      }
      return v;
    }));

    logAudit({
      licenseKey: 'VERSION-MATRIX',
      action: 'CREATION',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1',
      location: 'Admin Console',
      deviceFingerprint: 'SYS-ADMIN',
      deviceName: 'Version Matrix Manager',
      os: 'Cloud',
      clientVersion: 'v2.4',
      reason: `Enforced minimum supported client version to ${targetVer.version} for product ${productId}. Older builds will receive mandatory update prompts.`,
      latencyMs: 14,
    });
  };

  const setLatestVersion = async (productId: string, versionId: string): Promise<void> => {
    const targetVer = productVersions.find(v => v.id === versionId);
    if (!targetVer) return;

    setProductVersions(prev => prev.map(v => {
      if (v.productId === productId) {
        return { ...v, isLatest: v.id === versionId };
      }
      return v;
    }));
  };

  // Helper to compare semver strings like "v4.2.1" vs "v3.8.0"
  const parseSemver = (vStr: string): number[] => {
    const clean = vStr.replace(/^v/i, '').trim();
    return clean.split('.').map(num => parseInt(num, 10) || 0);
  };

  const compareVersions = (v1: string, v2: string): number => {
    const p1 = parseSemver(v1);
    const p2 = parseSemver(v2);
    const len = Math.max(p1.length, p2.length);
    for (let i = 0; i < len; i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  };

  const checkVersionCompatibility = (
    productId: string, 
    clientVersion: string, 
    os?: string
  ): {
    compatible: boolean;
    status: 'compatible' | 'outdated_recommended' | 'unsupported_blocked' | 'sunset';
    minRequired: string;
    latest: string;
    downloadUrl?: string;
    message: string;
  } => {
    const product = products.find(p => p.id === productId || p.slug === productId || p.name.toLowerCase() === productId.toLowerCase());
    const versions = productVersions.filter(v => v.productId === product?.id || v.productId === productId);
    
    const minVerObj = versions.find(v => v.isMinSupported) || versions[versions.length - 1];
    const latestVerObj = versions.find(v => v.isLatest) || versions[0];
    
    const minRequired = minVerObj?.version || 'v1.0.0';
    const latest = latestVerObj?.version || 'v1.0.0';

    const matchVersion = versions.find(v => v.version.toLowerCase() === clientVersion.toLowerCase());

    if (matchVersion?.releaseChannel === 'sunset' || matchVersion?.isDeprecated) {
      return {
        compatible: false,
        status: 'sunset',
        minRequired,
        latest,
        downloadUrl: latestVerObj?.downloadUrl || 'https://releases.licensepulse.io/latest',
        message: `Version ${clientVersion} has reached end-of-life (Sunset / Deprecated). Please update to ${latest}.`
      };
    }

    if (os && matchVersion?.minOsRequirements && !(matchVersion.minOsRequirements as any)[os]) {
      // If OS requirement is specified but not this OS, check
    }

    const cmpMin = compareVersions(clientVersion, minRequired);
    if (cmpMin < 0) {
      return {
        compatible: false,
        status: 'unsupported_blocked',
        minRequired,
        latest,
        downloadUrl: latestVerObj?.downloadUrl || 'https://releases.licensepulse.io/latest',
        message: `Version ${clientVersion} is below minimum supported version (${minRequired}). Upgrade required to maintain server connectivity.`
      };
    }

    const cmpLatest = compareVersions(clientVersion, latest);
    if (cmpLatest < 0) {
      return {
        compatible: true,
        status: 'outdated_recommended',
        minRequired,
        latest,
        downloadUrl: latestVerObj?.downloadUrl,
        message: `Version ${clientVersion} is compatible. Newer version ${latest} is available with performance enhancements.`
      };
    }

    return {
      compatible: true,
      status: 'compatible',
      minRequired,
      latest,
      message: `Version ${clientVersion} is up to date and fully compatible.`
    };
  };

  // --- Trial Policy / Rules Operations ---
  const updateTrialPolicy = async (productId: string, updates: Partial<TrialPolicy>): Promise<void> => {
    setTrialPolicies(prev => {
      const exists = prev.some(t => t.productId === productId);
      if (exists) {
        return prev.map(t => t.productId === productId ? { ...t, ...updates } : t);
      }
      const newPolicy: TrialPolicy = {
        id: `trial_${productId}`,
        productId,
        enabled: true,
        trialDurationDays: 14,
        selfExpiring: true,
        gracePeriodDays: 2,
        maxActivationsPerHardware: 1,
        maxActivationsPerEmail: 1,
        requireEmailVerification: true,
        restrictedFeatures: [],
        watermarkOrThrottle: false,
        autoConvertRule: 'expire_and_lock',
        customTrialNotes: '14-Day Free Trial Evaluation.',
        ...updates
      };
      return [...prev, newPolicy];
    });

    logAudit({
      licenseKey: 'TRIAL-ENGINE',
      action: 'CREATION',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1',
      location: 'Admin Console',
      deviceFingerprint: 'SYS-ADMIN',
      deviceName: 'Trial Rules Policy Engine',
      os: 'Cloud',
      clientVersion: 'v2.4',
      reason: `Updated Trial Policy configuration for product ${productId} (Duration: ${updates.trialDurationDays ?? 'custom'} days, Self-Expiring: ${updates.selfExpiring !== false ? 'YES' : 'NO'})`,
      latencyMs: 10,
    });
  };

  const generateTrialLicense = async (
    productId: string,
    userEmail: string,
    userName: string,
    options?: { customDurationDays?: number; hardwareFingerprint?: string; maxDevices?: number }
  ): Promise<{ license: License; policy: TrialPolicy }> => {
    const prod = products.find(p => p.id === productId || p.slug === productId || p.name.toLowerCase() === productId.toLowerCase()) || products[0];
    const policy = trialPolicies.find(t => t.productId === prod.id) || {
      id: `trial_${prod.id}`,
      productId: prod.id,
      enabled: true,
      trialDurationDays: 14,
      selfExpiring: true,
      gracePeriodDays: 2,
      maxActivationsPerHardware: 1,
      maxActivationsPerEmail: 1,
      requireEmailVerification: true,
      restrictedFeatures: ['fips_compliance', 'airgap_certs', 'cluster_nodes'],
      watermarkOrThrottle: false,
      autoConvertRule: 'expire_and_lock' as const,
      customTrialNotes: '14-Day Free Trial Evaluation. For production usage, please purchase a license.'
    };

    const duration = options?.customDurationDays || policy.trialDurationDays || 14;
    const prodFeatures = productFeatures.filter(f => f.productId === prod.id);
    
    // Determine enabled features: all core features + add-ons NOT in restrictedFeatures list
    const allowedFeatures = prodFeatures
      .filter(f => !policy.restrictedFeatures.includes(f.featureKey))
      .map(f => f.featureKey);

    const fallbackFeatures = allowedFeatures.length > 0 ? allowedFeatures : ['core_engine', 'cloud_sync'];

    const newLic = await createLicense({
      productName: prod.name,
      productSlug: prod.slug,
      plan: 'trial',
      type: (options?.maxDevices || policy.maxActivationsPerHardware || 1) > 1 ? 'multi_device' : 'single_device',
      userEmail,
      userName: userName || 'Trial Evaluator',
      maxDevices: options?.maxDevices || policy.maxActivationsPerHardware || 1,
      durationDays: duration,
      features: fallbackFeatures,
      price: 0,
      billingCycle: 'monthly',
      autoRenew: false,
      customKeyPrefix: `${prod.keyPrefix}TR`,
      notes: `14-Day Self-Expiring Trial provisioned per policy. Excluded features: [${policy.restrictedFeatures.join(', ') || 'none'}]. Grace period: ${policy.gracePeriodDays} days.`,
    });

    // If hardware fingerprint provided, bind it immediately
    if (options?.hardwareFingerprint) {
      await activateDevice(newLic.key, {
        deviceName: `${userName}'s Workstation`,
        os: 'macOS',
        fingerprint: options.hardwareFingerprint,
        ip: '192.168.1.100'
      });
    }

    logAudit({
      licenseKey: newLic.key,
      licenseId: newLic.id,
      productName: prod.name,
      action: 'CREATION',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1',
      location: 'Trial Engine',
      deviceFingerprint: options?.hardwareFingerprint || 'eval_web_request',
      deviceName: 'Self-Serve Trial Portal',
      os: 'Cloud',
      clientVersion: 'v2.4',
      reason: `Provisioned self-expiring ${duration}-day trial evaluation for ${userEmail}. Auto-expires at ${newLic.expiresAt}`,
      latencyMs: 16,
    });

    return { license: newLic, policy };
  };

  // --- Modular Feature Add-on Operations ---
  const addProductFeature = async (featureData: Omit<ProductFeature, 'id'>): Promise<ProductFeature> => {
    const newFeature: ProductFeature = {
      ...featureData,
      id: `feat_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    };

    setProductFeatures(prev => [newFeature, ...prev]);

    logAudit({
      licenseKey: 'FEATURE-CATALOG',
      action: 'CREATION',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1',
      location: 'Admin Console',
      deviceFingerprint: 'SYS-ADMIN',
      deviceName: 'Feature Add-on Catalog',
      os: 'Cloud',
      clientVersion: 'v2.4',
      reason: `Registered modular feature add-on: "${newFeature.name}" (Key: "${newFeature.featureKey}", Category: ${newFeature.category}, Price: $${newFeature.monthlyAddonPrice}/mo)`,
      latencyMs: 12,
    });

    return newFeature;
  };

  const updateProductFeature = async (id: string, updates: Partial<ProductFeature>): Promise<void> => {
    setProductFeatures(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteProductFeature = async (id: string): Promise<void> => {
    setProductFeatures(prev => prev.filter(f => f.id !== id));
  };

  const toggleLicenseFeatureAddon = async (licenseId: string, featureKey: string, enabled: boolean): Promise<License> => {
    const lic = licenses.find(l => l.id === licenseId);
    if (!lic) throw new Error('License not found');
    const result = await adminApi<{ features: string[] }>(`/api/v1/admin/licenses/${encodeURIComponent(licenseId)}/features`, {
      method: 'PATCH', body: JSON.stringify({ featureKey, enabled }),
    });
    await refreshLicenses();
    void refreshAuditLogs();
    return { ...lic, features: result.features };
  };

  // ---------------------------------------------------------------------------
  // Automated Order-to-License & Email Delivery Pipeline
  // ---------------------------------------------------------------------------

  const processIncomingOrder = async (params: ProcessOrderParams): Promise<ProcessOrderResult> => {
    throw new Error('Automated payment fulfillment is not enabled in the manual-issuance RC1 scope.');
  };

  // Resend Order Delivery Email (if failed or requested by admin)
  const resendOrderEmail = async (orderId: string): Promise<boolean> => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder || !targetOrder.licenseKey) return false;

    const emailId = `mail_resend_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const emailNotif: EmailNotification = {
      id: emailId,
      type: 'key_delivery',
      recipientEmail: targetOrder.customerEmail,
      recipientName: targetOrder.customerName,
      licenseKey: targetOrder.licenseKey,
      productName: targetOrder.productName,
      subject: `[Resent] Your ${targetOrder.productName} License Key (${targetOrder.orderNumber})`,
      body: `Hi ${targetOrder.customerName},\n\nHere is your re-dispatched license key for ${targetOrder.productName} (${targetOrder.plan.toUpperCase()} Tier):\n\nKey: ${targetOrder.licenseKey}\nAllowed Seats: ${targetOrder.maxDevices} device(s)\nOrder Reference: ${targetOrder.orderNumber}\n\nActivation:\n$ licensepulse-cli activate --key ${targetOrder.licenseKey}`,
      sentAt: nowIso,
      status: 'sent',
      read: false,
    };

    setOrders(prev =>
      prev.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            status: 'completed',
            updatedAt: nowIso,
            steps: {
              ...o.steps,
              emailSent: {
                status: 'success',
                timestamp: nowIso,
                emailId,
                recipientEmail: o.customerEmail,
                subject: `[Resent] Your ${o.productName} License Key (${o.orderNumber})`,
                resendCount: (o.steps.emailSent.resendCount || 0) + 1,
                error: undefined,
              },
            },
          };
        }
        return o;
      })
    );

    logAudit({
      licenseKey: targetOrder.licenseKey,
      licenseId: targetOrder.licenseId,
      productName: targetOrder.productName,
      action: 'EMAIL_SENT',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1',
      location: 'Admin Console',
      deviceFingerprint: 'admin_sys_console',
      deviceName: 'Email Delivery Resender',
      os: 'Admin Web',
      clientVersion: 'v2.4',
      reason: `Administrator resent license delivery email for order ${targetOrder.orderNumber} to ${targetOrder.customerEmail}`,
      latencyMs: 15,
    });

    return true;
  };

  const deleteOrder = async (orderId: string): Promise<void> => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const clearOrders = (): void => {
    setOrders([]);
  };

  const processInboundBillingWebhook = async (
    provider: WebhookProvider,
    payload: Record<string, any>
  ): Promise<{ success: boolean; action: string; license?: License; message: string }> => {
    return { success: false, action: 'disabled', message: 'Billing webhooks are out of scope for this RC1.' };
  };

  // Computed stats
  const stats = useMemo(() => {
    const total = licenses.length;
    const active = licenses.filter(l => l.status === 'active').length;
    const expired = licenses.filter(l => l.status === 'expired').length;
    const revoked = licenses.filter(l => l.status === 'revoked').length;
    const suspended = licenses.filter(l => l.status === 'suspended').length;

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringSoon = licenses.filter(l => {
      if (l.status !== 'active' || !l.expiresAt) return false;
      const exp = new Date(l.expiresAt);
      return exp >= now && exp <= thirtyDaysFromNow;
    }).length;

    const totalActiveDevices = licenses.reduce((sum, l) => {
      return sum + l.devices.filter(d => d.status === 'active').length;
    }, 0);

    const successfulAttempts = auditLogs.filter(a => a.status === 'SUCCESS' && ['VALIDATION', 'ACTIVATION'].includes(a.action)).length;
    const failedAttempts = auditLogs.filter(a => a.status === 'FAILED' && ['VALIDATION', 'ACTIVATION'].includes(a.action)).length;
    const totalAttempts = successfulAttempts + failedAttempts;
    const validationSuccessRate = totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 0;

    const mrr = licenses.reduce((sum, l) => {
      if (l.status !== 'active') return sum;
      if (l.billingCycle === 'monthly') return sum + l.price;
      if (l.billingCycle === 'annual') return sum + Math.round(l.price / 12);
      return sum;
    }, 0);

    return {
      totalLicenses: total,
      activeLicenses: active,
      expiredLicenses: expired,
      revokedLicenses: revoked,
      suspendedLicenses: suspended,
      expiringSoonCount: expiringSoon,
      totalActiveDevices,
      validationSuccessRate,
      failedAttempts24h: failedAttempts,
      successAttempts24h: successfulAttempts,
      mrr
    };
  }, [licenses, auditLogs]);

  return (
    <LicenseContext.Provider
      value={{
        licenses,
        licenseTotal,
        licensesLoading,
        licenseQueryLoading,
        licensesError,
        refreshLicenses,
        refreshLicenseQuery,
        refreshAuditQuery,
        auditLogs,
        auditTotal,
        notifications,
        notificationRules,
        webhookEndpoints,
        webhookDeliveryLogs,
        orders,
        processIncomingOrder,
        resendOrderEmail,
        deleteOrder,
        clearOrders,
        products,
        productVersions,
        trialPolicies,
        productFeatures,
        theme,
        toggleTheme,
        setTheme,
        validateKey,
        activateDevice,
        deactivateDevice,
        sendHeartbeat,
        createLicense,
        updateLicenseStatus,
        renewLicense,
        deleteLicense,
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
        toggleLicenseFeatureAddon,
        sendRenewalNotice,
        resendLicenseKeyEmail,
        retryEmailDelivery,
        toggleNotificationRule,
        triggerAutomatedRuleCheck,
        triggerBatchRenewalNotifications,
        addWebhookEndpoint,
        updateWebhookEndpoint,
        deleteWebhookEndpoint,
        testDispatchWebhook,
        processInboundBillingWebhook,
        retryWebhookDelivery,
        clearWebhookLogs,
        retrieveLicensesByEmail,
        portalConfig,
        updatePortalConfig,
        resetPortalConfig,
        exportAuditLogs,
        stats
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
};

export const useLicense = () => {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
};
