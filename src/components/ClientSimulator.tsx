import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Laptop, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Zap, 
  KeyRound, 
  ShieldCheck, 
  Cpu, 
  Code2,
  Play
} from 'lucide-react';
import { ValidationResponse } from '../types';

interface ClientSimulatorProps {
  initialKey?: string;
}

export const ClientSimulator: React.FC<ClientSimulatorProps> = ({ initialKey = '' }) => {
  const [selectedLicenseKey, setSelectedLicenseKey] = useState<string>(initialKey);
  const [productSlug, setProductSlug] = useState<string>('');
  const [deviceName, setDeviceName] = useState<string>('MacBook-Pro-M3.local');
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('hw_mac_8f921a94');
  const [deviceOs, setDeviceOs] = useState<'macOS' | 'Windows' | 'Linux' | 'Server'>('macOS');
  const [clientVersion, setClientVersion] = useState<string>('v3.4.1');

  const [loading, setLoading] = useState<boolean>(false);
  const [lastResponse, setLastResponse] = useState<ValidationResponse | null>(null);
  const [apiLogs, setApiLogs] = useState<Array<{ time: string; method: string; url: string; status: number; message: string; payload?: any }>>([]);

  // Sync if initialKey changes from external click
  useEffect(() => {
    if (initialKey) {
      setSelectedLicenseKey(initialKey);
    }
  }, [initialKey]);

  // Generate random hardware fingerprint
  const generateNewFingerprint = () => {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(8)), value => value.toString(16).padStart(2, '0')).join('');
    const fp = `hw_${deviceOs.toLowerCase()}_${randomHex}`;
    setDeviceFingerprint(fp);
  };

  const handleSelectKeyChange = (key: string) => {
    setSelectedLicenseKey(key);
  };

  const callClientApi = async (path: string): Promise<ValidationResponse> => {
    const response = await fetch(`/api/v1/license/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: selectedLicenseKey, productSlug, fingerprint: deviceFingerprint, deviceName, platform: deviceOs, clientVersion }),
    });
    const payload = await response.json() as ValidationResponse;
    if (!response.ok && payload.code === undefined) payload.code = response.status;
    return payload;
  };

  const appendLog = (url: string, response: ValidationResponse) => {
    setApiLogs(prev => [{
      time: new Date().toLocaleTimeString(), method: 'POST', url,
      status: response.valid ? 200 : response.code,
      message: response.message || response.reason || 'Request failed.', payload: undefined,
    }, ...prev.slice(0, 15)]);
  };

  // 1. Validate Key Action
  const handleValidate = async () => {
    setLoading(true);
    try {
      const resp = await callClientApi('validate');
      setLastResponse(resp);
      appendLog('/api/v1/license/validate', resp);
    } catch {
      const resp = { valid: false, status: 'pending', code: 503, error_code: 'API_UNAVAILABLE', message: 'License API is unavailable.', timestamp: new Date().toISOString() } as ValidationResponse;
      setLastResponse(resp); appendLog('/api/v1/license/validate', resp);
    } finally {
      setLoading(false);
    }
  };

  // 2. Activate Device Action
  const handleActivate = async () => {
    setLoading(true);
    try {
      const resp = await callClientApi('activate-device');
      setLastResponse(resp);
      appendLog('/api/v1/license/activate-device', resp);
    } catch {
      const resp = { valid: false, status: 'pending', code: 503, error_code: 'API_UNAVAILABLE', message: 'License API is unavailable.', timestamp: new Date().toISOString() } as ValidationResponse;
      setLastResponse(resp); appendLog('/api/v1/license/activate-device', resp);
    } finally {
      setLoading(false);
    }
  };

  // 3. Heartbeat Action
  const handleHeartbeat = async () => {
    setLoading(true);
    try {
      const resp = await callClientApi('heartbeat'); setLastResponse(resp); appendLog('/api/v1/license/heartbeat', resp);
    } catch {
      const resp = { valid: false, status: 'pending', code: 503, error_code: 'API_UNAVAILABLE', message: 'License API is unavailable.', timestamp: new Date().toISOString() } as ValidationResponse;
      setLastResponse(resp); appendLog('/api/v1/license/heartbeat', resp);
    } finally {
      setLoading(false);
    }
  };

  // 4. Deactivate Device Action
  const handleDeactivate = async () => {
    setLoading(true);
    try {
      const resp = await callClientApi('deactivate'); setLastResponse(resp); appendLog('/api/v1/license/deactivate', resp);
    } catch {
      const resp = { valid: false, status: 'pending', code: 503, error_code: 'API_UNAVAILABLE', message: 'License API is unavailable.', timestamp: new Date().toISOString() } as ValidationResponse;
      setLastResponse(resp); appendLog('/api/v1/license/deactivate', resp);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-100">
      
      {/* Top Banner */}
      <div className="p-5 bg-[#191c1f] border border-[#292d30] rounded-lg shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Terminal className="w-5 h-5 text-[#46cbb5]" />
              <h2 className="text-base font-bold font-mono text-white">
                Real-Time Cloud API Validation &amp; Client Simulator
              </h2>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              Send real requests to this server’s online licensing API. Test key validation, device binding, seat limits, heartbeat, and seat release.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <span className="flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-[#15201e] text-[#10b981] border border-[#08535d] font-mono">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              <span>Server-backed client API</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Simulated Client Application Controls (7 cols) */}
        <div className="lg:col-span-7 bg-[#191c1f] border border-[#292d30] rounded-lg p-6 shadow-xs space-y-6">
          
          <div className="flex items-center justify-between pb-3 border-b border-[#262a2d]">
            <div className="flex items-center space-x-2">
              <Laptop className="w-5 h-5 text-[#46cbb5]" />
              <h3 className="font-bold text-sm text-white font-mono">
                Client Software Environment Configuration
              </h3>
            </div>
            <span className="text-xs font-mono text-[#46cbb5] bg-[#191c1f] px-2 py-0.5 rounded border border-[#303438]">
              Client API v1
            </span>
          </div>

          {/* Key Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5 font-mono">
                <KeyRound className="w-3.5 h-3.5 text-[#46cbb5]" />
                <span>Target License Key</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Enter the product slug and paste a complete license key. Issued keys are shown only once.
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={selectedLicenseKey}
                onChange={e => handleSelectKeyChange(e.target.value)}
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                className="flex-1 px-3 py-2 rounded-md text-xs font-mono font-bold uppercase bg-[#151719] border border-[#292d30] text-white focus:border-[#2db39f]"
              />
              
            </div>
          </div>

          {/* Workstation Hardware Profiler */}
          <div className="p-4 rounded-lg bg-[#151719] border border-[#303438] space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5 font-mono">
                <Cpu className="w-4 h-4 text-[#10b981]" />
                <span>Hardware Telemetry Profile</span>
              </span>
              <button
                onClick={generateNewFingerprint}
                className="text-[11px] text-[#46cbb5] hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Regenerate Fingerprint</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">Device Hostname</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={e => setDeviceName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md bg-[#191c1f] border border-[#292d30] text-white"
                />
              </div>
            <input
              type="text" value={productSlug} onChange={e => setProductSlug(e.target.value)}
              placeholder="Product slug (for example: licensepulse)"
              className="w-full px-3 py-2 rounded-md text-xs font-mono bg-[#151719] border border-[#292d30] text-white focus:border-[#2db39f]"
            />

              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">Operating System</label>
                <select
                  value={deviceOs}
                  onChange={e => setDeviceOs(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-md bg-[#191c1f] border border-[#292d30] text-white"
                >
                  <option value="macOS">Apple macOS (ARM64 M3)</option>
                  <option value="Windows">Microsoft Windows 11 Pro</option>
                  <option value="Linux">Ubuntu Linux 24.04 LTS</option>
                  <option value="Server">Debian Cluster Node</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">Hardware Fingerprint ID</label>
                <input
                  type="text"
                  value={deviceFingerprint}
                  onChange={e => setDeviceFingerprint(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md font-mono text-[11px] bg-[#191c1f] border border-[#292d30] text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">Client App Version</label>
                <input
                  type="text"
                  value={clientVersion}
                  onChange={e => setClientVersion(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md font-mono text-[11px] bg-[#191c1f] border border-[#292d30] text-white"
                />
              </div>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Execute Cloud API Calls
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Validate Key Only */}
              <button
                onClick={handleValidate}
                disabled={loading || !selectedLicenseKey || !productSlug}
                className="flex items-center justify-center space-x-2 px-4 py-3 rounded-md text-xs font-semibold text-slate-200 bg-[#151719] hover:bg-[#191c1f] border border-[#303438] transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#46cbb5]" />
                <span>1. Validate Key (No Seat Consumed)</span>
              </button>

              {/* Activate & Bind Device */}
              <button
                onClick={handleActivate}
                disabled={loading || !selectedLicenseKey || !productSlug}
                className="flex items-center justify-center space-x-2 px-4 py-3 rounded-md text-xs font-bold text-white bg-[#2db39f] hover:bg-[#279b89] shadow-md shadow-cyan-950 transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 text-white fill-white" />
                <span>2. Activate &amp; Bind Workstation Seat</span>
              </button>

              {/* Send Heartbeat */}
              <button
                onClick={handleHeartbeat}
                disabled={loading || !selectedLicenseKey || !productSlug}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-md text-xs font-medium text-slate-300 bg-[#151719] hover:bg-[#191c1f] border border-[#303438] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#46cbb5]" />
                <span>3. Send Heartbeat Ping</span>
              </button>

              {/* Deactivate Device */}
              <button
                onClick={handleDeactivate}
                disabled={loading || !selectedLicenseKey || !productSlug}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-md text-xs font-medium text-[#f43f5e] bg-[#381119] hover:bg-[#4c1622] border border-[#881337] transition-colors cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5 text-[#f43f5e]" />
                <span>4. Deactivate &amp; Release Seat</span>
              </button>

            </div>
          </div>

          {/* Client Application In-App Mockup Banner */}
          <div className="p-4 rounded-lg bg-[#151719] text-white space-y-2 border border-[#303438]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-slate-400 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                <span>Client App Activation Status:</span>
              </span>
              {lastResponse ? (
                lastResponse.valid ? (
                  <span className="px-2.5 py-0.5 rounded-md bg-[#15201e] text-[#10b981] font-bold border border-[#065f46] flex items-center space-x-1 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>LICENSED &amp; ACTIVE</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-md bg-[#381119] text-[#f43f5e] font-bold border border-[#881337] flex items-center space-x-1 font-mono">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>ACTIVATION REJECTED</span>
                  </span>
                )
              ) : (
                <span className="px-2.5 py-0.5 rounded-md bg-[#191c1f] text-[#46cbb5] font-medium font-mono">
                  AWAITING VALIDATION
                </span>
              )}
            </div>

            {lastResponse && (
              <div className="pt-2 border-t border-[#292d30] text-xs">
                {lastResponse.valid ? (
                  <div className="space-y-1">
                    <p className="text-slate-200 font-semibold font-mono">
                      ✓ Product Entitlement: {lastResponse.license?.productName} ({lastResponse.license?.plan?.toUpperCase() || 'PRO'} TIER)
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      Seats Occupied: {lastResponse.license?.boundDevices ?? 1} / {lastResponse.license?.maxDevices ?? 1} • Expires: {lastResponse.license?.expiresAt ? new Date(lastResponse.license.expiresAt).toLocaleDateString() : 'Perpetual'}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(lastResponse.license?.features || []).map((ent: string) => (
                        <span key={ent} className="px-1.5 py-0.5 rounded bg-[#191c1f] text-[#46cbb5] text-[10px] font-mono border border-[#303438]">
                          +{ent}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[#f43f5e] font-semibold font-mono">
                    ✗ Server Error: {lastResponse.reason || lastResponse.message} ({lastResponse.error_code || 'UNAUTHORIZED'})
                  </p>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Live Terminal / API Response Stream (5 cols) */}
        <div className="lg:col-span-5 bg-[#0a0c0e] border border-[#292d30] rounded-lg p-5 text-slate-300 font-mono text-xs flex flex-col justify-between shadow-xl min-h-[500px]">
          
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#262a2d]">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                </div>
                <span className="text-[#46cbb5] font-bold ml-2">api-telemetry.log</span>
              </div>
              <button
                onClick={() => setApiLogs([])}
                className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
              >
                Clear Console
              </button>
            </div>

            {/* Request/Response JSON display */}
            <div className="mt-4 space-y-4 max-h-[460px] overflow-y-auto pr-1">
              
              {lastResponse ? (
                <div className="space-y-2">
                  <div className="text-slate-400 text-[11px] flex items-center justify-between">
                    <span>LATEST RESPONSE PAYLOAD:</span>
                    <span className={lastResponse.valid ? 'text-[#10b981] font-bold' : 'text-[#f43f5e] font-bold'}>
                      HTTP {lastResponse.valid ? '200 OK' : `${lastResponse.code} ERROR`}
                    </span>
                  </div>

                  <pre className="p-3 rounded-md bg-[#191c1f] border border-[#292d30] text-[11px] text-slate-300 overflow-x-auto select-all">
                    {JSON.stringify(lastResponse, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <Code2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p>Execute an API action on the left to inspect raw HTTPS requests &amp; server JSON payloads.</p>
                </div>
              )}

              {/* Historical Log Stream */}
              {apiLogs.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-[#262a2d]">
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Live Event Stream ({apiLogs.length})
                  </span>
                  
                  <div className="space-y-1.5 text-[11px]">
                    {apiLogs.map((log, idx) => (
                      <div key={idx} className="p-2 rounded-md bg-[#191c1f] border border-[#292d30] flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[#46cbb5] font-bold">{log.method}</span>
                            <span className="text-slate-300">{log.url}</span>
                            <span className={`px-1 rounded text-[10px] font-bold ${
                              log.status === 200 ? 'bg-[#15201e] text-[#10b981] border border-[#065f46]' : 'bg-[#381119] text-[#f43f5e] border border-[#881337]'
                            }`}>
                              {log.status}
                            </span>
                          </div>
                          <p className="text-slate-400 text-[10px] mt-0.5">{log.message}</p>
                        </div>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap ml-2">{log.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="pt-3 border-t border-[#262a2d] text-[11px] text-slate-400 flex items-center justify-between">
            <span>Key and device fingerprint are never echoed in logs</span>
            <span>REST API Endpoint</span>
          </div>

        </div>

      </div>

    </div>
  );
};
