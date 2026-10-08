import type { KnowledgePackage, KnowledgeAsset, CannedQA, Correction, GlossaryItem } from './types';

export interface DisplayMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  source?: string;
  tokens?: number;
  error?: boolean;
}

export function findAsset<T>(assets: KnowledgeAsset[], type: string): T | null {
  const asset = assets.find((a) => a.asset_type === type);
  return asset ? (asset.asset_data as T) : null;
}

export function matchCannedQA(question: string, qas: CannedQA[]): CannedQA | null {
  const normalized = question.toLowerCase().trim();
  const questionWords = normalized.split(/\s+/).filter((w) => w.length > 2);
  if (questionWords.length === 0) return null;

  let bestMatch: CannedQA | null = null;
  let bestScore = 0;
  for (const qa of qas) {
    const qaLower = qa.question.toLowerCase();
    const matchCount = questionWords.filter((w) => qaLower.includes(w)).length;
    const score = matchCount / questionWords.length;
    if (score > bestScore && score > 0.5) {
      bestScore = score;
      bestMatch = qa;
    }
  }
  return bestMatch;
}

export function buildSystemPrompt(pkg: KnowledgePackage, assets: KnowledgeAsset[]): string {
  const master = findAsset<{ content: string }>(assets, 'master');
  const corrections = findAsset<Correction[]>(assets, 'corrections');
  const glossary = findAsset<GlossaryItem[]>(assets, 'glossary');
  const entities = findAsset<string[]>(assets, 'entities');

  let prompt = `You are an AI assistant for the "${pkg.name}" knowledge package.\n\n`;
  prompt += `Use the following knowledge to answer questions. Stay within the scope of this knowledge.\n`;
  prompt += `If the answer is not in the knowledge, say you don't have that information rather than guessing.\n\n`;

  if (master?.content) {
    prompt += `=== MASTER KNOWLEDGE ===\n${master.content}\n\n`;
  }

  if (corrections && corrections.length > 0) {
    prompt += `=== RULES AND GUARDRAILS (MUST FOLLOW) ===\n`;
    for (const c of corrections) {
      prompt += `[${c.priority.toUpperCase()}] ${c.rule}\n`;
    }
    prompt += `\n`;
  }

  if (glossary && glossary.length > 0) {
    prompt += `=== GLOSSARY ===\n`;
    for (const g of glossary) {
      prompt += `- ${g.term}: ${g.description}\n`;
    }
    prompt += `\n`;
  }

  if (entities && entities.length > 0) {
    prompt += `=== KNOWN ENTITIES ===\n${entities.join(', ')}\n\n`;
  }

  prompt += `Answer concisely and accurately. Use the knowledge above as your single source of truth.\n`;

  return prompt;
}

export const MAX_MESSAGE_LENGTH = 4000;
