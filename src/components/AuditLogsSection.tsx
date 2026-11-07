import React, { useState, useMemo } from 'react';
import { 
  Sliders, 
  Search, 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Activity, 
  Laptop, 
  Clock, 
  Globe, 
  ChevronRight, 
  X,
  Code2
} from 'lucide-react';
import { useLicense } from '../context/LicenseContext';
import { AuditLog, AuditAction, AuditStatus } from '../types';

export const AuditLogsSection: React.FC = () => {
  const { auditLogs, auditTotal, refreshAuditQuery, exportAuditLogs } = useLicense();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(1);

  React.useEffect(() => {
    const eventMap: Record<string, string> = {
      CREATION: 'LICENSE_CREATED', REVOCATION: 'LICENSE_REVOKED', RENEWAL: 'LICENSE_RENEWED',
      ARCHIVE: 'LICENSE_ARCHIVED', FEATURES_UPDATED: 'LICENSE_FEATURES_UPDATED',
      VALIDATION: 'CLIENT_LICENSE_VALIDATED,CLIENT_LICENSE_REJECTED',
      ACTIVATION: 'CLIENT_DEVICE_ACTIVATED', DEACTIVATION: 'CLIENT_DEVICE_DEACTIVATED',
      EMAIL_SENT: 'LICENSE_EMAIL_ACCEPTED', EMAIL_FAILED: 'LICENSE_EMAIL_FAILED',
    };
    const outcomeMap: Record<string, string> = { SUCCESS: 'success', FAILED: 'failure', WARN: 'warning' };
    const event = actionFilter === 'all' ? 'all' : (eventMap[actionFilter] || actionFilter);
    void refreshAuditQuery({ event, outcome: outcomeMap[statusFilter] || 'all', page });
  }, [refreshAuditQuery, actionFilter, statusFilter, page]);

  React.useEffect(() => { setPage(1); }, [actionFilter, statusFilter]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        !term ||
        log.licenseKey.toLowerCase().includes(term) ||
        (log.productName && log.productName.toLowerCase().includes(term)) ||
        log.ipAddress.toLowerCase().includes(term) ||
        log.location.toLowerCase().includes(term) ||
        log.deviceName.toLowerCase().includes(term) ||
        (log.reason && log.reason.toLowerCase().includes(term));

      return matchesSearch;
    });
  }, [auditLogs, searchTerm, actionFilter, statusFilter]);

  const getStatusBadge = (status: AuditStatus) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono bg-[#15201e] text-[#10b981] border border-[#065f46]">
            <CheckCircle2 className="w-3 h-3 text-[#10b981]" />
            <span>Success</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono bg-rose-950/70 text-rose-300 border border-rose-800/60">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>Failed</span>
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono bg-amber-950/70 text-amber-300 border border-amber-800/60">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>Warning</span>
          </span>
        );
    }
  };

  const getActionBadge = (action: AuditAction) => {
    return (
      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-[#191c1f] text-[#46cbb5] border border-[#292d30]">
        {action}
      </span>
    );
  };

  return (
    <div className="bg-[#191c1f] border border-[#292d30] rounded-xl shadow-xl overflow-hidden text-slate-100 font-sans animate-in fade-in duration-200">
      
      {/* Header & Export Actions */}
      <div className="p-6 border-b border-[#292d30] space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2.5">
              <Sliders className="w-5 h-5 text-[#46cbb5]" />
              <h2 className="text-base sm:text-lg font-bold text-white font-mono">
                License Audit History
              </h2>
              <span className="text-[10px] font-mono text-slate-400">{auditTotal.toLocaleString()} events</span>
              <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono bg-[#15201e] text-[#10b981] border border-[#065f46]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                <span>SERVER EVENTS</span>
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Showing up to 1,000 matching server events; export includes the first 1,000.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => exportAuditLogs('csv')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-[#191c1f] hover:bg-[#292d30] border border-[#292d30] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#46cbb5]" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => exportAuditLogs('json')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-[#191c1f] hover:bg-[#292d30] border border-[#292d30] transition-colors cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-[#46cbb5]" />
              <span>Export JSON</span>
            </button>

          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs by key, IP, device, reason..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-[#101214] border border-[#292d30] text-white placeholder-slate-500 focus:outline-hidden focus:border-[#2db39f]"
            />
          </div>

          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs bg-[#101214] border border-[#292d30] text-slate-200 focus:outline-hidden focus:border-[#2db39f]"
          >
            <option value="all">All Action Types</option>
            <option value="VALIDATION">VALIDATION (Key Verification)</option>
            <option value="ACTIVATION">ACTIVATION (Device Binding)</option>
            <option value="DEACTIVATION">DEACTIVATION (Seat Release)</option>
            <option value="REVOCATION">REVOCATION (Admin Revoke)</option>
            <option value="HEARTBEAT">HEARTBEAT (Health Check)</option>
            <option value="CREATION">CREATION (New License)</option>
            <option value="RENEWAL">RENEWAL (License Extension)</option>
            <option value="ARCHIVE">ARCHIVE (Hidden From List)</option>
            <option value="FEATURES_UPDATED">FEATURES_UPDATED (Entitlements)</option>
            <option value="EMAIL_SENT">EMAIL_SENT (SMTP accepted)</option>
            <option value="EMAIL_FAILED">EMAIL_FAILED (Delivery rejected)</option>
            <option value="RENEWAL_ALERT">RENEWAL_ALERT (Automated Notice)</option>
            <option value="RETRIEVAL">RETRIEVAL (Web Lookup)</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs bg-[#101214] border border-[#292d30] text-slate-200 focus:outline-hidden focus:border-[#2db39f]"
          >
            <option value="all">All Outcomes (Success / Fail / Warn)</option>
            <option value="SUCCESS">Success Only</option>
            <option value="FAILED">Failed / Rejected Only</option>
            <option value="WARN">Warnings Only</option>
          </select>

        </div>

      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#101214] text-slate-400 border-b border-[#292d30] font-semibold uppercase tracking-wider text-[10px] font-mono">
            <tr>
              <th className="py-3.5 px-4">Timestamp</th>
              <th className="py-3.5 px-4">Action &amp; Status</th>
              <th className="py-3.5 px-4">License Key &amp; Product</th>
              <th className="py-3.5 px-4">Hardware Device / OS</th>
              <th className="py-3.5 px-4">IP &amp; Geolocation</th>
              <th className="py-3.5 px-4">Reason / Details</th>
              <th className="py-3.5 px-4 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262a2d] text-slate-300">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 font-mono">
                  <Activity className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-300">No audit events match your filters</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Lifecycle history appears here as admin actions are recorded.</p>
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => {
                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-[#191c1f]/50 cursor-pointer transition-colors"
                  >
                    
                    {/* Timestamp */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 text-slate-200">
                        <Clock className="w-3.5 h-3.5 text-[#46cbb5]" />
                        <span className="font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                    </td>

                    {/* Action & Status */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col space-y-1">
                        <div>{getActionBadge(log.action)}</div>
                        <div>{getStatusBadge(log.status)}</div>
                      </div>
                    </td>

                    {/* Key & Product */}
                    <td className="py-3 px-4">
                      <p className="font-mono font-bold text-[#46cbb5] select-all">
                        {log.licenseKey}
                      </p>
                      <p className="text-[11px] text-slate-300">
                        {log.productName || 'Unregistered Product'}
                      </p>
                    </td>

                    {/* Device & OS */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5 font-medium text-white">
                        <Laptop className="w-3.5 h-3.5 text-[#46cbb5]" />
                        <span className="truncate max-w-[150px]">{log.deviceName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        {log.os} • {log.clientVersion}
                      </span>
                    </td>

                    {/* IP & Location */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1 font-mono text-slate-200">
                        <span>{log.ipAddress}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-[10px] text-slate-400 mt-0.5">
                        <Globe className="w-3 h-3 text-[#46cbb5]" />
                        <span>{log.location}</span>
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-4 max-w-[240px]">
                      <p className="text-[11px] text-slate-300 line-clamp-2">
                        {log.reason || 'Standard authorization check completed'}
                      </p>
                      {log.latencyMs !== null && <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                        Server duration: {log.latencyMs}ms
                      </span>}
                    </td>

                    {/* Inspect Button */}
                    <td className="py-3 px-4 text-right">
                      <span className="p-1 text-slate-400 hover:text-white inline-block">
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {auditTotal > 100 && <div className="flex items-center justify-between border-t border-[#292d30] bg-[#151719] px-4 py-3 text-xs text-slate-400">
        <span>Page {page} of {Math.ceil(auditTotal / 100)} · {auditTotal.toLocaleString()} matching events</span>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage(current => Math.max(1, current - 1))} className="rounded border border-[#303438] px-2.5 py-1 disabled:opacity-40">Previous</button>
          <button type="button" disabled={page >= Math.ceil(auditTotal / 100)} onClick={() => setPage(current => current + 1)} className="rounded border border-[#303438] px-2.5 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>}

      {/* Log Detail Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-[#191c1f] border border-[#292d30] rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150 space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#292d30]">
              <div className="flex items-center space-x-2.5">
                <Sliders className="w-5 h-5 text-[#46cbb5]" />
                <h3 className="font-bold text-base text-white font-mono">
                  Audit Attempt Telemetry Inspector
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#101214] border border-[#292d30]">
                <span className="text-slate-400 uppercase text-[10px] font-bold font-mono">Action Type</span>
                <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
              </div>

              <div className="p-3 rounded-lg bg-[#101214] border border-[#292d30]">
                <span className="text-slate-400 uppercase text-[10px] font-bold font-mono">Outcome</span>
                <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
              </div>
            </div>

            {/* Detailed Metadata */}
            <div className="p-4 rounded-lg bg-[#101214] border border-[#292d30] space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#262a2d]">
                <span className="text-slate-400 font-mono">License Key:</span>
                <span className="font-mono font-bold text-[#46cbb5]">{selectedLog.licenseKey}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#262a2d]">
                <span className="text-slate-400 font-mono">Product Name:</span>
                <span className="font-semibold text-slate-200">{selectedLog.productName || 'N/A'}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#262a2d]">
                <span className="text-slate-400 font-mono">Device Hardware:</span>
                <span className="text-slate-200 font-medium">{selectedLog.deviceName} ({selectedLog.os})</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#262a2d]">
                <span className="text-slate-400 font-mono">Hardware Fingerprint:</span>
                <span className="font-mono text-slate-400 text-[11px]">{selectedLog.deviceFingerprint}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#262a2d]">
                <span className="text-slate-400 font-mono">Remote IP &amp; Location:</span>
                <span className="text-slate-200">{selectedLog.ipAddress} ({selectedLog.location})</span>
              </div>

              {selectedLog.latencyMs !== null && <div className="flex justify-between py-1 border-b border-[#262a2d]">
                <span className="text-slate-400 font-mono">Server Duration:</span>
                <span className="font-mono text-slate-200">{selectedLog.latencyMs} ms</span>
              </div>}

              <div className="pt-1">
                <span className="text-slate-400 block mb-1 font-mono">Server Response Reason / Error Code:</span>
                <p className="p-2.5 rounded-lg bg-[#191c1f] border border-[#292d30] font-mono text-xs text-slate-200">
                  {selectedLog.reason || 'Authentication verified successfully.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-[#191c1f] hover:bg-[#292d30] border border-[#292d30] cursor-pointer"
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
