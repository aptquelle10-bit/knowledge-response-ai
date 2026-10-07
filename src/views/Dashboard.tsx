import { Brain, Plus, FileText, Database, Zap, ArrowRight, type LucideIcon } from 'lucide-react';
import type { KnowledgePackage } from '@/lib/types';
import { getPackageIcon } from '@/lib/icons';
import type { LucideIcon as LCIcon } from 'lucide-react';

interface DashboardProps {
  packages: KnowledgePackage[];
  loading: boolean;
  error: string | null;
  onNewPackage: () => void;
  onOpenPackage: (id: string) => void;
}

export function Dashboard({ packages, loading, error, onNewPackage, onOpenPackage }: DashboardProps) {
  const totalSources = packages.reduce((sum, p) => sum + p.sources_count, 0);
  const totalFacts = packages.reduce((sum, p) => sum + p.facts_count, 0);
  const readyCount = packages.filter((p) => p.status === 'ready').length;

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Transform any content into AI-ready knowledge packages
            </p>
          </div>
          <button onClick={onNewPackage} className="btn-primary">
            <Plus className="w-4 h-4" />
            New Package
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-8 grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Database} label="Knowledge Packages" value={packages.length} color="#06b6d4" />
        <StatCard icon={FileText} label="Sources Uploaded" value={totalSources} color="#3b82f6" />
        <StatCard icon={Brain} label="Facts Extracted" value={totalFacts} color="#10b981" />
        <StatCard icon={Zap} label="Ready for Deployment" value={readyCount} color="#f59e0b" />
      </div>

      {/* Architecture diagram */}
      <div className="px-8 mb-8">
        <div className="card p-5">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            How It Works
          </h2>
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            <FlowStep icon={FileText} label="Upload Sources" sublabel="PDF, DOCX, Images..." color="#3b82f6" />
            <FlowArrow />
            <FlowStep icon={Brain} label="Knowledge Maker" sublabel="Normalize + Extract + Dedupe" color="#06b6d4" />
            <FlowArrow />
            <FlowStep icon={Database} label="Knowledge Package" sublabel="master.md + assets" color="#10b981" />
            <FlowArrow />
            <FlowStep icon={Zap} label="Deploy" sublabel="Chat Widget + Bot" color="#f59e0b" />
          </div>
        </div>
      </div>

      {/* Packages grid */}
      <div className="px-8 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Your Knowledge Packages
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 h-40">
                <div className="shimmer h-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : packages.length === 0 ? (
          <EmptyState onNewPackage={onNewPackage} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} onOpen={() => onOpenPackage(pkg.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: number; color: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <div className="text-2xl font-bold text-white leading-none">{value}</div>
          <div className="text-xs text-slate-500 mt-1">{label}</div>
        </div>
      </div>
    </div>
  );
}

function FlowStep({ icon: Icon, label, sublabel, color }: { icon: LucideIcon; label: string; sublabel: string; color: string }) {
  return (
    <div className="shrink-0 w-44">
      <div className="card p-3 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-white truncate">{label}</div>
          <div className="text-[10px] text-slate-500 truncate">{sublabel}</div>
        </div>
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="shrink-0 text-slate-600">
      <ArrowRight className="w-4 h-4" />
    </div>
  );
}

function PackageCard({ pkg, onOpen }: { pkg: KnowledgePackage; onOpen: () => void }) {
  const Icon: LCIcon = getPackageIcon(pkg.icon);
  return (
    <button
      onClick={onOpen}
      className="card p-5 text-left group hover:border-slate-700 transition-all cursor-pointer relative overflow-hidden"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${pkg.color}20` }}>
          <Icon className="w-5 h-5" style={{ color: pkg.color }} />
        </div>
        <StatusBadge status={pkg.status} />
      </div>

      <h3 className="text-base font-semibold text-white group-hover:text-cyan-400 transition-colors">
        {pkg.name}
      </h3>
      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
        {pkg.description || `knowledge/${pkg.slug}`}
      </p>

      <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" />
          {pkg.sources_count} sources
        </span>
        <span className="flex items-center gap-1">
          <Brain className="w-3.5 h-3.5" />
          {pkg.facts_count} facts
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(90deg, ${pkg.color}, transparent)` }} />
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Draft', cls: 'badge-draft' },
    processing: { label: 'Processing', cls: 'badge-processing' },
    ready: { label: 'Ready', cls: 'badge-ready' },
    error: { label: 'Error', cls: 'badge-error' },
  };
  const config = labels[status] || labels.draft;
  return <span className={`badge ${config.cls}`}>{config.label}</span>;
}

function EmptyState({ onNewPackage }: { onNewPackage: () => void }) {
  return (
    <div className="card p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
        <Brain className="w-8 h-8 text-cyan-400" />
      </div>
      <h3 className="text-lg font-semibold text-white">No knowledge packages yet</h3>
      <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
        Create your first knowledge package to start transforming content into AI-ready knowledge.
        Upload files, process them, and deploy to chat widgets or bots.
      </p>
      <button onClick={onNewPackage} className="btn-primary mt-5 mx-auto">
        <Plus className="w-4 h-4" />
        Create Your First Package
      </button>
    </div>
  );
}
