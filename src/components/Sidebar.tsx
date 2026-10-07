import { Brain, Plus, LayoutGrid, type LucideIcon } from 'lucide-react';
import type { KnowledgePackage } from '@/lib/types';
import { getPackageIcon } from '@/lib/icons';
import type { Route } from '@/App';

interface SidebarProps {
  packages: KnowledgePackage[];
  route: Route;
  onNavigate: (route: Route) => void;
  onNewPackage: () => void;
}

export function Sidebar({ packages, route, onNavigate, onNewPackage }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 border-r border-[#1e293b] bg-[#0d1220] flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1e293b]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight">Omni Knowledge</div>
            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Maker Platform</div>
          </div>
        </div>
      </div>

      {/* Dashboard button */}
      <div className="px-3 pt-4">
        <button
          onClick={() => onNavigate({ name: 'dashboard' })}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            route.name === 'dashboard'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Dashboard
        </button>
      </div>

      {/* Packages list */}
      <div className="flex-1 overflow-y-auto px-3 pt-4 pb-4">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Knowledge Packages
          </span>
          <button
            onClick={onNewPackage}
            className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            title="New package"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {packages.length === 0 ? (
          <div className="px-3 py-4 text-xs text-slate-600">
            No packages yet. Create one to get started.
          </div>
        ) : (
          <div className="space-y-0.5">
            {packages.map((pkg) => {
              const Icon: LucideIcon = getPackageIcon(pkg.icon);
              const isActive = route.name === 'package' && route.id === pkg.id;
              return (
                <button
                  key={pkg.id}
                  onClick={() => onNavigate({ name: 'package', id: pkg.id })}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group ${
                    isActive
                      ? 'bg-slate-800/80 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${pkg.color}20` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: pkg.color }} />
                  </div>
                  <span className="truncate font-medium text-[13px]">{pkg.name}</span>
                  <StatusDot status={pkg.status} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#1e293b]">
        <div className="text-[10px] text-slate-600 font-medium">
          Single source of truth: <span className="text-cyan-500">master.md</span>
        </div>
      </div>
    </aside>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-slate-600',
    processing: 'bg-amber-500 animate-pulse',
    ready: 'bg-emerald-500',
    error: 'bg-red-500',
  };
  return <div className={`w-1.5 h-1.5 rounded-full shrink-0 ml-auto ${colors[status] || 'bg-slate-600'}`} />;
}
