import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Trash2, MessageSquare, Zap, AlertCircle, Bot, User } from 'lucide-react';
import type { KnowledgePackage, KnowledgeAsset, CannedQA } from '@/lib/types';
import { gatewayChat, getGatewayConfig, type ChatMessage } from '@/lib/gateway';
import { addChatMessage, fetchChatMessages, clearChatMessages } from '@/lib/services';
import { findAsset, matchCannedQA, buildSystemPrompt, MAX_MESSAGE_LENGTH, type DisplayMessage } from '@/lib/chat-utils';

interface ChatWidgetProps {
  pkg: KnowledgePackage;
  assets: KnowledgeAsset[];
  onMessagesChanged?: () => void;
}

export function ChatWidget({ pkg, assets, onMessagesChanged }: ChatWidgetProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
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
      // ignore — start with empty chat
    }
  }, [pkg.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    setError(null);

    const userMsg: DisplayMessage = { role: 'user', content: userMessage };
    setMessages((prev) => [...prev, userMsg]);

    try {
      await addChatMessage(pkg.id, 'user', userMessage);
    } catch {
      // non-critical
    }

    // Step 1: Check canned-qa.json (0 tokens)
    const qas = findAsset<CannedQA[]>(assets, 'canned-qa');
    if (qas && qas.length > 0) {
      const match = matchCannedQA(userMessage, qas);
      if (match) {
        const cannedMsg: DisplayMessage = {
          role: 'assistant',
          content: match.answer,
          source: 'canned-qa (0 tokens)',
          tokens: 0,
        };
        setMessages((prev) => [...prev, cannedMsg]);
        try {
          await addChatMessage(pkg.id, 'assistant', match.answer, 0, 'canned-qa');
        } catch { /* non-critical */ }
        onMessagesChanged?.();
        return;
      }
    }

    // Step 2: Call AI Gateway with knowledge context
    setLoading(true);
    const thinkingMsg: DisplayMessage = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, thinkingMsg]);

    try {
      const systemPrompt = buildSystemPrompt(pkg, assets);
      const gatewayMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages
          .filter((m) => m.content && !m.error)
          .map((m) => ({ role: m.role, content: m.content } as ChatMessage)),
        { role: 'user', content: userMessage },
      ];

      const config = getGatewayConfig();
      const response = await gatewayChat(gatewayMessages, config);

      const aiMsg: DisplayMessage = {
        role: 'assistant',
        content: response.answer,
        source: `${response.provider} / ${response.model}`,
        tokens: response.tokensUsed,
      };
      setMessages((prev) => [...prev.slice(0, -1), aiMsg]);

      try {
        await addChatMessage(pkg.id, 'assistant', response.answer, response.tokensUsed, response.provider);
      } catch { /* non-critical */ }
      onMessagesChanged?.();
    } catch (e) {
      const err = e as Error & { provider?: string; keyEnv?: string };
      const errMsg = err.keyEnv
        ? `${err.message}\n\nTo fix this: go to AI Gateway settings and configure your ${err.provider?.toUpperCase()} API key.`
        : err.message;
      const errorMsg: DisplayMessage = {
        role: 'assistant',
        content: errMsg,
        error: true,
      };
      setMessages((prev) => [...prev.slice(0, -1), errorMsg]);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setMessages([]);
    setError(null);
    try {
      await clearChatMessages(pkg.id);
    } catch { /* non-critical */ }
    onMessagesChanged?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasKnowledge = assets.length > 0;
  const cannedQAs = findAsset<CannedQA[]>(assets, 'canned-qa');

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-200px)]">
      {/* Chat header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
            <Bot className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">AI Assistant Preview</div>
            <div className="text-[10px] text-slate-500">
              {hasKnowledge
                ? `Powered by knowledge/${pkg.slug}`
                : 'No knowledge generated yet'}
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={handleClear} className="btn-ghost text-xs">
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 p-1 min-h-[300px]"
      >
        {messages.length === 0 && (
          <div className="text-center py-12">
            {hasKnowledge ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">Test Your Knowledge Package</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Ask any question to see how your AI assistant would respond.
                  It checks canned Q&A first (zero tokens), then uses the AI Gateway.
                </p>
                {cannedQAs && cannedQAs.length > 0 && (
                  <div className="mt-4 max-w-md mx-auto">
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Try These Questions
                    </div>
                    <div className="space-y-1.5">
                      {cannedQAs.slice(0, 3).map((qa, i) => (
                        <button
                          key={i}
                          onClick={() => setInput(qa.question)}
                          className="block w-full text-left text-xs text-slate-400 hover:text-cyan-400 px-3 py-2 rounded-lg bg-slate-800/30 hover:bg-slate-800/60 transition-all"
                        >
                          {qa.question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-7 h-7 text-slate-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-400">No knowledge yet</h3>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                  Process your sources first to generate knowledge, then come back to test the chat.
                </p>
              </>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2.5 animate-slide-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              msg.role === 'user'
                ? 'bg-cyan-500/15'
                : msg.error
                ? 'bg-red-500/15'
                : 'bg-slate-800'
            }`}>
              {msg.role === 'user' ? (
                <User className="w-3.5 h-3.5 text-cyan-400" />
              ) : msg.error ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Bot className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
            <div className={`max-w-[75%] ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div className={`px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-500/15 text-cyan-50 border border-cyan-500/20'
                  : msg.error
                  ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                  : 'bg-slate-800/60 text-slate-200 border border-slate-700/50'
              }`}>
                {msg.content || (loading ? 'Thinking...' : '')}
                {loading && i === messages.length - 1 && msg.role === 'assistant' && !msg.content && (
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                  </span>
                )}
              </div>
              {msg.source && (
                <div className={`text-[10px] text-slate-600 mt-1 flex items-center gap-1 ${
                  msg.role === 'user' ? 'justify-end' : ''
                }`}>
                  {msg.tokens === 0 && <Zap className="w-2.5 h-2.5 text-amber-500" />}
                  {msg.source}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input area */}
      <div className="mt-3 pt-3 border-t border-[#1e293b]">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasKnowledge ? 'Ask a question about this knowledge...' : 'Ask a question (process sources for better answers)...'}
            disabled={loading}
            rows={1}
            className="input-field resize-none text-sm"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="btn-primary shrink-0"
            style={{ height: '42px', width: '42px', padding: 0, justifyContent: 'center' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <div className="text-[10px] text-slate-600 mt-1.5 px-1">
          {getGatewayConfig().provider.toUpperCase()} gateway · canned Q&A checked first · knowledge-scoped responses
        </div>
      </div>
    </div>
  );
}
