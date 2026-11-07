import React, { useEffect, useMemo, useState } from 'react';
import { 
  ResponsiveContainer, 
  BarChart,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  Bar
} from 'recharts';
import { useLicense } from '../context/LicenseContext';
import { Activity, PieChart as PieIcon, Cpu } from 'lucide-react';

const COLORS = ['#2db39f', '#10b981', '#f59e0b', '#46cbb5', '#64748b', '#0369a1'];
const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  expired: '#f59e0b',
  revoked: '#f43f5e',
  suspended: '#46cbb5'
};

export const ChartsSection: React.FC = () => {
  const { licenses, licenseTotal, licensesLoading } = useLicense();
  const [validationMetrics, setValidationMetrics] = useState<{ successful: number; failed: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/admin/metrics', { credentials: 'same-origin' })
      .then(async response => {
        if (!response.ok) throw new Error('Metrics unavailable');
        return response.json() as Promise<{ validations24h: { successful: number; failed: number } }>;
      })
      .then(result => { if (!cancelled) setValidationMetrics(result.validations24h); })
      .catch(() => { if (!cancelled) setValidationMetrics(null); });
    return () => { cancelled = true; };
  }, []);

  const gridColor = '#262a2d';
  const textColor = '#64748b';

  // The API currently retains a rolling 24-hour aggregate, not timestamped buckets.
  const timeSeriesData = validationMetrics ? [{
    period: 'Rolling 24h', successful: validationMetrics.successful, failed: validationMetrics.failed,
  }] : [];

  // 2. License Status Distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = { active: 0, expired: 0, revoked: 0, suspended: 0 };
    licenses.forEach(l => {
      counts[l.status] = (counts[l.status] || 0) + 1;
    });
    return [
      { name: 'Active', value: counts.active || 0, color: STATUS_COLORS.active },
      { name: 'Expired', value: counts.expired || 0, color: STATUS_COLORS.expired },
      { name: 'Revoked', value: counts.revoked || 0, color: STATUS_COLORS.revoked },
      { name: 'Suspended', value: counts.suspended || 0, color: STATUS_COLORS.suspended },
    ].filter(item => item.value > 0);
  }, [licenses]);

  // 4. OS & Platform breakdown across all active devices
  const osData = useMemo(() => {
    const osCounts: Record<string, number> = {
      macOS: 0,
      Windows: 0,
      Linux: 0,
      Server: 0
    };
    licenses.forEach(l => {
      l.devices.forEach(d => {
        if (d.status === 'active') {
          const os = d.os === 'iOS' || d.os === 'Android' ? 'Server' : d.os;
          osCounts[os] = (osCounts[os] || 0) + 1;
        }
      });
    });

    return [
      { os: 'macOS', devices: osCounts.macOS, fill: '#46cbb5' },
      { os: 'Windows', devices: osCounts.Windows, fill: '#2db39f' },
      { os: 'Linux', devices: osCounts.Linux, fill: '#10b981' },
      { os: 'Cloud/Server', devices: osCounts.Server, fill: '#64748b' }
    ];
  }, [licenses]);

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0a0c0e] p-3 rounded-lg border border-[#292d30] shadow-2xl text-xs">
          <p className="font-bold text-white mb-1.5">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between space-x-3 my-0.5">
              <span className="flex items-center space-x-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color || entry.fill }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-bold text-white font-mono">
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 font-sans">
      
      {/* 1. Validation & Activation Timeline (2 cols on large) */}
      <div className="lg:col-span-2 bg-[#191c1f] border border-[#292d30] rounded-lg p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[#262a2d] gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-[#46cbb5]" />
              <h3 className="font-bold text-sm text-white font-mono">
                API License Validation Outcomes
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Server-recorded validation outcomes. This view shows the rolling 24-hour aggregate; event timestamps remain in Audit Logs.
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center space-x-1 text-slate-400">
              <span className="w-2 h-2 rounded-sm bg-[#10b981]" />
              <span>Success</span>
            </span>
            <span className="flex items-center space-x-1 text-slate-400">
              <span className="w-2 h-2 rounded-sm bg-[#f43f5e]" />
              <span>Failed</span>
            </span>
          </div>
        </div>

        <div className="h-64 mt-4 w-full">
          {validationMetrics && validationMetrics.successful + validationMetrics.failed === 0 ? <div className="h-full flex items-center justify-center text-xs text-slate-500">No server validation events recorded in the last 24 hours.</div> : !validationMetrics ? <div className="h-full flex items-center justify-center text-xs text-slate-500">Validation metrics are unavailable.</div> : <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeSeriesData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="period" stroke={textColor} fontSize={11} tickLine={false} />
              <YAxis stroke={textColor} fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="successful" name="Accepted" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="failed" name="Rejected" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>}
        </div>
      </div>

      {/* 2. License Status & Device Distribution (1 col) */}
      <div className="bg-[#191c1f] border border-[#292d30] rounded-lg p-5 shadow-xs flex flex-col justify-between">
        <div className="pb-3 border-b border-[#262a2d] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PieIcon className="w-4 h-4 text-[#46cbb5]" />
            <h3 className="font-bold text-sm text-white font-mono">
              Status Breakdown
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {licensesLoading ? 'Loading' : `${licenseTotal.toLocaleString()} Total`}
          </span>
        </div>

        <div className="h-44 my-2 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#262a2d] text-xs">
          {statusData.map(item => (
            <div key={item.name} className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-slate-300 capitalize">{item.name}:</span>
              <span className="font-bold text-white font-mono">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
