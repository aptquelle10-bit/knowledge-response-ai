import { useState } from 'react';
import {
  FileText, Brain, Tag, MessageSquare, ShieldAlert, BookMarked, Target,
  Info, Database, Search, ChevronRight, FolderOpen, RefreshCw, CheckCircle2,
  AlertCircle, Globe, type LucideIcon,
} from 'lucide-react';
import type { KnowledgePackage, KnowledgeAsset, AssetType } from '@/lib/types';
import { upsertAsset } from '@/lib/services';
import { saveAs } from '@/lib/download';
import { prepareAssetsForExport, exportToDirectoryPicker, exportToGatewayApi } from '@/lib/export-target';

interface KnowledgeTabProps {
  packageId: string;
  pkg: KnowledgePackage;
  assets: KnowledgeAsset[];
  onAssetsChanged: () => void;
}

interface AssetMeta {
  type: AssetType;
  label: string;
  icon: LucideIcon;
  color: string;
  filename: string;
  description: string;
  editable: boolean;
}

const ASSET_METAS: AssetMeta[] = [
  { type: 'master', label: 'master.md', icon: FileText, color: '#06b6d4', filename: 'master.md', description: 'The single source of truth — the only editable file', editable: true },
  { type: 'summary', label: 'summary.md', icon: Info, color: '#3b82f6', filename: 'summary.md', description: 'Human-readable overview of the package', editable: false },
  { type: 'facts', label: 'facts.json', icon: Brain, color: '#10b981', filename: 'facts.json', description: 'Extracted facts with categories', editable: false },
  { type: 'entities', label: 'entities.json', icon: Tag, color: '#8b5cf6', filename: 'entities.json', description: 'Canonical entities found across sources', editable: false },
  { type: 'canned-qa', label: 'canned-qa.json', icon: MessageSquare, color: '#f59e0b', filename: 'canned-qa.json', description: 'Pre-generated Q&A for zero-token responses', editable: false },
  { type: 'corrections', label: 'corrections.json', icon: ShieldAlert, color: '#ef4444', filename: 'corrections.json', description: 'Guardrails and rules for answer accuracy', editable: false },
  { type: 'glossary', label: 'glossary.json', icon: BookMarked, color: '#ec4899', filename: 'glossary.json', description: 'Key terms and definitions', editable: false },
  { type: 'intents', label: 'intents.json', icon: Target, color: '#14b8a6', filename: 'intents.json', description: 'Detected intent patterns', editable: false },
  { type: 'metadata', label: 'metadata.json', icon: Database, color: '#64748b', filename: 'metadata.json', description: 'Package version and statistics', editable: false },
  { type: 'vector-index', label: 'vector-index.json', icon: Search, color: '#06b6d4', filename: 'vector-index.json', description: 'Orama index built from master.md', editable: false },
];

