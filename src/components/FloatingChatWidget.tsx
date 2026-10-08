import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Trash2, Zap, AlertCircle, Bot, User, ChevronDown, Package } from 'lucide-react';
import type { KnowledgePackage, KnowledgeAsset, CannedQA } from '@/lib/types';
import { gatewayChat, getGatewayConfig, type ChatMessage } from '@/lib/gateway';
import { addChatMessage, fetchChatMessages, clearChatMessages, fetchAssets } from '@/lib/services';
import { findAsset, matchCannedQA, buildSystemPrompt, MAX_MESSAGE_LENGTH, type DisplayMessage } from '@/lib/chat-utils';

interface FloatingChatWidgetProps {
  packages: KnowledgePackage[];
}

export function FloatingChatWidget({ packages }: FloatingChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<KnowledgePackage | null>(null);
  const [assets, setAssets] = useState<KnowledgeAsset[]>([]);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPackagePicker, setShowPackagePicker] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const readyPackages = packages.filter((p) => p.status === 'ready');

  // Auto-select first ready package
  useEffect(() => {
    if (!selectedPkgId && readyPackages.length > 0) {
      setSelectedPkgId(readyPackages[0].id);
    }
  }, [readyPackages, selectedPkgId]);

  // Load package and assets when selected
  const loadPackageData = useCallback(async () => {
    if (!selectedPkgId) return;
    const pkg = packages.find((p) => p.id === selectedPkgId) || null;
    setSelectedPkg(pkg);
    if (pkg) {
      setLoadingAssets(true);
      try {
        const a = await fetchAssets(pkg.id);
        setAssets(a);
      } catch {
        setAssets([]);
      } finally {
        setLoadingAssets(false);
      }
      try {
        const rows = await fetchChatMessages(pkg.id);
        setMessages(rows.map((r) => ({
          id: r.id,
          role: r.role,
          content: r.content,
          tokens: r.tokens_used,
          source: r.provider || undefined,
        })));
      } catch {
        setMessages([]);
      }
    }
  }, [selectedPkgId, packages]);

  useEffect(() => {
    if (isOpen && selectedPkgId) {
      loadPackageData();
    }
  }, [isOpen, selectedPkgId, loadPackageData]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const hasKnowledge = assets.length > 0;
  const cannedQAs = findAsset<CannedQA[]>(assets, 'canned-qa');

  const handleSend = async () => {
    if (!input.trim() || loading || !selectedPkg) return;
    const userMessage = input.trim().slice(0, MAX_MESSAGE_LENGTH);
    setInput('');

    const userMsg: DisplayMessage = { role: 'user', content: userMessage };
    setMessages((prev) => [...prev, userMsg]);
    try {
      await addChatMessage(selectedPkg.id, 'user', userMessage);
    } catch { /* non-critical */ }

    // Step 1: Check canned-qa.json
    if (cannedQAs && cannedQAs.length > 0) {
      const match = matchCannedQA(userMessage, cannedQAs);
      if (match) {
        const cannedMsg: DisplayMessage = {
          role: 'assistant',
          content: match.answer,
          source: 'canned-qa (0 tokens)',
          tokens: 0,
        };
        setMessages((prev) => [...prev, cannedMsg]);
        try {
          await addChatMessage(selectedPkg.id, 'assistant', match.answer, 0, 'canned-qa');
        } catch { /* non-critical */ }
        return;
      }
    }

    // Step 2: Call AI Gateway
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const systemPrompt = buildSystemPrompt(selectedPkg, assets);
      const gatewayMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages.filter((m) => m.content && !m.error).map((m) => ({ role: m.role, content: m.content } as ChatMessage)),
        { role: 'user', content: userMessage },
      ];
      const response = await gatewayChat(gatewayMessages, getGatewayConfig());
      setMessages((prev) => [...prev.slice(0, -1), {
        role: 'assistant',
        content: response.answer,
        source: `${response.provider} / ${response.model}`,
        tokens: response.tokensUsed,
      }]);
      try {
        await addChatMessage(selectedPkg.id, 'assistant', response.answer, response.tokensUsed, response.provider);
      } catch { /* non-critical */ }
    } catch (e) {
      const err = e as Error & { provider?: string; keyEnv?: string };
      const errMsg = err.keyEnv
        ? `${err.message}\n\nConfigure your ${err.provider?.toUpperCase()} API key in the Chat Preview tab.`
        : err.message;
      setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: errMsg, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!selectedPkg) return;
    setMessages([]);
    try {
      await clearChatMessages(selectedPkg.id);
    } catch { /* non-critical */ }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Don't render the widget if no packages exist at all
  if (packages.length === 0) return null;

  return (
    <>
      {/* Floating bubble button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/30 flex items-center justify-center hover:scale-105 transition-transform animate-pulse-glow"
          title="Open AI Chat Widget"
        >
          <MessageCircle className="w-6 h-6 text-white" />
          {readyPackages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0a0e1a] flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-40 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-2rem)] bg-[#111827] border border-[#1e293b] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e293b] bg-[#0d1220]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white">AI Assistant</div>
                <div className="text-[10px] text-slate-500 truncate">
                  {selectedPkg ? `knowledge/${selectedPkg.slug}` : 'Select a package...'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 0 && (
                <button
                  onClick={handleClear}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Clear chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Package selector */}
          {showPackagePicker && (
            <div className="border-b border-[#1e293b] bg-[#0a0e1a] p-2 max-h-48 overflow-y-auto animate-slide-in">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => {
                    setSelectedPkgId(pkg.id);
                    setShowPackagePicker(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                    selectedPkgId === pkg.id
                      ? 'bg-cyan-500/10 text-cyan-400'
                      : 'text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-medium truncate flex-1">{pkg.name}</span>
                  <span className={`text-[9px] px-1.5 rounded-full font-bold uppercase ${
                    pkg.status === 'ready'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-slate-700 text-slate-500'
                  }`}>
                    {pkg.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Package bar (click to switch) */}
          <button
            onClick={() => setShowPackagePicker(!showPackagePicker)}
            className="flex items-center justify-between px-4 py-2 border-b border-[#1e293b] text-xs text-slate-500 hover:bg-slate-800/30 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Package className="w-3 h-3" />
              {selectedPkg ? selectedPkg.name : 'Select a knowledge package'}
              {assets.length > 0 && (
                <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1.5 rounded-full font-bold">
                  {assets.length} files
                </span>
              )}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPackagePicker ? 'rotate-180' : ''}`} />
          </button>

          {/* Messages area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {!selectedPkg && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-slate-800/60 flex items-center justify-center mx-auto mb-2">
                  <Package className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-xs text-slate-500">Select a knowledge package above to start chatting</p>
              </div>
            )}

            {selectedPkg && loadingAssets && (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading knowledge...</p>
              </div>
            )}

            {selectedPkg && !loadingAssets && !hasKnowledge && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-slate-800/60 flex items-center justify-center mx-auto mb-2">
                  <AlertCircle className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-xs font-semibold text-slate-400">No knowledge generated yet</p>
                <p className="text-[10px] text-slate-600 mt-1 max-w-[240px] mx-auto">
                  Open this package, upload sources, and run the processing pipeline to generate knowledge.
                </p>
              </div>
            )}

            {selectedPkg && !loadingAssets && hasKnowledge && messages.length === 0 && (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-2">
                  <MessageCircle className="w-6 h-6 text-cyan-400" />
                </div>
                <p className="text-xs font-semibold text-white">Ask me anything</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Powered by knowledge/{selectedPkg.slug}</p>
                {cannedQAs && cannedQAs.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {cannedQAs.slice(0, 3).map((qa, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(qa.question)}
                        className="block w-full text-left text-[11px] text-slate-400 hover:text-cyan-400 px-2.5 py-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 transition-all"
                      >
                        {qa.question}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 animate-slide-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-cyan-500/15' : msg.error ? 'bg-red-500/15' : 'bg-slate-800'
                }`}>
                  {msg.role === 'user' ? (
                    <User className="w-3 h-3 text-cyan-400" />
                  ) : msg.error ? (
                    <AlertCircle className="w-3 h-3 text-red-400" />
                  ) : (
                    <Bot className="w-3 h-3 text-slate-400" />
                  )}
                </div>
                <div className={`max-w-[78%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-cyan-500/15 text-cyan-50 border border-cyan-500/20'
                      : msg.error
                      ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                      : 'bg-slate-800/60 text-slate-200 border border-slate-700/50'
                  }`}>
                    {msg.content || (loading ? 'Thinking...' : '')}
                    {loading && i === messages.length - 1 && msg.role === 'assistant' && !msg.content && (
                      <Loader2 className="w-3 h-3 animate-spin inline text-slate-500" />
                    )}
                  </div>
                  {msg.source && (
                    <div className={`text-[9px] text-slate-600 mt-0.5 flex items-center gap-0.5 ${
                      msg.role === 'user' ? 'justify-end' : ''
                    }`}>
                      {msg.tokens === 0 && <Zap className="w-2 h-2 text-amber-500" />}
                      {msg.source}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Input area */}
          <div className="px-3 py-3 border-t border-[#1e293b] bg-[#0d1220]">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={hasKnowledge ? 'Ask a question...' : 'Select a ready package...'}
                disabled={!hasKnowledge || loading || !selectedPkg}
                rows={1}
                className="flex-1 bg-[#1a2235] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 transition-colors resize-none"
                style={{ minHeight: '36px', maxHeight: '80px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading || !hasKnowledge}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:from-cyan-300 hover:to-cyan-500 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>
            <div className="text-[9px] text-slate-600 mt-1.5 text-center">
              {getGatewayConfig().provider.toUpperCase()} · canned Q&A first · knowledge-scoped
            </div>
          </div>
        </div>
      )}
    </>
  );
}
