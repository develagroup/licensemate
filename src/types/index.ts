export type UserRole = 'admin' | 'manager' | 'customer';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  company?: string;
  createdAt: string;
}

export type LicenseType = 'single_device' | 'multi_device';
export type LicensePlan = 'starter' | 'pro' | 'enterprise' | 'lifetime' | 'trial';
export type LicenseStatus = 'active' | 'expired' | 'revoked' | 'suspended' | 'pending';
export type BillingCycle = 'monthly' | 'annual' | 'lifetime';

export interface LicenseEmailDelivery {
  id: string;
  licenseId: string | null;
  recipientEmail: string;
  messageType: string;
  subject: string;
  status: 'queued' | 'sending' | 'accepted' | 'failed';
  attempts: number;
  createdAt: string;
  lastAttemptAt: string | null;
  acceptedAt: string | null;
  providerMessageId: string | null;
  lastErrorCode: string | null;
  lastErrorSummary: string | null;
  retryable: boolean;
}

export interface ActivatedDevice {
  id: string;
  deviceFingerprint: string;
  deviceName: string;
  os: 'macOS' | 'Windows' | 'Linux' | 'iOS' | 'Android' | 'Server';
  ip: string;
  location: string;
  activatedAt: string;
  lastHeartbeat: string;
  clientVersion: string;
  status: 'active' | 'deactivated';
}

export interface License {
  id: string;
  key: string;
  productName: string;
  productSlug: string;
  plan: LicensePlan;
  type: LicenseType;
  status: LicenseStatus;
  userId: string;
  userEmail: string;
  userName: string;
  createdAt: string;
  expiresAt: string | null; // null for lifetime
  lastValidatedAt?: string;
  devices: ActivatedDevice[];
  maxDevices: number;
  features: string[];
  autoRenew: boolean;
  billingCycle: BillingCycle;
  price: number;
  offlineGraceDays: number;
  notes?: string;
  orderId?: string;
  paymentProvider?: 'stripe' | 'lemonsqueezy' | 'shopify' | 'direct_checkout' | 'custom_api';
  paymentId?: string;
  emailDelivery?: LicenseEmailDelivery;
}

export type AuditAction = 
  | 'VALIDATION' 
  | 'ACTIVATION' 
  | 'DEACTIVATION' 
  | 'REVOCATION' 
  | 'SUSPEND' 
  | 'REINSTATE' 
  | 'HEARTBEAT' 
  | 'CREATION' 
  | 'RENEWAL'
  | 'ARCHIVE'
  | 'FEATURES_UPDATED'
  | 'RENEWAL_ALERT' 
  | 'RETRIEVAL'
  | 'ORDER_RECEIVED'
  | 'PAYMENT_VERIFIED'
  | 'PAYMENT_FAILED'
  | 'EMAIL_SENT'
  | 'EMAIL_FAILED'
  | 'DUPLICATE_ORDER_BLOCKED';

export type AuditStatus = 'SUCCESS' | 'FAILED' | 'WARN';

