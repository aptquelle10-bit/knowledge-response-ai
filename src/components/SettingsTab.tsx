import { useState } from 'react';
import { Trash2, AlertTriangle, Code2, Check, Zap } from 'lucide-react';
import type { KnowledgePackage } from '@/lib/types';
import { getPackageIcon } from '@/lib/icons';
import { getGatewayConfig, PROVIDER_INFO } from '@/lib/gateway';
import type { LucideIcon } from 'lucide-react';

interface SettingsTabProps {
  pkg: KnowledgePackage;
  onDeleted: () => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (v: boolean) => void;
}

export function SettingsTab({ pkg, onDeleted, showDeleteConfirm, setShowDeleteConfirm }: SettingsTabProps) {
  const Icon: LucideIcon = getPackageIcon(pkg.icon);
  const gatewayConfig = getGatewayConfig();
  const providerInfo = PROVIDER_INFO.find((p) => p.id === gatewayConfig.provider)!;

  const embedCode = `<script
  src="ai-brain-widget.js"
  data-knowledge="/knowledge/${pkg.slug}"
  data-folder="${pkg.slug}"
  data-mode="floating"
  data-theme="emerald">
</script>`;

  const telegramCode = `// Bot Builder Suite — Telegram integration
const bot = new BotBuilder({
  knowledge: "/knowledge/${pkg.slug}",
  folder: "${pkg.slug}",
});

bot.onMessage(async (msg) => {
  // 1. Check canned-qa.json (0 tokens)
  // 2. Search Orama vector index
  // 3. Call aiGateway.chat()
  const answer = await bot.answer(msg.text);
  return answer;
});`;

  const folderStructure = `knowledge/
└── ${pkg.slug}/
    ├── sources/
    ├── normalized/
    ├── generated/
    │   ├── facts.json
    │   ├── entities.json
    │   ├── canned-qa.json
    │   ├── corrections.json
    │   ├── glossary.json
    │   ├── intents.json
    │   ├── metadata.json
    │   └── vector-index.json
    ├── master.md
    ├── summary.md
    └── config.json`;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Package info */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
          Package Information
        </h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${pkg.color}20` }}>
            <Icon className="w-6 h-6" style={{ color: pkg.color }} />
          </div>
          <div>
            <div className="text-base font-semibold text-white">{pkg.name}</div>
            <div className="text-xs text-slate-500 font-mono">knowledge/{pkg.slug}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Type" value={pkg.type} />
          <InfoRow label="Status" value={pkg.status} />
          <InfoRow label="Version" value={pkg.version} />
          <InfoRow label="Sources" value={String(pkg.sources_count)} />
          <InfoRow label="Facts" value={String(pkg.facts_count)} />
          <InfoRow label="Created" value={new Date(pkg.created_at).toLocaleDateString()} />
        </div>
      </div>

      {/* Folder structure */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
          Knowledge Package Structure
        </h3>
        <div className="bg-[#0a0e1a] rounded-xl p-4 overflow-x-auto">
          <pre className="text-xs text-slate-400 font-mono leading-relaxed">{folderStructure}</pre>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          The knowledge folder is the deployable artifact. Only <span className="text-cyan-400 font-mono">master.md</span> is editable — everything else is generated from it.
        </p>
      </div>

      {/* AI Gateway config */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            AI Gateway Configuration
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Provider" value={providerInfo.label} />
          <InfoRow label="Model" value={gatewayConfig.model || providerInfo.models[0]} />
          <InfoRow label="Temperature" value={String(gatewayConfig.temperature ?? 0.7)} />
          <InfoRow label="Max Tokens" value={String(gatewayConfig.maxTokens ?? 1024)} />
        </div>
        <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <p className="text-xs text-slate-400">
            API key <span className="font-mono text-amber-400">{providerInfo.keyEnvName}</span> must be
            configured as an edge function secret. Go to the Chat Preview tab and click "Configure" to
            change providers, or "Test Connection" to verify the key is set.
          </p>
        </div>
      </div>

      {/* Embed code */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Code2 className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Chat Widget Embed
          </h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Add this script tag to any website to embed an AI assistant powered by this knowledge package:
        </p>
        <CodeBlock code={embedCode} />
        <div className="mt-3 grid grid-cols-1 gap-2">
          <FeatureRow text="Loads only this knowledge package — no cross-folder mixing" />
          <FeatureRow text="Checks canned-qa.json first for instant, zero-token answers" />
          <FeatureRow text="Falls back to Orama vector search + AI Gateway for complex queries" />
        </div>
      </div>

      {/* Telegram bot code */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Code2 className="w-4 h-4 text-teal-400" />
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Telegram Bot Integration
          </h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Connect the same knowledge package to a Telegram bot using Bot Builder Suite:
        </p>
        <CodeBlock code={telegramCode} />
      </div>

      {/* Danger zone */}
      <div className="card p-5 border-red-500/20">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">
            Danger Zone
          </h3>
        </div>
        {!showDeleteConfirm ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">Delete this knowledge package</div>
              <p className="text-xs text-slate-500 mt-0.5">
                This will permanently delete all sources, generated assets, and processing history.
              </p>
            </div>
            <button onClick={() => setShowDeleteConfirm(true)} className="btn-danger">
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-white mb-1">Are you absolutely sure?</p>
            <p className="text-xs text-slate-500 mb-4">
              This action cannot be undone. All knowledge will be permanently lost.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-ghost">
                Cancel
              </button>
              <button onClick={onDeleted} className="btn-danger">
                <Trash2 className="w-4 h-4" />
                Yes, Delete Forever
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0a0e1a]">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-300 capitalize">{value}</span>
    </div>
  );
}

function FeatureRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
      {text}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <div className="bg-[#0a0e1a] rounded-xl p-4 overflow-x-auto">
        <pre className="text-xs text-slate-300 font-mono leading-relaxed">{code}</pre>
      </div>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-slate-800/80 text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : null}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
