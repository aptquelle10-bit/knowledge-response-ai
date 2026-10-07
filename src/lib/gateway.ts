import { supabase } from './supabase';

export type AIProvider = 'openai' | 'gemini' | 'claude' | 'groq';

export interface GatewayConfig {
  provider: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GatewayResponse {
  answer: string;
  provider: string;
  model: string;
  tokensUsed: number;
}

export interface GatewayError {
  error: string;
  provider?: string;
  keyEnv?: string;
}

const SETTINGS_KEY = 'omni-ai-gateway-config';

export function getGatewayConfig(): GatewayConfig {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { provider: 'openai', temperature: 0.7, maxTokens: 1024 };
}

export function saveGatewayConfig(config: GatewayConfig): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(config));
}

export async function gatewayChat(
  messages: ChatMessage[],
  config?: GatewayConfig
): Promise<GatewayResponse> {
  const cfg = config || getGatewayConfig();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-gateway`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages,
      provider: cfg.provider,
      model: cfg.model,
      temperature: cfg.temperature,
      maxTokens: cfg.maxTokens,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg = (data as GatewayError).error || `Gateway error (${res.status})`;
    const err = new Error(errMsg) as Error & { provider?: string; keyEnv?: string };
    err.provider = (data as GatewayError).provider;
    err.keyEnv = (data as GatewayError).keyEnv;
    throw err;
  }

  return data as GatewayResponse;
}

export const PROVIDER_INFO: { id: AIProvider; label: string; description: string; models: string[]; keyEnvName: string; docsUrl: string }[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT-4o, GPT-4o-mini, and more. Most popular choice.',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    keyEnvName: 'OPENAI_API_KEY',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    description: 'Gemini 1.5 Flash/Pro. Fast and capable.',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
    keyEnvName: 'GEMINI_API_KEY',
    docsUrl: 'https://aistudio.google.com/apikey',
  },
  {
    id: 'claude',
    label: 'Anthropic Claude',
    description: 'Claude 3.5 Sonnet. Great for nuanced reasoning.',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    keyEnvName: 'ANTHROPIC_API_KEY',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'groq',
    label: 'Groq',
    description: 'Llama models at extreme speed. Free tier available.',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    keyEnvName: 'GROQ_API_KEY',
    docsUrl: 'https://console.groq.com/keys',
  },
];
