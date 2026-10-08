import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, FileText, Cpu, BookOpen, Settings, Trash2, Play, MessageSquare } from 'lucide-react';
import type { KnowledgePackage, KnowledgeSource, KnowledgeAsset, ProcessingJob } from '@/lib/types';
import {
  fetchPackage,
  fetchSources,
  fetchAssets,
  fetchJob,
  deletePackage,
  runProcessingPipeline,
} from '@/lib/services';
import { getPackageIcon } from '@/lib/icons';
import type { LucideIcon } from 'lucide-react';
import { SourcesTab } from '@/components/SourcesTab';
import { ProcessingTab } from '@/components/ProcessingTab';
import { KnowledgeTab } from '@/components/KnowledgeTab';
import { SettingsTab } from '@/components/SettingsTab';
import { ChatPreviewTab } from '@/components/ChatPreviewTab';

type Tab = 'sources' | 'processing' | 'knowledge' | 'chat' | 'settings';

interface PackageDetailProps {
  packageId: string;
  onBack: () => void;
  onDeleted: () => void;
}

export function PackageDetail({ packageId, onBack, onDeleted }: PackageDetailProps) {
  const [pkg, setPkg] = useState<KnowledgePackage | null>(null);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [assets, setAssets] = useState<KnowledgeAsset[]>([]);
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [tab, setTab] = useState<Tab>('sources');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadAll = useCallback(async () => {
    const [p, s, a, j] = await Promise.all([
      fetchPackage(packageId),
      fetchSources(packageId),
      fetchAssets(packageId),
      fetchJob(packageId),
    ]);
    setPkg(p);
    setSources(s);
    setAssets(a);
    setJob(j);
    setLoading(false);
  }, [packageId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleProcess = async () => {
    if (!pkg || sources.length === 0) return;
    setProcessing(true);
    setTab('processing');
    try {
      const finishedJob = await runProcessingPipeline(packageId, pkg, sources, (updatedJob) => {
        setJob(updatedJob);
      });
      setJob(finishedJob);
      await loadAll();
    } catch (e) {
      console.error('Processing failed:', e);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    await deletePackage(packageId);
    onDeleted();
  };

  if (loading || !pkg) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500 text-sm">Loading package...</div>
      </div>
    );
  }

  const Icon: LucideIcon = getPackageIcon(pkg.icon);
  const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: 'sources', label: 'Sources', icon: FileText },
    { id: 'processing', label: 'Processing', icon: Cpu },
    { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
    { id: 'chat', label: 'Chat Preview', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-panel border-b border-[#1e293b] px-8 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${pkg.color}20` }}>
            <Icon className="w-5 h-5" style={{ color: pkg.color }} />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{pkg.name}</h1>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="font-mono">knowledge/{pkg.slug}</span>
              <span>·</span>
              <span>{sources.length} sources</span>
              <span>·</span>
              <span>{pkg.facts_count} facts</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pkg.status !== 'processing' && !processing && (
              <button
                onClick={handleProcess}
                disabled={sources.length === 0}
                className="btn-primary"
                title={sources.length === 0 ? 'Add sources first' : 'Run the processing pipeline'}
              >
                <Play className="w-4 h-4" />
                {pkg.status === 'ready' ? 'Reprocess' : 'Process Knowledge'}
              </button>
            )}
            {processing && (
              <span className="badge badge-processing">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Processing...
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4 -mb-1">
          {tabs.map((t) => {
            const TabIcon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id
                    ? 'bg-slate-800/80 text-white'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                {t.label}
                {t.id === 'knowledge' && assets.length > 0 && (
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 rounded-full font-bold">
                    {assets.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-8">
        {tab === 'sources' && (
          <SourcesTab
            packageId={packageId}
            sources={sources}
            onSourcesChanged={loadAll}
            pkgStatus={pkg.status}
            onReprocess={handleProcess}
          />
        )}
        {tab === 'processing' && (
          <ProcessingTab
            job={job}
            pkg={pkg}
            sources={sources}
            processing={processing}
            onProcess={handleProcess}
          />
        )}
        {tab === 'knowledge' && (
          <KnowledgeTab
            packageId={packageId}
            pkg={pkg}
            assets={assets}
            onAssetsChanged={loadAll}
          />
        )}
        {tab === 'chat' && (
          <ChatPreviewTab
            pkg={pkg}
            assets={assets}
            onMessagesChanged={loadAll}
          />
        )}
        {tab === 'settings' && (
          <SettingsTab
            pkg={pkg}
            onDeleted={handleDelete}
            showDeleteConfirm={showDeleteConfirm}
            setShowDeleteConfirm={setShowDeleteConfirm}
          />
        )}
      </div>
    </div>
  );
}
