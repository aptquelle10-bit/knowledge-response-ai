import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { KnowledgePackage } from '@/lib/types';
import { fetchPackages } from '@/lib/services';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/views/Dashboard';
import { PackageDetail } from '@/views/PackageDetail';
import { CreatePackageModal } from '@/components/CreatePackageModal';
import { FloatingChatWidget } from '@/components/FloatingChatWidget';

export type Route =
  | { name: 'dashboard' }
  | { name: 'package'; id: string };

export default function App() {
  const [packages, setPackages] = useState<KnowledgePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<Route>({ name: 'dashboard' });
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPackages = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchPackages();
      setPackages(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  useEffect(() => {
    const channel = supabase
      .channel('packages-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'knowledge_packages' },
        () => loadPackages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPackages]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0e1a]">
      <Sidebar
        packages={packages}
        route={route}
        onNavigate={setRoute}
        onNewPackage={() => setShowCreate(true)}
      />

      <main className="flex-1 overflow-y-auto">
        {route.name === 'dashboard' && (
          <Dashboard
            packages={packages}
            loading={loading}
            error={error}
            onNewPackage={() => setShowCreate(true)}
            onOpenPackage={(id) => setRoute({ name: 'package', id })}
          />
        )}
        {route.name === 'package' && (
          <PackageDetail
            packageId={route.id}
            onBack={() => setRoute({ name: 'dashboard' })}
            onDeleted={() => {
              setRoute({ name: 'dashboard' });
              loadPackages();
            }}
          />
        )}
      </main>

      {showCreate && (
        <CreatePackageModal
          onClose={() => setShowCreate(false)}
          onCreated={(pkg) => {
            setShowCreate(false);
            loadPackages();
            setRoute({ name: 'package', id: pkg.id });
          }}
        />
      )}

      <FloatingChatWidget packages={packages} />
    </div>
  );
}
