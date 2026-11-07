import React, { Suspense, lazy, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardStats } from './components/DashboardStats';
import { LicensesTable } from './components/LicensesTable';
import { AuditLogsSection } from './components/AuditLogsSection';
import { CreateLicenseModal } from './components/CreateLicenseModal';
import { LicenseDetailsModal } from './components/LicenseDetailsModal';
import { ClientSimulator } from './components/ClientSimulator';
import { EmailDeliveryManager } from './components/EmailDeliveryManager';
import { License } from './types';

const ChartsSection = lazy(() => import('./components/ChartsSection').then(module => ({ default: module.ChartsSection })));

export function App() {
  const { isManager } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLicenseDetails, setSelectedLicenseDetails] = useState<License | null>(null);

  const disabledFeature = (() => {
    if (['portal_editor', 'front_page', 'retrieval_portal', 'profile'].includes(activeTab)) return {
      title: 'Customer accounts and self-service are not part of RC1.', phase: 'This admin release manages licenses manually. Customer identity and ownership are not implemented.',
    };
    if (activeTab === 'admin_products') return {
      title: 'Product catalog management is not connected yet.', phase: 'License issuance uses the available product presets. Persistent catalog management can follow the lifecycle API.',
    };
    if (['order_delivery', 'webhooks'].includes(activeTab)) return {
      title: 'Payment automation is out of the RC1 scope.', phase: 'This release supports administrator-issued licenses only; prototype order fulfillment and billing webhooks are disabled.',
    };
    if (activeTab === 'offline_certs') return {
      title: 'Offline certificates are out of the RC1 scope.', phase: 'License keys are validated online. No offline signing certificate is issued by this release.',
    };
    if (activeTab === 'code_generator') return {
      title: 'SDK snippets are not included in the current RC1 slice.', phase: 'Use the Cloud API Simulator to exercise the online validation and device-seat endpoints.',
    };
    return null;
  })();

  return (
    <div className="min-h-screen bg-[#0b0d0f] text-slate-100 flex font-sans transition-colors duration-200">
      
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-[#0b0d0f]">
        
        {/* Top Header */}
        <TopHeader
          activeTab={activeTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onSelectTab={setActiveTab}
        />

        {/* Main App Workspace */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* Tab 1: Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <DashboardStats 
                onNavigateToTab={setActiveTab} 
                onOpenCreateModal={() => setIsCreateModalOpen(true)} 
              />

              {isManager && <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-[#303438] bg-[#151719]" />}><ChartsSection /></Suspense>}

              {/* Recent Licenses Snapshot Table */}
              <LicensesTable
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
                onSelectLicenseDetails={setSelectedLicenseDetails}
              />
            </div>
          )}

          {/* Tab 2: Licenses Management */}
          {activeTab === 'licenses' && (
            <div className="space-y-6">
              <LicensesTable
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
                onSelectLicenseDetails={setSelectedLicenseDetails}
              />
            </div>
          )}

          {/* Tab 4: Audit Logs & Telemetry */}
          {activeTab === 'audit_logs' && isManager && (
            <AuditLogsSection />
          )}

          {activeTab === 'simulator' && isManager && <ClientSimulator />}
          {activeTab === 'email_automations' && isManager && <EmailDeliveryManager />}

          {disabledFeature && <div className="rounded-xl border border-[#303438] bg-[#151719] p-8 text-center">
            <h2 className="text-lg font-semibold text-white">{disabledFeature.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{disabledFeature.phase}</p>
          </div>}

        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-[#262a2d] py-5 text-xs text-slate-400 bg-[#101214]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded-md bg-[#151719] text-[#46cbb5] border border-[#303438] flex items-center justify-center font-bold text-[10px]">
                LP
              </div>
              <span className="font-semibold text-slate-200">
                LicensePulse Engine
              </span>
              <span>•</span>
              <span>Online license administration</span>
            </div>

            <div className="flex items-center space-x-4 text-[11px]">
              <span>Administrator OTP</span>
              <span>•</span>
              <span>RC1 work in progress</span>
            </div>
          </div>
        </footer>

      </div>

      {/* Modals */}
      <CreateLicenseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <LicenseDetailsModal
        license={selectedLicenseDetails}
        isOpen={!!selectedLicenseDetails}
        onClose={() => setSelectedLicenseDetails(null)}
      />

    </div>
  );
}

export default App;
