import React, { useState } from 'react';
import Layout from '@/components/Layout';
import Inventory from '@/components/modules/Inventory/Inventory';
import Receivables from '@/components/modules/Receivables/Receivables';
import Payables from '@/components/modules/Payables/Payables';
import Expenses from '@/components/modules/Expenses';
import Reports from '@/components/modules/Reports';
import { Toaster } from '@/components/ui/toaster';
import { SupabaseProvider } from '@/integrations/supabase/SupabaseProvider';

function App() {
  const [activeModule, setActiveModule] = useState('inventory');

  const renderModule = () => {
    switch (activeModule) {
      case 'inventory':
        return <Inventory />;
      case 'receivables':
        return <Receivables />;
      case 'payables':
        return <Payables />;
      case 'expenses':
        return <Expenses />;
      case 'reports':
        return <Reports />;
      default:
        return <Inventory />;
    }
  };

  return (
    <SupabaseProvider>
      <div className="min-h-screen">
        <Layout activeModule={activeModule} setActiveModule={setActiveModule}>
          {renderModule()}
        </Layout>
        <Toaster />
      </div>
    </SupabaseProvider>
  );
}

export default App;