export function KnowledgeTab({ packageId, pkg, assets, onAssetsChanged }: KnowledgeTabProps) {
  const [selectedType, setSelectedType] = useState<AssetType | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync to Website / Folder State
  const [targetProject, setTargetProject] = useState(pkg.slug || 'apzurquelle');
  const [gatewayUrl, setGatewayUrl] = useState('http://localhost:5173');
  const [syncStatus, setSyncStatus] = useState<{ state: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    state: 'idle',
    message: '',
  });

  const assetMap = new Map(assets.map((a) => [a.asset_type, a]));
  const selectedAsset = selectedType ? assetMap.get(selectedType) : null;
  const selectedMeta = ASSET_METAS.find((m) => m.type === selectedType);

  const getExportList = () => {
    const filenameMap: Record<AssetType, string> = {} as any;
    ASSET_METAS.forEach((m) => { filenameMap[m.type] = m.filename; });
    return prepareAssetsForExport(assets, filenameMap);
  };

  const handleStartEdit = () => {
    if (selectedAsset && selectedMeta?.editable) {
      const data = selectedAsset.asset_data as { content?: string };
      setEditContent(data.content || '');
      setEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedType) return;
    setSaving(true);
    try {
      await upsertAsset(packageId, selectedType, { content: editContent });
      setEditing(false);
      onAssetsChanged();
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = (asset: KnowledgeAsset, meta: AssetMeta) => {
    const data = asset.asset_data;
    const content = meta.type === 'master' || meta.type === 'summary'
      ? (data as { content?: string }).content || ''
      : JSON.stringify(data, null, 2);
    saveAs(content, meta.filename);
  };

  const handleDownloadAll = () => {
    ASSET_METAS.forEach((meta) => {
      const asset = assetMap.get(meta.type);
      if (asset) {
        const data = asset.asset_data;
        const content = meta.type === 'master' || meta.type === 'summary'
          ? (data as { content?: string }).content || ''
          : JSON.stringify(data, null, 2);
        saveAs(content, meta.filename);
      }
    });
  };

  const handleSaveToProjectFolder = async () => {
    try {
      setSyncStatus({ state: 'loading', message: 'Selecting project folder...' });
      const exportList = getExportList();
      const res = await exportToDirectoryPicker(exportList);
      setSyncStatus({
        state: 'success',
        message: `Saved ${res.written.length} files into folder "${res.dirName}"!`,
      });
      setTimeout(() => setSyncStatus({ state: 'idle', message: '' }), 5000);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setSyncStatus({ state: 'error', message: err.message });
      } else {
        setSyncStatus({ state: 'idle', message: '' });
      }
    }
  };

  const handleSyncToWebsiteGateway = async () => {
    try {
      setSyncStatus({ state: 'loading', message: `Syncing to projects/${targetProject}/ai_knowledge...` });
      const exportList = getExportList();
      const res = await exportToGatewayApi({
        gatewayUrl,
        projectName: targetProject,
        assetExports: exportList,
      });
      setSyncStatus({
        state: 'success',
        message: res.message,
      });
      setTimeout(() => setSyncStatus({ state: 'idle', message: '' }), 5000);
    } catch (err: any) {
      setSyncStatus({ state: 'error', message: err.message });
    }
  };

  if (assets.length === 0) {
    return (
      <div className="card p-12 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-slate-600" />
        </div>
        <h3 className="text-base font-semibold text-white">No knowledge generated yet</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          Run the processing pipeline to generate master.md and all derived knowledge assets.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-5 animate-fade-in">
      {/* Asset sidebar */}
      <div className="w-64 shrink-0 space-y-3">
        {/* Project Folder Export / Sync Box */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Target Project Folder</span>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase font-mono">Project Name</label>
            <input
              type="text"
              value={targetProject}
              onChange={(e) => setTargetProject(e.target.value)}
              placeholder="e.g. apzurquelle"
              className="w-full px-2 py-1 bg-slate-800/80 border border-slate-700 rounded text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5 pt-1">
            <button
              onClick={handleSyncToWebsiteGateway}
              disabled={syncStatus.state === 'loading'}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition shadow-sm disabled:opacity-50"
              title="Syncs files directly to projects/<name>/ai_knowledge via website dev server"
            >
              <RefreshCw className={`w-3 h-3 ${syncStatus.state === 'loading' ? 'animate-spin' : ''}`} />
              Sync to Website
            </button>

            <button
              onClick={handleSaveToProjectFolder}
              disabled={syncStatus.state === 'loading'}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition"
              title="Select folder on your computer to save all knowledge files"
            >
              <FolderOpen className="w-3 h-3 text-emerald-400" />
              Pick Local Folder
            </button>
          </div>

          {syncStatus.message && (
            <div className={`p-2 rounded text-[11px] flex items-start gap-1.5 ${
              syncStatus.state === 'success'
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                : syncStatus.state === 'error'
                ? 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                : 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/50'
            }`}>
              {syncStatus.state === 'success' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400 mt-0.5" />}
              {syncStatus.state === 'error' && <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400 mt-0.5" />}
              {syncStatus.state === 'loading' && <RefreshCw className="w-3.5 h-3.5 shrink-0 text-cyan-400 animate-spin mt-0.5" />}
              <span className="leading-tight break-all">{syncStatus.message}</span>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Knowledge Files
            </span>
            <button
              onClick={handleDownloadAll}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium"
            >
              Download All
            </button>
          </div>
        </div>
        {ASSET_METAS.map((meta) => {
          const asset = assetMap.get(meta.type);
          const Icon = meta.icon;
          const isSelected = selectedType === meta.type;
          const hasAsset = !!asset;
          return (
            <button
              key={meta.type}
              onClick={() => { setSelectedType(meta.type); setEditing(false); }}
              disabled={!hasAsset}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                isSelected
                  ? 'bg-slate-800/80 text-white'
                  : hasAsset
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  : 'text-slate-700 cursor-not-allowed'
              }`}
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                style={{ backgroundColor: hasAsset ? `${meta.color}20` : 'transparent' }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: hasAsset ? meta.color : '#334155' }} />
              </div>
              <span className="text-xs font-mono truncate flex-1 text-left">{meta.label}</span>
              {hasAsset && !isSelected && (
                <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Asset viewer */}
      <div className="flex-1 min-w-0">
        {selectedAsset && selectedMeta ? (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#1e293b]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${selectedMeta.color}15` }}>
                  <selectedMeta.icon className="w-5 h-5" style={{ color: selectedMeta.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">{selectedMeta.filename}</h3>
                  <p className="text-xs text-slate-500">{selectedMeta.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedMeta.editable && !editing && (
                  <button onClick={handleStartEdit} className="btn-ghost text-xs">
                    Edit
                  </button>
                )}
                <button
                  onClick={() => handleDownload(selectedAsset, selectedMeta)}
                  className="btn-ghost text-xs"
                >
                  Download
                </button>
              </div>
            </div>

            {editing ? (
              <div>
                <div className="mb-3 flex items-center gap-2 text-xs text-amber-500/80">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Only master.md is editable. All other files are regenerated from it.
                </div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={24}
                  className="input-field font-mono text-xs resize-y"
                  style={{ minHeight: '400px' }}
                />
                <div className="flex items-center justify-end gap-2 mt-3">
                  <button onClick={() => setEditing(false)} className="btn-ghost text-xs">
                    Cancel
                  </button>
                  <button onClick={handleSaveEdit} disabled={saving} className="btn-primary text-xs">
                    {saving ? 'Saving...' : 'Save master.md'}
                  </button>
                </div>
              </div>
            ) : (
              <AssetContent asset={selectedAsset} meta={selectedMeta} />
            )}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <FileText className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Select a file to view its contents</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AssetContent({ asset, meta }: { asset: KnowledgeAsset; meta: AssetMeta }) {
  const data = asset.asset_data;

  if (meta.type === 'master' || meta.type === 'summary') {
    const content = (data as { content?: string }).content || '';
    return (
      <div className="bg-[#0a0e1a] rounded-xl p-5 overflow-x-auto max-h-[600px] overflow-y-auto">
        <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">{content}</pre>
      </div>
    );
  }

  if (meta.type === 'facts') {
    const facts = Array.isArray(data) ? (data as { id: string; category: string; value: string }[]) : [];
    return (
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {facts.map((fact) => (
          <div key={fact.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0e1a] border border-[#1e293b]">
            <span className="text-[10px] font-mono text-slate-600 shrink-0">{fact.id}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 shrink-0">
              {fact.category}
            </span>
            <span className="text-sm text-slate-300">{fact.value}</span>
          </div>
        ))}
      </div>
    );
  }

  if (meta.type === 'entities') {
    const entities = Array.isArray(data) ? (data as string[]) : [];
    return (
      <div className="flex flex-wrap gap-2 max-h-[600px] overflow-y-auto p-1">
        {entities.map((entity, i) => (
          <span
            key={i}
            className="px-3 py-1.5 rounded-lg bg-[#0a0e1a] border border-[#1e293b] text-sm text-slate-300 font-medium"
          >
            {entity}
          </span>
        ))}
      </div>
    );
  }

  if (meta.type === 'canned-qa') {
    const qas = Array.isArray(data) ? (data as { question: string; answer: string }[]) : [];
    return (
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {qas.map((qa, i) => (
          <div key={i} className="p-3.5 rounded-lg bg-[#0a0e1a] border border-[#1e293b]">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-sm font-semibold text-white">{qa.question}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 ml-5.5 leading-relaxed">{qa.answer}</p>
          </div>
        ))}
      </div>
    );
  }

  if (meta.type === 'corrections') {
    const corrections = Array.isArray(data) ? (data as { priority: string; rule: string }[]) : [];
    const priorityColors: Record<string, string> = {
      critical: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
    };
    return (
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {corrections.map((c, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0e1a] border border-[#1e293b]">
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0"
              style={{
                backgroundColor: `${priorityColors[c.priority]}20`,
                color: priorityColors[c.priority],
              }}
            >
              {c.priority}
            </span>
            <span className="text-sm text-slate-300">{c.rule}</span>
          </div>
        ))}
      </div>
    );
  }

  if (meta.type === 'glossary') {
    const items = Array.isArray(data) ? (data as { term: string; description: string }[]) : [];
    return (
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {items.map((item, i) => (
          <div key={i} className="p-3 rounded-lg bg-[#0a0e1a] border border-[#1e293b]">
            <div className="text-sm font-semibold text-pink-400">{item.term}</div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    );
  }

  if (meta.type === 'intents') {
    const intents = Array.isArray(data) ? (data as { intent: string; patterns: string[] }[]) : [];
    return (
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {intents.map((intent, i) => (
          <div key={i} className="p-3 rounded-lg bg-[#0a0e1a] border border-[#1e293b]">
            <div className="text-sm font-semibold text-teal-400">{intent.intent}</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(Array.isArray(intent.patterns) ? intent.patterns : []).map((p, j) => (
                <span key={j} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/60 text-slate-400">
                  "{p}"
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (meta.type === 'vector-index') {
    const chunks = Array.isArray((data as any)?.chunks) ? (data as any).chunks : [];
    return (
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        <div className="text-xs text-slate-500 mb-2">
          {chunks.length} chunks indexed from master.md via Orama
        </div>
        {chunks.map((chunk: any) => (
          <div key={chunk.id} className="p-3 rounded-lg bg-[#0a0e1a] border border-[#1e293b]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-cyan-400">{chunk.id}</span>
              <span className="text-[10px] text-slate-600">{chunk.embedding?.length || 0}D vector</span>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2 font-mono">{chunk.text}</p>
          </div>
        ))}
      </div>
    );
  }

  // metadata or fallback: show as JSON
  return (
    <div className="bg-[#0a0e1a] rounded-xl p-5 overflow-x-auto max-h-[600px] overflow-y-auto">
      <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
