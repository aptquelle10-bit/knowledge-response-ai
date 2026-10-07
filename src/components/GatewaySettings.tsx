import { useState } from 'react';
import { X, Zap, Check, ExternalLink, AlertCircle, KeyRound } from 'lucide-react';
import { getGatewayConfig, saveGatewayConfig, PROVIDER_INFO, type AIProvider, type GatewayConfig } from '@/lib/gateway';

interface GatewaySettingsProps {
  onClose: () => void;
}

export function GatewaySettings({ onClose }: GatewaySettingsProps) {
  const [config, setConfig] = useState<GatewayConfig>(getGatewayConfig());
  const [saved, setSaved] = useState(false);

  const handleProviderChange = (provider: AIProvider) => {
    const providerInfo = PROVIDER_INFO.find((p) => p.id === provider)!;
    setConfig({
      ...config,
      provider,
      model: providerInfo.models[0],
    });
    setSaved(false);
  };

  const handleSave = () => {
    saveGatewayConfig(config);
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const currentProvider = PROVIDER_INFO.find((p) => p.id === config.provider)!;
  const currentModels = currentProvider.models;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-[#111827] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI Gateway Hub</h2>
              <p className="text-xs text-slate-500">Choose your AI provider and model</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Provider selection */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              AI Provider
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {PROVIDER_INFO.map((provider) => {
                const isSelected = config.provider === provider.id;
                return (
                  <button
                    key={provider.id}
                    onClick={() => handleProviderChange(provider.id)}
                    className={`relative flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-cyan-500/40 bg-cyan-500/5'
                        : 'border-[#1e293b] hover:border-slate-700 hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white">{provider.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5 leading-snug">{provider.description}</div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-4 h-4 text-cyan-400" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model selection */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Model
            </label>
            <select
              value={config.model || currentModels[0]}
              onChange={(e) => { setConfig({ ...config, model: e.target.value }); setSaved(false); }}
              className="input-field"
            >
              {currentModels.map((model) => (
                <option key={model} value={model} className="bg-[#1a2235]">
                  {model}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-600 mt-1">
              Different models have different speed, cost, and quality tradeoffs.
            </p>
          </div>

          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Temperature
              </label>
              <span className="text-sm font-mono text-cyan-400">{config.temperature ?? 0.7}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.temperature ?? 0.7}
              onChange={(e) => { setConfig({ ...config, temperature: parseFloat(e.target.value) }); setSaved(false); }}
              className="w-full accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
              <span>Precise (0)</span>
              <span>Balanced (0.7)</span>
              <span>Creative (1)</span>
            </div>
          </div>

          {/* Max tokens */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Max Response Tokens
            </label>
            <input
              type="number"
              min="128"
              max="4096"
              step="128"
              value={config.maxTokens ?? 1024}
              onChange={(e) => { setConfig({ ...config, maxTokens: parseInt(e.target.value) || 1024 }); setSaved(false); }}
              className="input-field"
            />
          </div>

          {/* API key info */}
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-amber-300">API Key Required</div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Your API key is stored securely as a server-side secret and never exposed to the browser.
                  The AI Gateway edge function uses the key <span className="font-mono text-amber-400">{currentProvider.keyEnvName}</span> to call {currentProvider.label}.
                </p>
                <a
                  href={currentProvider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 mt-2"
                >
                  Get your {currentProvider.label} API key
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="p-4 rounded-xl bg-slate-800/30 border border-[#1e293b]">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-300">How the Gateway Works</div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Your browser calls the AI Gateway edge function, which securely forwards the request
                  to your chosen provider using the server-side API key. The response comes back through
                  the gateway — the key never touches the frontend.
                </p>
                <div className="mt-2 text-[10px] font-mono text-slate-600">
                  Browser → Edge Function (ai-gateway) → {currentProvider.label} API → Response
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1e293b] bg-[#0d1220]">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary">
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                Saved!
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