export interface AuditLog {
  id: string;
  timestamp: string;
  licenseKey: string;
  licenseId?: string;
  productName?: string;
  action: AuditAction;
  status: AuditStatus;
  reason?: string;
  ipAddress: string;
  location: string;
  deviceFingerprint: string;
  deviceName: string;
  os: string;
  clientVersion: string;
  latencyMs: number | null;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export type NotificationType = 
  | 'renewal_reminder' 
  | 'expiration_notice' 
  | 'device_limit_warning' 
  | 'key_delivery' 
  | 'revocation_alert'
  | 'welcome_license';

export interface EmailNotification {
  id: string;
  type: NotificationType;
  recipientEmail: string;
  recipientName: string;
  licenseKey: string;
  productName: string;
  subject: string;
  body: string;
  sentAt: string;
  status: 'sent' | 'scheduled' | 'failed';
  read?: boolean;
}

export interface NotificationRule {
  id: string;
  name: string;
  type: NotificationType;
  enabled: boolean;
  daysOffset: number; // e.g., 7 days before, 0 for day of
  subjectTemplate: string;
  description: string;
}

export interface ValidationResponse {
  valid: boolean;
  status: LicenseStatus | 'invalid';
  code: number;
  message: string;
  reason?: string;
  error_code?: string;
  activeDevices?: number;
  maxDevices?: number;
  entitlements?: string[];
  license?: {
    key: string;
    productName: string;
    plan: LicensePlan;
    type: LicenseType;
    status: LicenseStatus;
    expiresAt: string | null;
    boundDevices: number;
    maxDevices: number;
    features: string[];
    userEmail?: string;
  };
  device?: ActivatedDevice;
  timestamp: string;
  jwtToken?: string;
}

export type WebhookEventType = 
  | 'license.created' 
  | 'seat.bound' 
  | 'seat.unbound' 
  | 'license.renewed' 
  | 'license.expired' 
  | 'license.suspended' 
  | 'license.revoked' 
  | 'payment.failed' 
  | 'payment.succeeded'
  | 'checkout.session.completed'
  | 'customer.subscription.deleted';

export type WebhookProvider = 'generic' | 'stripe' | 'lemonsqueezy' | 'shopify';

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  status: 'active' | 'disabled' | 'failing';
  provider: WebhookProvider;
  createdAt: string;
  lastTriggeredAt?: string;
  successRate: number;
}

export interface WebhookDeliveryLog {
  id: string;
  endpointId?: string;
  endpointUrl: string;
  event: WebhookEventType;
  direction: 'outbound' | 'inbound';
  provider: WebhookProvider;
  status: 'delivered' | 'failed' | 'retrying';
  httpStatus: number;
  requestPayload: Record<string, any>;
  responseBody?: string;
  headers: Record<string, string>;
  latencyMs: number;
  attempts: number;
  maxAttempts: number;
  timestamp: string;
  errorReason?: string;
}

// -------------------------------------------------------------
// Software Products, Version Matrices, Trial Policies, & Features
// -------------------------------------------------------------

export type ProductCategory = 
  | 'Developer Tools' 
  | 'Security & Network' 
  | '3D & Creative' 
  | 'Database & Storage' 
  | 'AI & Machine Learning' 
  | 'Infrastructure' 
  | 'Productivity';

export interface SoftwareProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: ProductCategory;
  keyPrefix: string;
  iconName: string;
  colorTheme: string; // 'indigo' | 'emerald' | 'amber' | 'purple' | 'rose' | 'cyan' | 'blue'
  supportedPlatforms: ('macOS' | 'Windows' | 'Linux' | 'iOS' | 'Android' | 'Server' | 'Web')[];
  pricingTiers: {
    starter: number;
    pro: number;
    enterprise: number;
    lifetime: number;
  };
  defaultSeatLimits: {
    starter: number;
    pro: number;
    enterprise: number;
    lifetime: number;
  };
  status: 'active' | 'beta' | 'deprecated';
  createdAt: string;
  updatedAt: string;
}

export type ReleaseChannel = 'stable' | 'beta' | 'nightly' | 'lts' | 'sunset';

export interface ProductVersion {
  id: string;
  productId: string;
  version: string;
  releaseChannel: ReleaseChannel;
  releaseDate: string;
  isMinSupported: boolean; // Flag to designate minimum required version for API validation
  isLatest: boolean;
  isDeprecated: boolean;
  sunsetDate?: string | null;
  minOsRequirements?: {
    macOS?: string;
    Windows?: string;
    Linux?: string;
    Server?: string;
    iOS?: string;
    Android?: string;
    Web?: string;
  };
  downloadUrl?: string;
  binaryChecksum?: string;
  changelogSummary?: string;
  criticalSecurityPatch?: boolean;
}

export interface TrialPolicy {
  id?: string;
  productId: string;
  enabled: boolean;
  trialDurationDays: number; // e.g. 14 for 14-day self-expiring trial
  selfExpiring: boolean;
  gracePeriodDays: number;
  maxActivationsPerHardware: number; // e.g. 1 device per hardware fingerprint
  maxActivationsPerEmail: number; // e.g. 1 per email
  requireEmailVerification: boolean;
  restrictedFeatures: string[]; // Features disabled during trial mode
  watermarkOrThrottle: boolean;
  autoConvertRule: 'expire_and_lock' | 'grace_read_only' | 'auto_charge_if_card';
  customTrialNotes?: string;
}

