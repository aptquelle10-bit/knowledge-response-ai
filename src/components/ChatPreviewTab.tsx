import { MessageSquare, Settings, ExternalLink, AlertCircle, Check, Loader2, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ChatWidget } from '@/components/ChatWidget';
import { GatewaySettings } from '@/components/GatewaySettings';
import type { KnowledgePackage, KnowledgeAsset } from '@/lib/types';
import { getGatewayConfig, gatewayChat, PROVIDER_INFO } from '@/lib/gateway';

interface ChatPreviewTabProps {
  pkg: KnowledgePackage;
  assets: KnowledgeAsset[];
  onMessagesChanged?: () => void;
}

export function ChatPreviewTab({ pkg, assets, onMessagesChanged }: ChatPreviewTabProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [configVersion, setConfigVersion] = useState(0);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error' | 'nokey'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const config = getGatewayConfig();
  const providerInfo = PROVIDER_INFO.find((p) => p.id === config.provider)!;
  // Force re-read when config changes
  useEffect(() => {
    // configVersion is used to trigger re-render
  }, [configVersion]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult('idle');
    setTestMessage('');
    try {
      const res = await gatewayChat([
        { role: 'system', content: 'Respond with exactly: "Connection successful."' },
        { role: 'user', content: 'Test connection. Reply with the exact phrase.' },
      ], config);
      setTestResult('success');
      setTestMessage(`Connected to ${res.provider} / ${res.model}. Response: "${res.answer}"`);
    } catch (e) {
      const err = e as Error & { keyEnv?: string };
      if (err.keyEnv) {
        setTestResult('nokey');
        setTestMessage(`${err.message}`);
      } else {
        setTestResult('error');
        setTestMessage(err.message);
      }
    } finally {
      setTesting(false);
    }
  };

  const hasKnowledge = assets.length > 0;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Gateway status bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/15 flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">AI Gateway Hub</div>
              <div className="text-xs text-slate-500">
                Provider: <span className="text-cyan-400 font-medium">{providerInfo.label}</span>
                {' · '}
                Model: <span className="text-slate-400 font-mono">{config.model || providerInfo.models[0]}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="btn-ghost text-xs"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Test Connection
            </button>
            <button onClick={() => setShowSettings(true)} className="btn-ghost text-xs">
              <Settings className="w-3.5 h-3.5" />
              Configure
            </button>
          </div>
        </div>

        {/* Test result */}
        {testResult !== 'idle' && (
          <div className={`mt-3 p-3 rounded-lg text-xs animate-slide-in ${
            testResult === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : testResult === 'nokey'
              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
              : 'bg-red-500/10 border border-red-500/20 text-red-300'
          }`}>
            <div className="flex items-start gap-2">
              {testResult === 'success' ? (
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div>
                <div>{testMessage}</div>
                {testResult === 'nokey' && (
                  <div className="mt-2">
                    <button
                      onClick={() => setShowSettings(true)}
                      className="text-amber-400 underline hover:text-amber-300"
                    >
                      Click here to configure your API key
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* No knowledge warning */}
      {!hasKnowledge && (
        <div className="card p-3 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              This package has no processed knowledge yet. Upload sources and run the processing pipeline
              first to enable AI-powered answers. The chat below will work once knowledge is generated.
            </span>
          </div>
        </div>
      )}

      {/* Chat widget — always visible */}
      <div className="card p-5 flex flex-col" style={{ minHeight: '500px' }}>
        <ChatWidget
          key={`${pkg.id}-${configVersion}`}
          pkg={pkg}
          assets={assets}
          onMessagesChanged={onMessagesChanged}
        />
      </div>

      {/* How it works */}
      <div className="card p-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          How the Chat Widget Runtime Works
        </h4>
        <div className="space-y-2.5 text-xs text-slate-400">
          <RuntimeStep step="1" title="Check canned-qa.json" detail="If the question matches a pre-generated Q&A, answer instantly — 0 tokens, 0 latency" color="#f59e0b" />
          <RuntimeStep step="2" title="Search vector index" detail="Orama searches the knowledge package's vector index for relevant chunks from master.md" color="#06b6d4" />
          <RuntimeStep step="3" title="Retrieve context" detail="Pull relevant facts, entities, and corrections to build the prompt" color="#3b82f6" />
          <RuntimeStep step="4" title="Call AI Gateway" detail="gateway.chat() routes to your chosen provider (OpenAI, Gemini, Claude, or Groq) with the knowledge context" color="#10b981" />
        </div>
      </div>

      {/* Gateway settings modal */}
      {showSettings && (
        <GatewaySettings
          onClose={() => {
            setShowSettings(false);
            setConfigVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}

function RuntimeStep({ step, title, detail, color }: { step: string; title: string; detail: string; color: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {step}
      </div>
      <div>
        <span className="font-semibold text-slate-300">{title}</span>
        {' — '}
        <span>{detail}</span>
      </div>
    </div>
  );
}
