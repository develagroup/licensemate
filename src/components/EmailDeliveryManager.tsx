import React, { useCallback, useEffect, useState } from 'react';
import { Mail, RefreshCw, RotateCcw, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { useLicense } from '../context/LicenseContext';
import { LicenseEmailDelivery } from '../types';

interface DeliveryRow extends LicenseEmailDelivery {
  licenseKeyPrefix: string | null;
  productName: string | null;
}

export const EmailDeliveryManager: React.FC = () => {
  const { retryEmailDelivery, resendLicenseKeyEmail } = useLicense();
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ page: '1', pageSize: '100' });
      if (status !== 'all') query.set('status', status);
      const response = await fetch(`/api/v1/admin/email-deliveries?${query}`, { credentials: 'same-origin' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load email history.');
      setDeliveries(result.deliveries || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load email history.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void refresh(); }, [refresh]);

  const retry = async (deliveryId: string) => {
    setWorkingId(deliveryId);
    try { await retryEmailDelivery(deliveryId); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Email retry failed.'); }
    finally { setWorkingId(null); }
  };

  const resend = async (licenseId: string, deliveryId: string) => {
    setWorkingId(deliveryId);
    try { await resendLicenseKeyEmail(licenseId); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not resend license email.'); }
    finally { setWorkingId(null); }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-[#292d30] bg-[#191c1f] text-slate-100">
      <header className="flex flex-col gap-3 border-b border-[#292d30] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-white"><Mail className="h-5 w-5 text-[#46cbb5]" /><h2 className="text-base font-bold">License email delivery</h2></div>
          <p className="mt-1 text-xs text-slate-400">A status of accepted means the SMTP server accepted the message; it does not confirm inbox delivery.</p>
        </div>
        <div className="flex gap-2">
          <select value={status} onChange={event => setStatus(event.target.value)} className="rounded-md border border-[#303438] bg-[#101214] px-3 py-2 text-xs text-slate-200">
            <option value="all">All statuses</option><option value="queued">Queued</option><option value="sending">Sending</option><option value="accepted">Accepted</option><option value="failed">Failed</option>
          </select>
          <button onClick={() => void refresh()} className="inline-flex items-center gap-1.5 rounded-md border border-[#303438] bg-[#101214] px-3 py-2 text-xs text-slate-200"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
        </div>
      </header>

      {error && <div role="alert" className="m-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</div>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-xs">
          <thead className="bg-[#101214] text-[10px] uppercase tracking-wider text-slate-400"><tr>
            <th className="px-4 py-3">Created</th><th className="px-4 py-3">License</th><th className="px-4 py-3">Recipient</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Attempts / Details</th><th className="px-4 py-3 text-right">Action</th>
          </tr></thead>
          <tbody className="divide-y divide-[#262a2d]">
            {loading ? <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading server delivery history…</td></tr>
              : deliveries.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400">No email delivery records match this filter.</td></tr>
                : deliveries.map(delivery => <tr key={delivery.id} className="hover:bg-[#151719]">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">{new Date(delivery.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3"><div className="font-semibold text-white">{delivery.productName || 'License'} · {delivery.licenseKeyPrefix || 'key'}</div><div className="mt-0.5 font-mono text-[10px] text-slate-500">{delivery.id.slice(0, 8)}</div></td>
                  <td className="px-4 py-3 text-slate-300">{delivery.recipientEmail}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-semibold ${delivery.status === 'accepted' ? 'border-emerald-700 bg-emerald-950/50 text-emerald-300' : delivery.status === 'failed' ? 'border-rose-800 bg-rose-950/50 text-rose-300' : 'border-amber-800 bg-amber-950/40 text-amber-300'}`}>
                    {delivery.status === 'accepted' ? <CheckCircle2 className="h-3 w-3" /> : delivery.status === 'failed' ? <XCircle className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}{delivery.status}
                  </span></td>
                  <td className="max-w-xs px-4 py-3 text-slate-400"><div>{delivery.attempts} attempt{delivery.attempts === 1 ? '' : 's'}{delivery.acceptedAt ? ` · accepted ${new Date(delivery.acceptedAt).toLocaleString()}` : ''}</div>{delivery.lastErrorSummary && <div className="mt-1 text-rose-300">{delivery.lastErrorCode}: {delivery.lastErrorSummary}</div>}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{(delivery.status === 'failed' || delivery.status === 'queued') && delivery.retryable
                    ? <button disabled={workingId === delivery.id} onClick={() => void retry(delivery.id)} className="inline-flex items-center gap-1 rounded-md border border-amber-700/70 px-2.5 py-1.5 text-amber-200 disabled:opacity-50"><RotateCcw className="h-3 w-3" />{workingId === delivery.id ? 'Retrying…' : delivery.status === 'queued' ? 'Send now' : 'Retry'}</button>
                    : delivery.status === 'accepted' && delivery.licenseId
                      ? <button disabled={workingId === delivery.id} onClick={() => void resend(delivery.licenseId!, delivery.id)} className="inline-flex items-center gap-1 rounded-md border border-[#303438] px-2.5 py-1.5 text-slate-200 disabled:opacity-50"><RotateCcw className="h-3 w-3" />{workingId === delivery.id ? 'Sending…' : 'Resend'}</button>
                      : <span className="text-slate-600">—</span>}</td>
                </tr>)}
          </tbody>
        </table>
      </div>
      <footer className="border-t border-[#292d30] px-4 py-3 text-[11px] text-slate-500">Showing up to 100 recent server records. License keys are encrypted in the outbox and never included in delivery history.</footer>
    </section>
  );
};
