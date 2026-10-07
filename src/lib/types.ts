export type PackageType =
  | 'portfolio'
  | 'apartments'
  | 'company'
  | 'product'
  | 'support'
  | 'legal'
  | 'custom';

export type PackageStatus = 'draft' | 'processing' | 'ready' | 'error';

export type SourceStatus = 'uploaded' | 'normalizing' | 'normalized' | 'error';

export type JobStatus = 'idle' | 'running' | 'completed' | 'error';

export type AssetType =
  | 'master'
  | 'facts'
  | 'entities'
  | 'summary'
  | 'canned-qa'
  | 'corrections'
  | 'glossary'
  | 'intents'
  | 'metadata'
  | 'vector-index';

export interface KnowledgePackage {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: PackageType;
  status: PackageStatus;
  color: string;
  icon: string;
  sources_count: number;
  facts_count: number;
  version: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeSource {
  id: string;
  package_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  normalized_name: string | null;
  normalized_content: string | null;
  status: SourceStatus;
  created_at: string;
}

export interface KnowledgeAsset {
  id: string;
  package_id: string;
  asset_type: AssetType;
  asset_data: unknown;
  created_at: string;
  updated_at: string;
}

export interface ProcessingJob {
  id: string;
  package_id: string;
  stage: string;
  progress: number;
  status: JobStatus;
  log: { time: string; stage: string; message: string; type: 'info' | 'success' | 'error' }[];
  created_at: string;
  updated_at: string;
}

export interface Fact {
  id: string;
  category: string;
  value: string;
}

export interface CannedQA {
  question: string;
  answer: string;
}

export interface Correction {
  priority: 'critical' | 'warning' | 'info';
  rule: string;
}

export interface GlossaryItem {
  term: string;
  description: string;
}

export interface Intent {
  intent: string;
  patterns: string[];
}

export interface Metadata {
  id: string;
  version: string;
  sources: number;
  facts: number;
  generated_at: string;
}

export interface ChatMessageRow {
  id: string;
  package_id: string;
  role: 'user' | 'assistant';
  content: string;
  tokens_used: number;
  provider: string | null;
  created_at: string;
}
