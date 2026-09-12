import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/common/Toast';
import { AuthProvider } from './hooks/useAuth';
import { Layout } from './components/layout/Layout';
import { NavTab } from './components/layout/BottomNav';
import { DashboardPage } from './pages/DashboardPage';
import { EntriesPage } from './pages/EntriesPage';
import { CustomersPage } from './pages/CustomersPage';
import { useAuth } from './hooks/useAuth';
import { useRealtime } from './hooks/useRealtime';
import { LoginPage } from './pages/LoginPage';
import { FloatingAIButton } from './components/common/FloatingAIButton';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30,
    },
  },
});

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState<boolean>(false);
  const [prefillCustomer, setPrefillCustomer] = useState<{ name: string; phone?: string | null } | null>(null);

  // Enable live Supabase realtime sync
  useRealtime();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-3 border-violet-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Yuklanmoqda...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onOpenAIDrawer={() => setIsAIDrawerOpen(true)}
    >
      {activeTab === 'dashboard' && (
        <DashboardPage
          onNavigate={(tab: any) => setActiveTab(tab)}
          onOpenNewDebt={() => {
            setPrefillCustomer(null);
            setIsAIDrawerOpen(true);
          }}
        />
      )}

      {activeTab === 'customers' && (
        <CustomersPage
          onViewCustomerEntries={(customerName) => {
            setCustomerFilter(customerName);
            setActiveTab('entries');
          }}
          onOpenNewDebtForCustomer={(customerName, customerPhone) => {
            setPrefillCustomer({ name: customerName, phone: customerPhone });
            setIsAIDrawerOpen(true);
          }}
        />
      )}

      {activeTab === 'entries' && (
        <EntriesPage
          initialSearch={customerFilter}
          onNewEntryClick={() => {
            setPrefillCustomer(null);
            setIsAIDrawerOpen(true);
          }}
        />
      )}

      {/* Floating Moliya AI Action Button & Enhanced Bottom Sheet Drawer */}
      <FloatingAIButton
        isOpen={isAIDrawerOpen}
        onOpen={() => setIsAIDrawerOpen(true)}
        onClose={() => {
          setIsAIDrawerOpen(false);
          setPrefillCustomer(null);
        }}
        prefillCustomer={prefillCustomer}
        onNavigate={(tab) => setActiveTab(tab)}
      />
    </Layout>
  );
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
