import { useState } from 'react';
import {
  FileText, Brain, Tag, MessageSquare, ShieldAlert, BookMarked, Target,
  Info, Database, Search, ChevronRight, type LucideIcon,
} from 'lucide-react';
import type { KnowledgePackage, KnowledgeAsset, AssetType } from '@/lib/types';
import { upsertAsset } from '@/lib/services';
import { saveAs } from '@/lib/download';

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

  const assetMap = new Map(assets.map((a) => [a.asset_type, a]));
  const selectedAsset = selectedType ? assetMap.get(selectedType) : null;
  const selectedMeta = ASSET_METAS.find((m) => m.type === selectedType);

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
      <div className="w-64 shrink-0 space-y-1">
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
    const facts = data as { id: string; category: string; value: string }[];
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
    const entities = data as string[];
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
    const qas = data as { question: string; answer: string }[];
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
    const corrections = data as { priority: string; rule: string }[];
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
    const items = data as { term: string; description: string }[];
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
    const intents = data as { intent: string; patterns: string[] }[];
    return (
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {intents.map((intent, i) => (
          <div key={i} className="p-3 rounded-lg bg-[#0a0e1a] border border-[#1e293b]">
            <div className="text-sm font-semibold text-teal-400">{intent.intent}</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {intent.patterns.map((p, j) => (
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
    const index = data as { chunks: { id: string; text: string; embedding: number[] }[] };
    return (
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        <div className="text-xs text-slate-500 mb-2">
          {index.chunks.length} chunks indexed from master.md via Orama
        </div>
        {index.chunks.map((chunk) => (
          <div key={chunk.id} className="p-3 rounded-lg bg-[#0a0e1a] border border-[#1e293b]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-cyan-400">{chunk.id}</span>
              <span className="text-[10px] text-slate-600">{chunk.embedding.length}D vector</span>
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
