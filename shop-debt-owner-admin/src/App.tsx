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
import { syncService } from './api/syncService';
import { entriesService } from './api/entriesService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
      staleTime: 1000 * 60 * 5, // 5 daqiqa kesh amal qilish muddati
      gcTime: 1000 * 60 * 30, // 30 daqiqa xotirada saqlash
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

  // Eagerly prefetch all 3 primary views in the background so tabs open with 0ms latency
  React.useEffect(() => {
    if (user) {
      queryClient.prefetchQuery({
        queryKey: ['dashboardMetrics'],
        queryFn: () => entriesService.getDashboardMetrics(),
      });
      queryClient.prefetchQuery({
        queryKey: ['customerSummaries'],
        queryFn: () => entriesService.getCustomerSummaries('highest'),
      });
      queryClient.prefetchQuery({
        queryKey: ['entries', { search: '', status: 'open', direction: 'all' }, 1],
        queryFn: () => entriesService.getEntries({ search: '', status: 'open', direction: 'all' }, 1, 10),
      });
    }
  }, [user]);

  // Enable offline-to-online auto sync
  React.useEffect(() => {
    const cleanup = syncService.initAutoSync(() => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['customerSummaries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    });
    return cleanup;
  }, []);

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
      onTabChange={(tab) => {
        setCustomerFilter('');
        setActiveTab(tab);
      }}
      onOpenAIDrawer={() => setIsAIDrawerOpen(true)}
    >
      <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
        <DashboardPage
          onNavigate={(tab: any) => {
            setCustomerFilter('');
            setActiveTab(tab);
          }}
          onOpenNewDebt={() => {
            setPrefillCustomer(null);
            setIsAIDrawerOpen(true);
          }}
        />
      </div>

      <div className={activeTab === 'customers' ? 'block' : 'hidden'}>
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
      </div>

      <div className={activeTab === 'entries' ? 'block' : 'hidden'}>
        <EntriesPage
          initialSearch={customerFilter}
          onNewEntryClick={() => {
            setPrefillCustomer(null);
            setIsAIDrawerOpen(true);
          }}
        />
      </div>

      {/* Floating Moliya AI Action Button & Enhanced Bottom Sheet Drawer */}
      <FloatingAIButton
        isOpen={isAIDrawerOpen}
        onOpen={() => setIsAIDrawerOpen(true)}
        onClose={() => {
          setIsAIDrawerOpen(false);
          setPrefillCustomer(null);
        }}
        onSaveSuccess={() => {
          setCustomerFilter('');
        }}
        prefillCustomer={prefillCustomer}
        onNavigate={(tab) => {
          setCustomerFilter('');
          setActiveTab(tab);
        }}
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