export type FeatureCategory = 
  | 'Core' 
  | 'AI & Intelligence' 
  | 'Security & Compliance' 
  | 'Cloud & Sync' 
  | 'Performance & Hardware' 
  | 'Support & SLA';

export interface ProductFeature {
  id: string;
  productId: string;
  featureKey: string;
  name: string;
  description: string;
  category: FeatureCategory;
  isModularAddOn: boolean;
  defaultPlans: LicensePlan[];
  monthlyAddonPrice: number;
  annualAddonPrice: number;
  trialAllowed: boolean;
  requiresMinVersion?: string;
}

// -------------------------------------------------------------
// Purchase Order Lifecycle & Email Delivery Pipeline
// -------------------------------------------------------------

export type OrderProvider = 'stripe' | 'lemonsqueezy' | 'shopify' | 'direct_checkout' | 'custom_api';
export type OrderStepStatus = 'pending' | 'success' | 'failed' | 'skipped';

export interface OrderPipelineSteps {
  orderReceived: {
    status: OrderStepStatus;
    timestamp: string;
    details?: string;
    rawEvent?: string;
  };
  paymentVerified: {
    status: OrderStepStatus;
    timestamp?: string;
    transactionId?: string;
    amount?: number;
    currency?: string;
    paymentStatus?: string;
    details?: string;
  };
  licenseCreated: {
    status: OrderStepStatus;
    timestamp?: string;
    licenseKey?: string;
    licenseId?: string;
    plan?: LicensePlan;
    maxDevices?: number;
    details?: string;
  };
  emailSent: {
    status: OrderStepStatus;
    timestamp?: string;
    emailId?: string;
    recipientEmail?: string;
    subject?: string;
    error?: string;
    resendCount?: number;
    details?: string;
  };
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  externalOrderId: string;
  provider: OrderProvider;
  customerEmail: string;
  customerName: string;
  customerCompany?: string;
  productId: string;
  productName: string;
  productSlug: string;
  plan: LicensePlan;
  maxDevices: number;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
  transactionId?: string;
  status: 'completed' | 'processing' | 'payment_failed' | 'email_failed' | 'duplicate_blocked';
  steps: OrderPipelineSteps;
  licenseId?: string;
  licenseKey?: string;
  rawPayload?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessOrderParams {
  externalOrderId?: string;
  provider: OrderProvider;
  customerEmail: string;
  customerName: string;
  productId?: string;
  productName: string;
  plan: LicensePlan;
  maxDevices?: number;
  billingCycle?: BillingCycle;
  amount: number;
  currency?: string;
  paymentStatus: 'paid' | 'pending' | 'failed';
  transactionId?: string;
  failureReason?: string;
  simulateEmailFailure?: boolean;
  rawPayload?: Record<string, any>;
}

export interface ProcessOrderResult {
  success: boolean;
  order: PurchaseOrder;
  license?: License;
  message: string;
  stepFailed?: 'orderReceived' | 'paymentVerified' | 'licenseCreated' | 'emailSent';
  duplicateBlocked?: boolean;
}

export interface PortalFaqItem {
  id: string;
  question: string;
  answer: string;
}

export type PortalAccentColor = 'cyan' | 'teal' | 'emerald' | 'purple' | 'amber' | 'blue';

export interface PortalConfig {
  portalTitle: string;
  brandName: string;
  brandTagline: string;
  heroHeading: string;
  heroDescription: string;
  accentColor: PortalAccentColor;
  searchPlaceholder: string;
  searchButtonText: string;
  supportEmail: string;
  documentationUrl: string;
  termsUrl: string;
  showDemoPills: boolean;
  showConnectedDevices: boolean;
  showOfflineCertDownload: boolean;
  showLinkedOrders: boolean;
  showRecoveryGuide: boolean;
  showFaqSection: boolean;
  showTroubleshootingCard: boolean;
  showAnnouncementBanner: boolean;
  announcementText: string;
  announcementType: 'info' | 'success' | 'warning' | 'alert';
  footerCopyrightText: string;
  faqs: PortalFaqItem[];
}

