import React, { useState } from 'react';
import { 
  Webhook, 
  Send, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Check, 
  Copy, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck, 
  Code2, 
  Radio, 
  CreditCard, 
  ShoppingBag, 
  Store, 
  ExternalLink,
  ChevronRight,
  Eye,
  Activity,
  Layers,
  Sparkles,
  Zap,
  CheckCircle,
  FileJson,
  RotateCw,
  Terminal
} from 'lucide-react';
import { useLicense } from '../context/LicenseContext';
import { useAuth } from '../context/AuthContext';
import { 
  WebhookEventType, 
  WebhookProvider, 
  WebhookEndpoint, 
  WebhookDeliveryLog, 
  License 
} from '../types';
import { 
  buildEventPayload, 
  SAMPLE_INBOUND_PAYLOADS, 
  getWebhookServerCode, 
  generateWebhookSignature 
} from '../services/webhookService';

export const WebhookManager: React.FC = () => {
  const { 
    webhookEndpoints, 
    webhookDeliveryLogs, 
    licenses,
    addWebhookEndpoint, 
    updateWebhookEndpoint, 
    deleteWebhookEndpoint, 
    testDispatchWebhook, 
    processInboundBillingWebhook, 
    retryWebhookDelivery, 
    clearWebhookLogs 
  } = useLicense();
  const { isManager } = useAuth();

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'endpoints' | 'simulator' | 'inbound' | 'logs' | 'code'>('simulator');

  // New Endpoint Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEndpointName, setNewEndpointName] = useState('');
  const [newEndpointUrl, setNewEndpointUrl] = useState('');
  const [newEndpointProvider, setNewEndpointProvider] = useState<WebhookProvider>('generic');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>([
    'license.created', 
    'seat.bound', 
    'license.expired', 
    'payment.failed'
  ]);
  const [customSecret, setCustomSecret] = useState('');

  // Outbound Simulator State
  const [simEvent, setSimEvent] = useState<WebhookEventType>('license.created');
  const [simLicenseKey, setSimLicenseKey] = useState<string>(licenses[0]?.key || '');
  const [simEndpointId, setSimEndpointId] = useState<string>(webhookEndpoints[0]?.id || '');
  const [customDispatchUrl, setCustomDispatchUrl] = useState('');
  const [simExtraParams, setSimExtraParams] = useState({
    deviceName: 'MacBook Pro M3 Max',
    os: 'macOS',
    fingerprint: 'FPR-A79B-8831-C012',
    ip: '198.51.100.42',
    failureCode: 'insufficient_funds',
    failureMessage: 'Card declined: Insufficient funds on account'
  });
  const [isDispatching, setIsDispatching] = useState(false);
  const [latestDispatchResult, setLatestDispatchResult] = useState<WebhookDeliveryLog | null>(null);

  // Inbound Gateway Simulator State
  const [inboundProvider, setInboundProvider] = useState<WebhookProvider>('stripe');
  const [inboundScenario, setInboundScenario] = useState<string>('checkout.session.completed');
  const [inboundPayloadJson, setInboundPayloadJson] = useState<string>(() => {
    return JSON.stringify(SAMPLE_INBOUND_PAYLOADS.stripe['checkout.session.completed'], null, 2);
  });
  const [isProcessingInbound, setIsProcessingInbound] = useState(false);
  const [inboundOutcome, setInboundOutcome] = useState<{
    success: boolean;
    action: string;
    license?: License;
    message: string;
  } | null>(null);

  // Code generator language
  const [codeLang, setCodeLang] = useState<'nodejs' | 'python' | 'go' | 'php'>('nodejs');

  // Inspection Drawer
  const [inspectingLog, setInspectingLog] = useState<WebhookDeliveryLog | null>(null);
  const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'failed'>('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'outbound' | 'inbound'>('all');

  // Update inbound payload when provider/scenario changes
  const handleScenarioSelect = (prov: WebhookProvider, scenarioKey: string) => {
    setInboundProvider(prov);
    setInboundScenario(scenarioKey);
    const sample = (SAMPLE_INBOUND_PAYLOADS as any)[prov]?.[scenarioKey];
    if (sample) {
      setInboundPayloadJson(JSON.stringify(sample, null, 2));
    }
    setInboundOutcome(null);
  };

  // Dispatch outbound event
  const handleDispatchOutbound = async () => {
    setIsDispatching(true);
    setLatestDispatchResult(null);
    try {
      const selectedLic = licenses.find(l => l.key === simLicenseKey) || licenses[0];
      const payload = buildEventPayload(simEvent, selectedLic, simExtraParams);
      
      let targetEndpoint = webhookEndpoints.find(e => e.id === simEndpointId);
      if (customDispatchUrl) {
        targetEndpoint = {
          id: 'ep_custom',
          name: 'Custom Ad-Hoc Target',
          url: customDispatchUrl,
          secret: 'demo-only-placeholder',
          events: [simEvent],
          status: 'active',
          provider: 'generic',
          createdAt: new Date().toISOString(),
          successRate: 100,
        };
      } else if (!targetEndpoint && webhookEndpoints.length > 0) {
        targetEndpoint = webhookEndpoints[0];
      }

      if (targetEndpoint) {
        const result = await testDispatchWebhook(targetEndpoint.id, simEvent, payload);
        setLatestDispatchResult(result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDispatching(false);
    }
  };

  // Ingest Inbound Webhook
  const handleIngestInbound = async () => {
    setIsProcessingInbound(true);
    setInboundOutcome(null);
    try {
      const parsed = JSON.parse(inboundPayloadJson);
      const result = await processInboundBillingWebhook(inboundProvider, parsed);
      setInboundOutcome(result);
    } catch (err: any) {
      setInboundOutcome({
        success: false,
        action: 'Parsing Error',
        message: `Failed to parse payload: ${err.message}`
      });
    } finally {
      setIsProcessingInbound(false);
    }
  };

  // Submit New Endpoint
  const handleCreateEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEndpointName || !newEndpointUrl) return;

    await addWebhookEndpoint({
      name: newEndpointName,
      url: newEndpointUrl,
      provider: newEndpointProvider,
      events: selectedEvents,
      secret: customSecret || undefined,
    });

    setIsAddModalOpen(false);
    setNewEndpointName('');
    setNewEndpointUrl('');
    setCustomSecret('');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecretId(id);
    setTimeout(() => setCopiedSecretId(null), 2000);
  };

  const filteredLogs = webhookDeliveryLogs.filter(log => {
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    if (directionFilter !== 'all' && log.direction !== directionFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="bg-[#191c1f] rounded-xl border border-[#292d30] p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5 mb-2">
              <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Webhook className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Webhook Engine & Billing Gateway</h1>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Live Dispatcher
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Real-time event webhooks with HMAC-SHA256 signatures for <span className="text-cyan-300 font-medium font-mono text-xs">license.created</span>, <span className="text-cyan-300 font-medium font-mono text-xs">seat.bound</span>, <span className="text-cyan-300 font-medium font-mono text-xs">license.expired</span>, and <span className="text-cyan-300 font-medium font-mono text-xs">payment.failed</span>.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Endpoint</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-[#262a2d] pt-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-[#151719] text-cyan-300 font-bold border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#151719] border border-transparent'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-cyan-400" />
            <span>Outbound Event Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('inbound')}
            className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'inbound'
                ? 'bg-[#151719] text-cyan-300 font-bold border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#151719] border border-transparent'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
            <span>Inbound Billing Ingestion (Stripe / Lemon / Shopify)</span>
          </button>

          <button
            onClick={() => setActiveTab('endpoints')}
            className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'endpoints'
                ? 'bg-[#151719] text-cyan-300 font-bold border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#151719] border border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Endpoints ({webhookEndpoints.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-[#151719] text-cyan-300 font-bold border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#151719] border border-transparent'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Delivery Logs ({webhookDeliveryLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'code'
                ? 'bg-[#151719] text-cyan-300 font-bold border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#151719] border border-transparent'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Receiver SDKs & HMAC Guide</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OUTBOUND SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-5">
            <div className="p-5 rounded-xl bg-[#191c1f] border border-[#292d30] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Send className="w-4 h-4 text-cyan-400" />
                  <span>Configure Test Event</span>
                </h2>
                <span className="text-[11px] text-cyan-400 font-mono">HMAC-SHA256</span>
              </div>

              {/* Event Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Event Trigger
                </label>
                <select
                  value={simEvent}
                  onChange={(e) => setSimEvent(e.target.value as WebhookEventType)}
                  className="w-full px-3 py-2 rounded-lg bg-[#101214] border border-[#292d30] text-xs font-medium text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="license.created">license.created (New key provisioned)</option>
                  <option value="seat.bound">seat.bound (Workstation device assigned)</option>
                  <option value="seat.unbound">seat.unbound (Device released/deactivated)</option>
                  <option value="license.renewed">license.renewed (Subscription extended)</option>
                  <option value="license.expired">license.expired (License ended / grace period)</option>
                  <option value="payment.failed">payment.failed (Failed renewal billing)</option>
                  <option value="payment.succeeded">payment.succeeded (Checkout confirmed)</option>
                </select>
              </div>

              {/* Target License Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Bind to Customer License
                </label>
                <select
                  value={simLicenseKey}
                  onChange={(e) => setSimLicenseKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#101214] border border-[#292d30] text-xs font-medium text-white focus:border-cyan-500 focus:outline-none"
                >
                  {licenses.map(lic => (
                    <option key={lic.id} value={lic.key}>
                      {lic.productName} ({lic.key}) - {lic.userEmail}
                    </option>
                  ))}
                </select>
              </div>

              {/* Endpoint Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target Webhook Endpoint
                </label>
                <select
                  value={simEndpointId}
                  onChange={(e) => setSimEndpointId(e.target.value)}
                  disabled={!!customDispatchUrl}
                  className="w-full px-3 py-2 rounded-lg bg-[#101214] border border-[#292d30] text-xs font-medium text-white focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                >
                  {webhookEndpoints.map(ep => (
                    <option key={ep.id} value={ep.id}>
                      {ep.name} ({ep.url})
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom URL Override */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Or Test Custom Destination URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://webhook.site/your-uuid or https://my-app.io/api/webhook"
                  value={customDispatchUrl}
                  onChange={(e) => setCustomDispatchUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#101214] border border-[#292d30] text-xs text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>

              {/* Contextual Extra Fields */}
              {simEvent === 'seat.bound' && (
                <div className="p-3 rounded-lg bg-[#151719] border border-[#262a2d] space-y-2.5">
                  <span className="text-[10px] uppercase font-bold text-cyan-400">Device Simulation Metadata</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Machine Name</span>
                      <input
                        type="text"
                        value={simExtraParams.deviceName}
                        onChange={(e) => setSimExtraParams({ ...simExtraParams, deviceName: e.target.value })}
                        className="w-full px-2 py-1 rounded-md bg-[#101214] border border-[#292d30] text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">OS</span>
                      <select
                        value={simExtraParams.os}
                        onChange={(e) => setSimExtraParams({ ...simExtraParams, os: e.target.value })}
                        className="w-full px-2 py-1 rounded-md bg-[#101214] border border-[#292d30] text-xs text-white focus:outline-none"
                      >
                        <option value="macOS">macOS</option>
                        <option value="Windows">Windows</option>
                        <option value="Linux">Linux</option>
                        <option value="Server">Server</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {simEvent === 'payment.failed' && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-2.5">
                  <span className="text-[10px] uppercase font-bold text-rose-400">Billing Failure Simulation</span>
                  <div className="space-y-1.5 text-xs">
                    <span className="text-slate-400 block text-[10px]">Decline Reason Code</span>
                    <select
                      value={simExtraParams.failureCode}
                      onChange={(e) => setSimExtraParams({ ...simExtraParams, failureCode: e.target.value })}
                      className="w-full px-2 py-1.5 rounded-md bg-[#101214] border border-rose-500/40 text-xs text-rose-200 focus:outline-none"
                    >
                      <option value="insufficient_funds">insufficient_funds (Card declined)</option>
                      <option value="expired_card">expired_card (Card expiration date passed)</option>
                      <option value="authentication_required">authentication_required (3D Secure required)</option>
                      <option value="generic_decline">generic_decline (Issuer stopped transaction)</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                onClick={handleDispatchOutbound}
                disabled={isDispatching}
                className="w-full py-2.5 px-4 rounded-lg text-xs font-bold text-slate-950 bg-cyan-500 hover:bg-cyan-400 transition-all flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isDispatching ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing & Dispatching Webhook...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Dispatch Signed Webhook</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result / Payload Viewer Column */}
          <div className="lg:col-span-7 space-y-5">
            {/* Live Payload Preview */}
            <div className="p-5 rounded-xl bg-[#191c1f] text-slate-100 border border-[#292d30] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#262a2d] pb-3">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Live JSON Payload & Headers</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#151719] text-cyan-300 border border-cyan-500/30 font-mono">
                    POST application/json
                  </span>
                  <button
                    onClick={() => {
                      const lic = licenses.find(l => l.key === simLicenseKey) || licenses[0];
                      const payload = buildEventPayload(simEvent, lic, simExtraParams);
                      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
                      setCopiedPayload(true);
                      setTimeout(() => setCopiedPayload(false), 1500);
                    }}
                    className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-xs flex items-center space-x-1 cursor-pointer border border-transparent hover:border-[#292d30]"
                    title="Copy payload"
                  >
                    {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="text-[11px]">{copiedPayload ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Dispatched Delivery Feedback */}
              {latestDispatchResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                  latestDispatchResult.status === 'delivered'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 font-bold">
                      {latestDispatchResult.status === 'delivered' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <span>HTTP {latestDispatchResult.httpStatus} {latestDispatchResult.status === 'delivered' ? 'Delivered' : 'Delivery Failed'}</span>
                    </div>
                    <span className="font-mono text-[11px] opacity-80">{latestDispatchResult.latencyMs}ms Latency</span>
                  </div>

                  <div className="text-[11px] font-mono opacity-90 break-all">
                    URL: {latestDispatchResult.endpointUrl}
                  </div>
                  <div className="text-[11px] font-mono text-cyan-200 bg-[#101214] p-2 rounded-lg border border-[#292d30]">
                    <span className="text-slate-400 block text-[10px]">Signature Header:</span>
                    {latestDispatchResult.headers['x-licensepulse-signature']}
                  </div>
                </div>
              )}

              {/* JSON Editor/Viewer */}
              <div className="relative font-mono text-xs max-h-[380px] overflow-y-auto bg-[#101214] p-4 rounded-lg border border-[#292d30] text-cyan-200 leading-relaxed select-all custom-scrollbar">
                <pre>
                  {JSON.stringify(
                    buildEventPayload(
                      simEvent, 
                      licenses.find(l => l.key === simLicenseKey) || licenses[0], 
                      simExtraParams
                    ), 
                    null, 
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INBOUND BILLING INGESTION (STRIPE, LEMON SQUEEZY, SHOPIFY) */}
      {activeTab === 'inbound' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Provider & Scenario Selection */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 rounded-xl bg-[#191c1f] border border-[#292d30] shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span>Select Inbound Billing Scenario</span>
              </h2>

              {/* Stripe Scenarios */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Stripe Billing Webhooks</span>
                </span>
                
                <button
                  onClick={() => handleScenarioSelect('stripe', 'checkout.session.completed')}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-all border cursor-pointer ${
                    inboundProvider === 'stripe' && inboundScenario === 'checkout.session.completed'
                      ? 'bg-[#151719] border-cyan-500/50 text-cyan-200 font-semibold'
                      : 'bg-[#101214] border-[#262a2d] text-slate-300 hover:bg-[#151719]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-white">checkout.session.completed</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Auto-Provision</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-normal mt-1">
                    Customer buys DevFlow IDE Pro ($149) &rarr; generates active license key
                  </p>
                </button>

                <button
                  onClick={() => handleScenarioSelect('stripe', 'invoice.payment_failed')}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-all border cursor-pointer ${
                    inboundProvider === 'stripe' && inboundScenario === 'invoice.payment_failed'
                      ? 'bg-[#151719] border-cyan-500/50 text-cyan-200 font-semibold'
                      : 'bg-[#101214] border-[#262a2d] text-slate-300 hover:bg-[#151719]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-white">invoice.payment_failed</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/30">Alert / Grace</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-normal mt-1">
                    Sarah Connor's annual payment fails &rarr; dispatches urgent alert email
                  </p>
                </button>
              </div>

              {/* Lemon Squeezy Scenarios */}
              <div className="space-y-2 pt-3 border-t border-[#262a2d]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <Store className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Lemon Squeezy Store Webhooks</span>
                </span>

                <button
                  onClick={() => handleScenarioSelect('lemonsqueezy', 'order_created')}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-all border cursor-pointer ${
                    inboundProvider === 'lemonsqueezy' && inboundScenario === 'order_created'
                      ? 'bg-[#151719] border-cyan-500/50 text-cyan-200 font-semibold'
                      : 'bg-[#101214] border-[#262a2d] text-slate-300 hover:bg-[#151719]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-white">order_created (Order #10482)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Auto-Provision</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-normal mt-1">
                    David Vance buys CloudGuardian Shield 10-Seats ($499)
                  </p>
                </button>

                <button
                  onClick={() => handleScenarioSelect('lemonsqueezy', 'subscription_expired')}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-all border cursor-pointer ${
                    inboundProvider === 'lemonsqueezy' && inboundScenario === 'subscription_expired'
                      ? 'bg-[#151719] border-cyan-500/50 text-cyan-200 font-semibold'
                      : 'bg-[#101214] border-[#262a2d] text-slate-300 hover:bg-[#151719]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-white">subscription_expired</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30">Expire License</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-normal mt-1">
                    Alex Turner's subscription canceled &rarr; marks license as expired
                  </p>
                </button>
              </div>

              {/* Shopify Scenarios */}
              <div className="space-y-2 pt-3 border-t border-[#262a2d]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Shopify Store Orders</span>
                </span>

                <button
                  onClick={() => handleScenarioSelect('shopify', 'orders/paid')}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-all border cursor-pointer ${
                    inboundProvider === 'shopify' && inboundScenario === 'orders/paid'
                      ? 'bg-[#151719] border-cyan-500/50 text-cyan-200 font-semibold'
                      : 'bg-[#101214] border-[#262a2d] text-slate-300 hover:bg-[#151719]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-white">orders/paid (ID #59128)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Auto-Provision</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-normal mt-1">
                    Michael Chang purchases QuantumRenderer 3D ($199)
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Inbound Simulator Payload & Execution */}
          <div className="lg:col-span-8 space-y-4">
            <div className="p-5 rounded-xl bg-[#191c1f] border border-[#292d30] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white capitalize font-mono">
                    Inbound Endpoint: /api/v1/webhooks/{inboundProvider}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Test live ingestion from external payment gateways directly into LicensePulse.
                  </span>
                </div>

                <button
                  onClick={handleIngestInbound}
                  disabled={isProcessingInbound}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all flex items-center space-x-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isProcessingInbound ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>Ingest Inbound Webhook</span>
                    </>
                  )}
                </button>
              </div>

              {/* Processing Feedback Banner */}
              {inboundOutcome && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 animate-in fade-in duration-150 ${
                  inboundOutcome.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                }`}>
                  <div className="flex items-center space-x-2 font-bold">
                    {inboundOutcome.success ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                    <span>{inboundOutcome.action}</span>
                  </div>
                  <p>{inboundOutcome.message}</p>
                  
                  {inboundOutcome.license && (
                    <div className="p-2.5 rounded-lg bg-[#101214] border border-[#292d30] font-mono text-[11px] text-slate-300 space-y-1 mt-2">
                      <div><strong className="text-emerald-400">License Key:</strong> {inboundOutcome.license.key}</div>
                      <div><strong>Product:</strong> {inboundOutcome.license.productName} ({inboundOutcome.license.plan.toUpperCase()})</div>
                      <div><strong>Customer:</strong> {inboundOutcome.license.userEmail} ({inboundOutcome.license.userName})</div>
                      <div><strong>Seats:</strong> {inboundOutcome.license.maxDevices} device slots assigned</div>
                    </div>
                  )}
                </div>
              )}

              {/* Editable JSON Payload */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Inbound Payload JSON (Editable)
                </label>
                <textarea
                  rows={13}
                  value={inboundPayloadJson}
                  onChange={(e) => setInboundPayloadJson(e.target.value)}
                  className="w-full p-4 rounded-lg bg-[#101214] font-mono text-xs text-cyan-200 border border-[#292d30] focus:border-cyan-500 focus:outline-none custom-scrollbar"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ENDPOINTS LIST */}
      {activeTab === 'endpoints' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {webhookEndpoints.map(ep => (
              <div
                key={ep.id}
                className="p-5 rounded-xl bg-[#191c1f] border border-[#292d30] shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${ep.status === 'active' ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                      <h3 className="text-sm font-bold text-white">{ep.name}</h3>
                    </div>
                    <p className="text-xs font-mono text-slate-400 mt-1 break-all">
                      {ep.url}
                    </p>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => updateWebhookEndpoint(ep.id, { status: ep.status === 'active' ? 'disabled' : 'active' })}
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-cyan-300 bg-[#151719] hover:bg-[#151719] border border-cyan-500/30 cursor-pointer"
                    >
                      {ep.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                    {isManager && (
                      <button
                        onClick={() => deleteWebhookEndpoint(ep.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-white/5 cursor-pointer"
                        title="Delete endpoint"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Signing Secret */}
                <div className="p-2.5 rounded-lg bg-[#151719] border border-[#262a2d] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 font-mono text-cyan-300 truncate max-w-[280px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{ep.secret}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(ep.secret, ep.id)}
                    className="text-slate-400 hover:text-white p-1 cursor-pointer"
                    title="Copy secret"
                  >
                    {copiedSecretId === ep.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Subscribed Events */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Subscribed Events</span>
                  <div className="flex flex-wrap gap-1.5">
                    {ep.events.map(ev => (
                      <span
                        key={ev}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quick Test Button */}
                <div className="pt-2 border-t border-[#262a2d] flex items-center justify-between text-[11px] text-slate-400">
                  <span>Success Rate: <strong className="text-white">{ep.successRate}%</strong></span>
                  <button
                    onClick={() => {
                      setSimEndpointId(ep.id);
                      setCustomDispatchUrl('');
                      setActiveTab('simulator');
                    }}
                    className="inline-flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                  >
                    <span>Send Test Event</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DELIVERY LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-xl bg-[#191c1f] border border-[#292d30] shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-2.5 py-1 rounded-lg bg-[#101214] border border-[#292d30] text-xs text-slate-200 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="delivered">Delivered (200)</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-medium">Direction:</span>
                <select
                  value={directionFilter}
                  onChange={(e) => setDirectionFilter(e.target.value as any)}
                  className="px-2.5 py-1 rounded-lg bg-[#101214] border border-[#292d30] text-xs text-slate-200 focus:outline-none"
                >
                  <option value="all">All Directions</option>
                  <option value="outbound">Outbound (Dispatched)</option>
                  <option value="inbound">Inbound (Received)</option>
                </select>
              </div>
            </div>

            <button
              onClick={clearWebhookLogs}
              className="text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
            >
              Clear Logs
            </button>
          </div>

          {/* Logs Table */}
          <div className="overflow-hidden rounded-xl border border-[#292d30] bg-[#191c1f] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#151719] text-slate-400 font-semibold border-b border-[#262a2d] uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Direction</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Destination / Path</th>
                    <th className="px-4 py-3">Latency</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262a2d]">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500 font-mono">
                        No webhook delivery logs match criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-[#151719]/60 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            log.status === 'delivered'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}>
                            <span>{log.httpStatus}</span>
                            <span>{log.status === 'delivered' ? 'OK' : 'ERR'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          <span className={`inline-flex items-center space-x-1 ${
                            log.direction === 'outbound' ? 'text-cyan-300' : 'text-amber-400'
                          }`}>
                            {log.direction === 'outbound' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                            <span className="capitalize">{log.direction}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-white">
                          {log.event}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-400 max-w-[240px] truncate" title={log.endpointUrl}>
                          {log.endpointUrl}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400">
                          {log.latencyMs}ms
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-right space-x-1.5">
                          <button
                            onClick={() => setInspectingLog(log)}
                            className="px-2.5 py-1 rounded-md bg-[#151719] hover:bg-[#151719] border border-cyan-500/30 text-[11px] font-semibold text-cyan-300 cursor-pointer"
                          >
                            Inspect
                          </button>
                          {log.status === 'failed' && (
                            <button
                              onClick={() => retryWebhookDelivery(log.id)}
                              className="px-2.5 py-1 rounded-md bg-[#151719] hover:bg-[#151719] border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold cursor-pointer"
                            >
                              Retry
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: RECEIVER SDKS */}
      {activeTab === 'code' && (
        <div className="p-6 rounded-xl bg-[#191c1f] border border-[#292d30] shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span>Server-Side Webhook Receivers & Signature Verification</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Copy-paste code to verify the cryptographic HMAC signature (`X-LicensePulse-Signature`) and prevent replay attacks.
              </p>
            </div>

            {/* Language Selector */}
            <div className="flex items-center space-x-1 bg-[#151719] p-1 rounded-lg border border-[#262a2d] text-xs font-semibold">
              {(['nodejs', 'python', 'go', 'php'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setCodeLang(lang)}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    codeLang === lang 
                      ? 'bg-cyan-500/10 text-cyan-300 shadow-sm border border-cyan-500/30 font-bold' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang === 'nodejs' ? 'Node.js (Express)' : lang === 'python' ? 'Python (FastAPI)' : lang === 'go' ? 'Go (Golang)' : 'PHP'}
                </button>
              ))}
            </div>
          </div>

          <div className="relative font-mono text-xs bg-[#101214] text-cyan-200 p-4 rounded-lg border border-[#292d30] max-h-[440px] overflow-y-auto leading-relaxed custom-scrollbar">
            <button
              onClick={() => {
                navigator.clipboard.writeText(getWebhookServerCode(codeLang));
                setCopiedPayload(true);
                setTimeout(() => setCopiedPayload(false), 1500);
              }}
              className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-[#151719] hover:bg-[#151719] border border-cyan-500/30 text-cyan-300 text-[11px] font-sans flex items-center space-x-1 cursor-pointer"
            >
              {copiedPayload ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedPayload ? 'Copied' : 'Copy Snippet'}</span>
            </button>
            <pre>{getWebhookServerCode(codeLang)}</pre>
          </div>
        </div>
      )}

      {/* INSPECTION MODAL */}
      {inspectingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#191c1f] rounded-xl border border-[#292d30] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
            <div className="p-4 border-b border-[#262a2d] bg-[#151719] flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-sm text-white">
                <FileJson className="w-4 h-4 text-cyan-400" />
                <span>Webhook Delivery Details - {inspectingLog.event}</span>
              </div>
              <button
                onClick={() => setInspectingLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs custom-scrollbar">
              <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-[#151719] border border-[#262a2d]">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Status</span>
                  <span className="font-bold text-white">{inspectingLog.httpStatus} ({inspectingLog.status})</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Latency</span>
                  <span className="font-mono text-cyan-300">{inspectingLog.latencyMs} ms</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Direction</span>
                  <span className="font-bold capitalize text-slate-200">{inspectingLog.direction}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-200 block mb-1">Request Headers</span>
                <pre className="p-3 rounded-lg bg-[#101214] font-mono text-[11px] text-slate-300 border border-[#292d30] overflow-x-auto">
                  {JSON.stringify(inspectingLog.headers, null, 2)}
                </pre>
              </div>

              <div>
                <span className="font-bold text-slate-200 block mb-1">Request Body</span>
                <pre className="p-3 rounded-lg bg-[#101214] font-mono text-[11px] text-cyan-200 border border-[#292d30] overflow-x-auto max-h-56 custom-scrollbar">
                  {JSON.stringify(inspectingLog.requestPayload, null, 2)}
                </pre>
              </div>

              {inspectingLog.responseBody && (
                <div>
                  <span className="font-bold text-slate-200 block mb-1">Receiver Response</span>
                  <pre className="p-3 rounded-lg bg-[#101214] font-mono text-[11px] text-slate-300 border border-[#292d30] overflow-x-auto">
                    {inspectingLog.responseBody}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD ENDPOINT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <form onSubmit={handleCreateEndpoint} className="bg-[#191c1f] rounded-xl border border-[#292d30] shadow-2xl w-full max-w-lg overflow-hidden text-slate-100">
            <div className="p-5 border-b border-[#262a2d] bg-[#151719] flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-sm text-white">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Register Webhook Endpoint</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Endpoint Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Billing Server / Slack Hook"
                  value={newEndpointName}
                  onChange={(e) => setNewEndpointName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#101214] border border-[#292d30] text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Payload URL (HTTPS)</label>
                <input
                  type="url"
                  required
                  placeholder="https://api.yourdomain.com/webhooks/licensepulse"
                  value={newEndpointUrl}
                  onChange={(e) => setNewEndpointUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#101214] border border-[#292d30] text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Integration Format</label>
                <select
                  value={newEndpointProvider}
                  onChange={(e) => setNewEndpointProvider(e.target.value as WebhookProvider)}
                  className="w-full px-3 py-2 rounded-lg bg-[#101214] border border-[#292d30] text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="generic">Standard LicensePulse JSON Webhook</option>
                  <option value="stripe">Stripe Connect Compatible</option>
                  <option value="lemonsqueezy">Lemon Squeezy Order Format</option>
                  <option value="shopify">Shopify Webhook Format</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-2">Subscribed Event Triggers</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'license.created', label: 'license.created' },
                    { id: 'seat.bound', label: 'seat.bound' },
                    { id: 'seat.unbound', label: 'seat.unbound' },
                    { id: 'license.renewed', label: 'license.renewed' },
                    { id: 'license.expired', label: 'license.expired' },
                    { id: 'payment.failed', label: 'payment.failed' },
                    { id: 'payment.succeeded', label: 'payment.succeeded' }
                  ].map(item => (
                    <label key={item.id} className="flex items-center space-x-2 cursor-pointer p-1.5 rounded-lg bg-[#151719] border border-[#262a2d]">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(item.id as WebhookEventType)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEvents([...selectedEvents, item.id as WebhookEventType]);
                          } else {
                            setSelectedEvents(selectedEvents.filter(x => x !== item.id));
                          }
                        }}
                        className="rounded-md accent-cyan-400 bg-[#101214] border-[#292d30]"
                      />
                      <span className="font-mono text-[11px] text-slate-300">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#151719] border-t border-[#262a2d] flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-950 bg-cyan-500 hover:bg-cyan-400 cursor-pointer shadow-sm"
              >
                Create Subscription
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
