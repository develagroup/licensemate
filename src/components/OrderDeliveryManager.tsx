import React, { useState } from 'react';
import { 
  ShoppingBag, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Mail, 
  Send, 
  RotateCw, 
  KeyRound, 
  Search, 
  Eye, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldAlert,
  CheckCircle
} from 'lucide-react';
import { useLicense } from '../context/LicenseContext';
import { PurchaseOrder, OrderProvider, LicensePlan, BillingCycle } from '../types';

export const OrderDeliveryManager: React.FC = () => {
  const { 
    orders, 
    products, 
    processIncomingOrder, 
    resendOrderEmail, 
    deleteOrder,
    licenses
  } = useLicense();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  // Simulation Form State
  const [simProvider, setSimProvider] = useState<OrderProvider>('stripe');
  const [simEmail, setSimEmail] = useState('alex.turner@arctic-tech.io');
  const [simName, setSimName] = useState('Alex Turner');
  const [simProductId, setSimProductId] = useState(products[0]?.id || 'prod_devflow_01');
  const [simPlan, setSimPlan] = useState<LicensePlan>('pro');
  const [simBillingCycle, setSimBillingCycle] = useState<BillingCycle>('annual');
  const [simMaxDevices, setSimMaxDevices] = useState(3);
  const [simAmount, setSimAmount] = useState(149);
  const [simPaymentStatus, setSimPaymentStatus] = useState<'paid' | 'failed'>('paid');
  const [simFailReason, setSimFailReason] = useState('Card declined by issuing bank (insufficient_funds)');
  const [simSimulateEmailFail, setSimSimulateEmailFail] = useState(false);
  const [simCustomOrderId, setSimCustomOrderId] = useState('');

  // Simulation execution state
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentSimStep, setCurrentSimStep] = useState<number>(0);
  const [simResultNotice, setSimResultNotice] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  
  // Resend state tracking
  const [resendingOrderId, setResendingOrderId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedProduct = products.find(p => p.id === simProductId) || products[0];

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Run Order Simulation
  const handleExecuteSimulation = async () => {
    setIsSimulating(true);
    setCurrentSimStep(1);
    setSimResultNotice(null);

    await new Promise(r => setTimeout(r, 450));
    setCurrentSimStep(2);

    await new Promise(r => setTimeout(r, 450));
    if (simPaymentStatus === 'failed') {
      const result = await processIncomingOrder({
        externalOrderId: simCustomOrderId || undefined,
        provider: simProvider,
        customerEmail: simEmail,
        customerName: simName,
        productId: selectedProduct?.id,
        productName: selectedProduct?.name || 'DevFlow IDE Pro',
        plan: simPlan,
        maxDevices: simMaxDevices,
        billingCycle: simBillingCycle,
        amount: simAmount,
        currency: 'USD',
        paymentStatus: 'failed',
        failureReason: simFailReason,
      });

      setCurrentSimStep(5);
      setIsSimulating(false);
      setSimResultNotice({
        type: 'error',
        message: `Payment Declined! License generation strictly blocked per security policy. Order logged as unfulfilled.`
      });
      setSelectedOrder(result.order);
      return;
    }

    setCurrentSimStep(3);
    await new Promise(r => setTimeout(r, 450));

    setCurrentSimStep(4);
    await new Promise(r => setTimeout(r, 450));

    const result = await processIncomingOrder({
      externalOrderId: simCustomOrderId || undefined,
      provider: simProvider,
      customerEmail: simEmail,
      customerName: simName,
      productId: selectedProduct?.id,
      productName: selectedProduct?.name || 'DevFlow IDE Pro',
      plan: simPlan,
      maxDevices: simMaxDevices,
      billingCycle: simBillingCycle,
      amount: simAmount,
      currency: 'USD',
      paymentStatus: 'paid',
      simulateEmailFailure: simSimulateEmailFail,
    });

    setCurrentSimStep(5);
    setIsSimulating(false);

    if (result.duplicateBlocked) {
      setSimResultNotice({
        type: 'warning',
        message: `Idempotency Guard: Duplicate webhook detected (Order ID: ${result.order.externalOrderId}). Replay blocked!`
      });
    } else if (result.order.status === 'email_failed') {
      setSimResultNotice({
        type: 'warning',
        message: `License created (${result.license?.key}), but customer SMTP delivery failed. Click 'Resend Email' to retry.`
      });
    } else {
      setSimResultNotice({
        type: 'success',
        message: `Order fulfilled! Generated Key: ${result.license?.key} & dispatched activation email to ${simEmail}`
      });
    }

    setSelectedOrder(result.order);
  };

  // Quick Preset Scenarios
  const applyPreset = (preset: 'stripe_success' | 'lemonsqueezy_enterprise' | 'failed_payment' | 'duplicate_test' | 'email_timeout') => {
    switch (preset) {
      case 'stripe_success':
        setSimProvider('stripe');
        setSimEmail('alex.turner@arctic-tech.io');
        setSimName('Alex Turner');
        setSimPlan('pro');
        setSimBillingCycle('annual');
        setSimMaxDevices(3);
        setSimAmount(149);
        setSimPaymentStatus('paid');
        setSimSimulateEmailFail(false);
        setSimCustomOrderId('');
        break;
      case 'lemonsqueezy_enterprise':
        setSimProvider('lemonsqueezy');
        setSimEmail('enterprise.procure@spacenet.org');
        setSimName('Marcus Vance');
        setSimPlan('enterprise');
        setSimBillingCycle('annual');
        setSimMaxDevices(20);
        setSimAmount(999);
        setSimPaymentStatus('paid');
        setSimSimulateEmailFail(false);
        setSimCustomOrderId('');
        break;
      case 'failed_payment':
        setSimProvider('stripe');
        setSimEmail('declined.customer@fraudcheck.net');
        setSimName('Declined Buyer');
        setSimPlan('pro');
        setSimBillingCycle('monthly');
        setSimMaxDevices(1);
        setSimAmount(29);
        setSimPaymentStatus('failed');
        setSimFailReason('Card was declined (do_not_honor / insufficient_funds)');
        setSimSimulateEmailFail(false);
        setSimCustomOrderId('');
        break;
      case 'duplicate_test':
        const existing = orders[0]?.externalOrderId || 'cs_live_992183_devflow';
        setSimProvider('stripe');
        setSimEmail('jane.foster@apexcloud.io');
        setSimName('Jane Foster');
        setSimPlan('pro');
        setSimBillingCycle('annual');
        setSimMaxDevices(3);
        setSimAmount(299);
        setSimPaymentStatus('paid');
        setSimSimulateEmailFail(false);
        setSimCustomOrderId(existing);
        break;
      case 'email_timeout':
        setSimProvider('shopify');
        setSimEmail('claire.daniels@cloudmesh.dev');
        setSimName('Claire Daniels');
        setSimPlan('pro');
        setSimBillingCycle('annual');
        setSimMaxDevices(2);
        setSimAmount(199);
        setSimPaymentStatus('paid');
        setSimSimulateEmailFail(true);
        setSimCustomOrderId('');
        break;
    }
  };

  const handleResend = async (orderId: string) => {
    setResendingOrderId(orderId);
    try {
      const ok = await resendOrderEmail(orderId);
      if (ok) {
        setSimResultNotice({
          type: 'success',
          message: `Delivery email successfully resent to customer!`
        });
        if (selectedOrder && selectedOrder.id === orderId) {
          const updated = orders.find(o => o.id === orderId);
          if (updated) setSelectedOrder(updated);
        }
      }
    } finally {
      setResendingOrderId(null);
    }
  };

  // Filtered Orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.licenseKey && order.licenseKey.toLowerCase().includes(searchQuery.toLowerCase())) ||
      order.externalOrderId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProvider = providerFilter === 'all' || order.provider === providerFilter;
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesProvider && matchesStatus;
  });

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const paymentFailedOrders = orders.filter(o => o.status === 'payment_failed').length;
  const emailFailedOrders = orders.filter(o => o.status === 'email_failed').length;

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* Header & Architecture Banner */}
      <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <ShoppingBag className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Automated License Creation &amp; Email Delivery System
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
              End-to-end automated pipeline: <strong className="text-cyan-300">Receive Order → Verify Payment → Generate License → Save License → Email Customer</strong>
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-[#151719] border border-[#262a2d] text-xs font-mono">
              <span className="text-slate-400">Total Ingested:</span>{' '}
              <strong className="text-white font-bold">{totalOrders}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-mono">
              <span>Fulfilled:</span>{' '}
              <strong className="font-bold">{completedOrders}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 font-mono">
              <span>Payment Blocked:</span>{' '}
              <strong className="font-bold">{paymentFailedOrders}</strong>
            </div>
            {emailFailedOrders > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400 animate-pulse font-mono">
                <span>Email Retry Needed:</span>{' '}
                <strong className="font-bold">{emailFailedOrders}</strong>
              </div>
            )}
          </div>
        </div>

        {/* 4-Step Visual Architecture Flow */}
        <div className="mt-6 pt-5 border-t border-[#262a2d]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            
            {/* Step 1 */}
            <div className="p-3.5 rounded-lg bg-[#151719] border border-[#262a2d] relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
                  Step 1
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
              </div>
              <h4 className="text-xs font-bold text-white mt-1">
                Receive Order
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Ingests webhook payload from Stripe, Lemon Squeezy, or Shopify with idempotency check.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-lg bg-[#151719] border border-[#262a2d] relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                  Step 2
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <h4 className="text-xs font-bold text-white mt-1">
                Verify Payment
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Verifies payment status before issuing anything. Failed payments strictly block issuance.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-lg bg-[#151719] border border-[#262a2d] relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 font-mono">
                  Step 3 &amp; 4
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
              </div>
              <h4 className="text-xs font-bold text-white mt-1">
                Generate &amp; Save License
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Generates key with correct product, plan, seats &amp; duration. Persists and links to customer order.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-3.5 rounded-lg bg-[#151719] border border-[#262a2d] relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
                  Step 5
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
              </div>
              <h4 className="text-xs font-bold text-white mt-1">
                Email Customer
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Dispatches license key &amp; activation guide. If email fails, key remains valid with 1-click resend.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Order Fulfillment Testing & Simulation Workbench */}
      <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Live Order Pipeline Simulator &amp; Edge Case Testing
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate incoming customer orders to test verification, auto-generation, and error recovery.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center flex-wrap gap-1.5 font-mono">
            <span className="text-xs font-semibold text-slate-400 mr-1">Presets:</span>
            <button
              onClick={() => applyPreset('stripe_success')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[#151719] hover:bg-[#151719] text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
            >
              Stripe Success
            </button>
            <button
              onClick={() => applyPreset('lemonsqueezy_enterprise')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[#151719] hover:bg-[#151719] text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
            >
              Lemon Squeezy Enterprise
            </button>
            <button
              onClick={() => applyPreset('failed_payment')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
            >
              Declined Payment
            </button>
            <button
              onClick={() => applyPreset('duplicate_test')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[#151719] hover:bg-[#151719] text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
            >
              Duplicate Guard
            </button>
            <button
              onClick={() => applyPreset('email_timeout')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
            >
              Email Timeout
            </button>
          </div>
        </div>

        {/* Simulation Configuration Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-[#151719] border border-[#262a2d] mb-5">
          
          {/* Provider */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
              Payment Gateway
            </label>
            <select
              value={simProvider}
              onChange={(e) => setSimProvider(e.target.value as OrderProvider)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-[#101214] border border-[#292d30] text-white focus:outline-none font-medium"
            >
              <option value="stripe">Stripe Checkout / Elements</option>
              <option value="lemonsqueezy">Lemon Squeezy Webhook</option>
              <option value="shopify">Shopify Storefront</option>
              <option value="direct_checkout">Direct API Checkout</option>
            </select>
          </div>

          {/* Product */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
              Software Product
            </label>
            <select
              value={simProductId}
              onChange={(e) => setSimProductId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-[#101214] border border-[#292d30] text-white focus:outline-none font-medium"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.keyPrefix})</option>
              ))}
            </select>
          </div>

          {/* Plan Tier */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
              License Plan &amp; Seats
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={simPlan}
                onChange={(e) => {
                  const val = e.target.value as LicensePlan;
                  setSimPlan(val);
                  if (val === 'starter') setSimMaxDevices(1);
                  if (val === 'pro') setSimMaxDevices(3);
                  if (val === 'enterprise') setSimMaxDevices(10);
                }}
                className="w-full px-2.5 py-2 text-xs rounded-lg bg-[#101214] border border-[#292d30] text-white focus:outline-none font-medium"
              >
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
                <option value="lifetime">Lifetime</option>
              </select>
              <input
                type="number"
                min={1}
                max={50}
                value={simMaxDevices}
                onChange={(e) => setSimMaxDevices(parseInt(e.target.value, 10) || 1)}
                placeholder="Seats"
                className="w-full px-2.5 py-2 text-xs rounded-lg bg-[#101214] border border-[#292d30] text-white focus:outline-none font-medium"
              />
            </div>
          </div>

          {/* Customer Email */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
              Customer Purchase Email
            </label>
            <input
              type="email"
              value={simEmail}
              onChange={(e) => setSimEmail(e.target.value)}
              placeholder="customer@example.com"
              className="w-full px-3 py-2 text-xs rounded-lg bg-[#101214] border border-[#292d30] text-white focus:outline-none font-medium font-mono"
            />
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
              Customer Full Name
            </label>
            <input
              type="text"
              value={simName}
              onChange={(e) => setSimName(e.target.value)}
              placeholder="Alex Turner"
              className="w-full px-3 py-2 text-xs rounded-lg bg-[#101214] border border-[#292d30] text-white focus:outline-none font-medium"
            />
          </div>

          {/* Price & Billing */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
              Price ($ USD) &amp; Frequency
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={simAmount}
                onChange={(e) => setSimAmount(parseInt(e.target.value, 10) || 0)}
                className="w-full px-2.5 py-2 text-xs rounded-lg bg-[#101214] border border-[#292d30] text-white font-medium"
              />
              <select
                value={simBillingCycle}
                onChange={(e) => setSimBillingCycle(e.target.value as BillingCycle)}
                className="w-full px-2 py-2 text-xs rounded-lg bg-[#101214] border border-[#292d30] text-white font-medium"
              >
                <option value="annual">Annual</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
          </div>

          {/* Payment Verification Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
              Payment Verification Result
            </label>
            <select
              value={simPaymentStatus}
              onChange={(e) => setSimPaymentStatus(e.target.value as 'paid' | 'failed')}
              className={`w-full px-3 py-2 text-xs rounded-lg border font-bold font-mono ${
                simPaymentStatus === 'paid'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              <option value="paid">✓ Verified (Paid)</option>
              <option value="failed">✕ Unverified / Declined</option>
            </select>
          </div>

          {/* External Order ID (For Idempotency Testing) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
              External Order ID (Idempotency)
            </label>
            <input
              type="text"
              value={simCustomOrderId}
              onChange={(e) => setSimCustomOrderId(e.target.value)}
              placeholder="Auto-generate new ID"
              className="w-full px-3 py-2 text-xs rounded-lg bg-[#101214] border border-[#292d30] text-white font-mono focus:outline-none"
            />
          </div>

        </div>

        {/* Edge Case Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pt-1">
          <div className="flex items-center space-x-6">
            <label className="inline-flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={simSimulateEmailFail}
                onChange={(e) => setSimSimulateEmailFail(e.target.checked)}
                className="w-4 h-4 rounded-md accent-cyan-400 border-[#292d30]"
              />
              <span>Simulate SMTP Email Timeout (Tests admin resend capability)</span>
            </label>
          </div>

          {/* Action Trigger Button */}
          <button
            onClick={handleExecuteSimulation}
            disabled={isSimulating}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-bold text-slate-950 bg-cyan-500 hover:bg-cyan-400 shadow-md transition-all cursor-pointer"
          >
            {isSimulating ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Executing Pipeline...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Simulate Inbound Order Event</span>
              </>
            )}
          </button>
        </div>

        {/* Live Step Progress Indicator during/after execution */}
        {(isSimulating || currentSimStep > 0) && (
          <div className="p-4 rounded-xl bg-[#151719] text-white border border-[#262a2d] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">PIPELINE EXECUTION STATE:</span>
              <span className="text-cyan-300 font-bold">
                {currentSimStep === 1 && 'STEP 1: INGESTING ORDER'}
                {currentSimStep === 2 && 'STEP 2: VERIFYING PAYMENT TRANSACTION'}
                {currentSimStep === 3 && 'STEP 3: GENERATING PRODUCT LICENSE'}
                {currentSimStep === 4 && 'STEP 4: DISPATCHING ACTIVATION EMAIL'}
                {currentSimStep === 5 && 'PIPELINE COMPLETE'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 font-mono">
              <div className={`p-2.5 rounded-lg border text-xs ${
                currentSimStep >= 1 ? 'bg-cyan-500/10 border-cyan-500/30 text-white' : 'bg-[#101214] border-[#292d30] text-slate-600'
              }`}>
                <div className="flex items-center space-x-1.5 font-bold">
                  {currentSimStep > 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clock className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
                  <span>1. Received</span>
                </div>
              </div>

              <div className={`p-2.5 rounded-lg border text-xs ${
                currentSimStep >= 2 
                  ? simPaymentStatus === 'failed' 
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-[#101214] border-[#292d30] text-slate-600'
              }`}>
                <div className="flex items-center space-x-1.5 font-bold">
                  {currentSimStep > 2 ? (
                    simPaymentStatus === 'failed' ? <XCircle className="w-3.5 h-3.5 text-rose-400" /> : <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : currentSimStep === 2 ? (
                    <Clock className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  ) : (
                    <span>2.</span>
                  )}
                  <span>2. Payment</span>
                </div>
              </div>

              <div className={`p-2.5 rounded-lg border text-xs ${
                currentSimStep >= 3 
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-white' 
                  : simPaymentStatus === 'failed' && currentSimStep === 5
                  ? 'bg-[#101214] border-[#292d30] text-slate-700 line-through'
                  : 'bg-[#101214] border-[#292d30] text-slate-600'
              }`}>
                <div className="flex items-center space-x-1.5 font-bold">
                  {currentSimStep > 3 ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : currentSimStep === 3 ? (
                    <Clock className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  ) : (
                    <span>3.</span>
                  )}
                  <span>3. License</span>
                </div>
              </div>

              <div className={`p-2.5 rounded-lg border text-xs ${
                currentSimStep >= 4 
                  ? simSimulateEmailFail 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                    : 'bg-cyan-500/10 border-cyan-500/30 text-white'
                  : simPaymentStatus === 'failed' && currentSimStep === 5
                  ? 'bg-[#101214] border-[#292d30] text-slate-700 line-through'
                  : 'bg-[#101214] border-[#292d30] text-slate-600'
              }`}>
                <div className="flex items-center space-x-1.5 font-bold">
                  {currentSimStep === 5 ? (
                    simSimulateEmailFail ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> : <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : currentSimStep === 4 ? (
                    <Clock className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  ) : (
                    <span>4.</span>
                  )}
                  <span>4. Email</span>
                </div>
              </div>
            </div>

            {simResultNotice && (
              <div className={`p-3 rounded-lg text-xs font-medium flex items-center space-x-2 ${
                simResultNotice.type === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : simResultNotice.type === 'error'
                  ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
              }`}>
                {simResultNotice.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                {simResultNotice.type === 'error' && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                {simResultNotice.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                <span>{simResultNotice.message}</span>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Orders Dashboard & Step Inspection Table */}
      <div className="bg-[#191c1f] border border-[#292d30] rounded-xl shadow-sm overflow-hidden">
        
        {/* Table Header & Controls */}
        <div className="p-5 border-b border-[#262a2d] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">
                Orders &amp; Delivery Status Dashboard
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Full 4-step status breakdown for every purchase order across all connected billing providers
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-mono">
                Showing <strong className="text-cyan-300">{filteredOrders.length}</strong> of {orders.length} orders
              </span>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Order #, Customer Email, Name, Product, or License Key..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-[#101214] border border-[#292d30] text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500"
              />
            </div>

            <div className="flex items-center space-x-2 font-mono">
              {/* Provider Filter */}
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg bg-[#101214] border border-[#292d30] text-slate-200 focus:outline-none font-medium"
              >
                <option value="all">All Providers</option>
                <option value="stripe">Stripe</option>
                <option value="lemonsqueezy">Lemon Squeezy</option>
                <option value="shopify">Shopify</option>
                <option value="direct_checkout">Direct API</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg bg-[#101214] border border-[#292d30] text-slate-200 focus:outline-none font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="payment_failed">Payment Failed</option>
                <option value="email_failed">Email Failed (Retry)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262a2d] bg-[#151719] text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Order / Customer</th>
                <th className="py-3 px-3">Product &amp; Plan</th>
                <th className="py-3 px-3 text-center">1. Received</th>
                <th className="py-3 px-3 text-center">2. Payment</th>
                <th className="py-3 px-3 text-center">3. License</th>
                <th className="py-3 px-3 text-center">4. Email</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262a2d] text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-mono">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                    <p className="font-semibold text-slate-300">No purchase orders found</p>
                    <p className="text-xs mt-0.5 text-slate-500">Adjust your filters or use the simulator above to test incoming orders.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const s1 = order.steps.orderReceived;
                  const s2 = order.steps.paymentVerified;
                  const s3 = order.steps.licenseCreated;
                  const s4 = order.steps.emailSent;

                  return (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-[#151719]/60 transition-colors ${
                        selectedOrder?.id === order.id ? 'bg-[#151719]' : ''
                      }`}
                    >
                      {/* Order & Customer */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start space-x-2.5">
                          <div className="mt-0.5">
                            <span className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                              {order.provider}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono font-bold text-white">
                                {order.orderNumber}
                              </span>
                              <span className="text-[11px] text-cyan-400 font-mono">
                                (${order.amount})
                              </span>
                            </div>
                            <div className="text-xs text-slate-200 font-medium">
                              {order.customerName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {order.customerEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Product & Plan */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-white">
                          {order.productName}
                        </div>
                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-0.5 font-mono">
                          <span className="capitalize font-bold text-cyan-300">{order.plan}</span>
                          <span>•</span>
                          <span>{order.maxDevices} Seat(s)</span>
                          <span>•</span>
                          <span className="capitalize">{order.billingCycle}</span>
                        </div>
                      </td>

                      {/* Step 1: Order Received */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          {s1.status === 'success' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Received</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-[#101214] text-slate-400">
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          )}
                          <span className="text-[9px] text-slate-500 mt-1 font-mono">
                            {new Date(s1.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>

                      {/* Step 2: Payment Verified */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          {s2.status === 'success' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Verified (${s2.amount})</span>
                            </span>
                          ) : s2.status === 'failed' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              <XCircle className="w-3 h-3 text-rose-400" />
                              <span>Failed</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-[#101214] text-slate-400">
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Step 3: License Created */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          {s3.status === 'success' ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                                <KeyRound className="w-3 h-3 text-cyan-400" />
                                <span>Created</span>
                              </span>
                              {s3.licenseKey && (
                                <div className="flex items-center justify-center space-x-1">
                                  <span className="font-mono text-[10px] text-cyan-300 bg-[#101214] px-1.5 py-0.5 rounded-md border border-[#292d30]">
                                    {s3.licenseKey.slice(0, 10)}...
                                  </span>
                                  <button
                                    onClick={() => handleCopy(s3.licenseKey!)}
                                    title="Copy Key"
                                    className="text-slate-400 hover:text-white"
                                  >
                                    {copiedKey === s3.licenseKey ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : s3.status === 'skipped' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              <ShieldAlert className="w-3 h-3 text-rose-400" />
                              <span>Blocked</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-[#101214] text-slate-400">
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Step 4: Email Sent */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          {s4.status === 'success' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                              <Mail className="w-3 h-3 text-cyan-400" />
                              <span>Sent {s4.resendCount && s4.resendCount > 0 ? `(x${s4.resendCount})` : ''}</span>
                            </span>
                          ) : s4.status === 'failed' ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                <span>Failed Delivery</span>
                              </span>
                              <button
                                onClick={() => handleResend(order.id)}
                                disabled={resendingOrderId === order.id}
                                className="block mx-auto text-[10px] font-bold text-cyan-300 hover:underline cursor-pointer font-mono"
                              >
                                {resendingOrderId === order.id ? 'Resending...' : 'Resend Email'}
                              </button>
                            </div>
                          ) : s4.status === 'skipped' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-[#101214] text-slate-500">
                              <span>Skipped</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-[#101214] text-slate-400">
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-[#292d30] transition-colors cursor-pointer"
                            title="Inspect Order Pipeline"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {order.licenseKey && (
                            <button
                              onClick={() => handleResend(order.id)}
                              disabled={resendingOrderId === order.id}
                              className="p-1.5 rounded-md text-cyan-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-[#292d30] transition-colors cursor-pointer"
                              title="Resend License Email"
                            >
                              <RotateCw className={`w-4 h-4 ${resendingOrderId === order.id ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Order Details & Pipeline Inspection Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#191c1f] rounded-xl max-w-2xl w-full border border-[#292d30] shadow-2xl overflow-hidden animate-in fade-in duration-150">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#262a2d] bg-[#151719] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Order {selectedOrder.orderNumber}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-mono font-bold border ${
                      selectedOrder.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      selectedOrder.status === 'payment_failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      {selectedOrder.status.replace('_', ' ')}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Ref: <span className="text-slate-200">{selectedOrder.externalOrderId}</span> via <strong className="uppercase text-cyan-300">{selectedOrder.provider}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Pipeline Audit Steps */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              
              {/* Customer & Product Quick Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-[#151719] border border-[#262a2d] text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Customer</span>
                  <span className="font-bold text-white">{selectedOrder.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Email</span>
                  <span className="font-medium text-slate-300 break-all">{selectedOrder.customerEmail}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Product</span>
                  <span className="font-bold text-white">{selectedOrder.productName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Tier &amp; Amount</span>
                  <span className="font-bold text-cyan-300 capitalize">{selectedOrder.plan} (${selectedOrder.amount})</span>
                </div>
              </div>

              {/* 4 Step Pipeline Audit Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  Step-by-Step Fulfillment Pipeline Execution
                </h4>

                {/* Step 1 */}
                <div className="p-3.5 rounded-lg border border-[#262a2d] bg-[#151719] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5 font-mono">
                      <span className="w-4 h-4 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold flex items-center justify-center">1</span>
                      <span>Order Received</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      ✓ SUCCESS
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {selectedOrder.steps.orderReceived.details}
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    Timestamp: {new Date(selectedOrder.steps.orderReceived.timestamp).toLocaleString()}
                  </span>
                </div>

                {/* Step 2 */}
                <div className={`p-3.5 rounded-lg border space-y-1 ${
                  selectedOrder.steps.paymentVerified.status === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-rose-500/30 bg-rose-500/10'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5 font-mono">
                      <span className="w-4 h-4 rounded-md bg-[#101214] text-slate-200 border border-[#292d30] text-[10px] font-bold flex items-center justify-center">2</span>
                      <span>Payment Verified</span>
                    </span>
                    <span className={`text-[10px] font-mono font-bold ${
                      selectedOrder.steps.paymentVerified.status === 'success' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {selectedOrder.steps.paymentVerified.status === 'success' ? '✓ VERIFIED' : '✕ VERIFICATION FAILED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {selectedOrder.steps.paymentVerified.details}
                  </p>
                  {selectedOrder.transactionId && (
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Transaction ID: {selectedOrder.transactionId}
                    </span>
                  )}
                </div>

                {/* Step 3 */}
                <div className="p-3.5 rounded-lg border border-[#262a2d] bg-[#151719] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5 font-mono">
                      <span className="w-4 h-4 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold flex items-center justify-center">3</span>
                      <span>License Generated &amp; Stored</span>
                    </span>
                    <span className={`text-[10px] font-mono font-bold ${
                      selectedOrder.steps.licenseCreated.status === 'success' ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      {selectedOrder.steps.licenseCreated.status === 'success' ? '✓ GENERATED' : '✕ BLOCKED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {selectedOrder.steps.licenseCreated.details}
                  </p>
                  {selectedOrder.licenseKey && (
                    <div className="mt-2 p-2.5 rounded-lg bg-[#101214] border border-[#292d30] flex items-center justify-between font-mono text-xs font-bold text-cyan-200">
                      <span>{selectedOrder.licenseKey}</span>
                      <button
                        onClick={() => handleCopy(selectedOrder.licenseKey!)}
                        className="p-1 rounded-md hover:bg-white/5 text-slate-400 hover:text-white"
                        title="Copy Key"
                      >
                        {copiedKey === selectedOrder.licenseKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Step 4 */}
                <div className={`p-3.5 rounded-lg border space-y-1 ${
                  selectedOrder.steps.emailSent.status === 'success'
                    ? 'border-[#262a2d] bg-[#151719]'
                    : selectedOrder.steps.emailSent.status === 'failed'
                    ? 'border-amber-500/30 bg-amber-500/10'
                    : 'border-[#262a2d] bg-[#151719]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5 font-mono">
                      <span className="w-4 h-4 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold flex items-center justify-center">4</span>
                      <span>Email Delivery</span>
                    </span>
                    <span className={`text-[10px] font-mono font-bold ${
                      selectedOrder.steps.emailSent.status === 'success' ? 'text-emerald-400' :
                      selectedOrder.steps.emailSent.status === 'failed' ? 'text-amber-400' : 'text-slate-500'
                    }`}>
                      {selectedOrder.steps.emailSent.status === 'success' ? '✓ SENT' :
                       selectedOrder.steps.emailSent.status === 'failed' ? '⚠ DELIVERY FAILED' : '✕ SKIPPED'}
                    </span>
                  </div>
                  {selectedOrder.steps.emailSent.error ? (
                    <p className="text-xs text-rose-400 font-medium">
                      Error: {selectedOrder.steps.emailSent.error}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-300 font-mono">
                      Customer recipient: {selectedOrder.customerEmail}
                    </p>
                  )}
                  {selectedOrder.licenseKey && (
                    <div className="pt-2">
                      <button
                        onClick={() => handleResend(selectedOrder.id)}
                        disabled={resendingOrderId === selectedOrder.id}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-cyan-500 hover:bg-cyan-400 transition-colors cursor-pointer shadow-sm"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${resendingOrderId === selectedOrder.id ? 'animate-spin' : ''}`} />
                        <span>Resend Activation Email Now</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Raw Payload Accordion */}
              {selectedOrder.rawPayload && (
                <div className="space-y-1 font-mono">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Raw Webhook Ingress Payload
                  </h4>
                  <pre className="p-3 rounded-lg bg-[#101214] text-slate-300 font-mono text-[11px] overflow-x-auto max-h-40 border border-[#292d30]">
                    {JSON.stringify(selectedOrder.rawPayload, null, 2)}
                  </pre>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#262a2d] bg-[#151719] flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-[#191c1f] hover:bg-[#151719] border border-[#292d30] transition-colors cursor-pointer"
              >
                Close Inspection
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
