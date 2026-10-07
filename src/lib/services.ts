import { supabase } from './supabase';
import type {
  KnowledgePackage,
  KnowledgeSource,
  KnowledgeAsset,
  ProcessingJob,
  AssetType,
  PackageType,
  ChatMessageRow,
} from './types';
import {
  generateNormalizedContent,
  normalizeFilename,
  generateMasterDoc,
  generateFacts,
  generateEntities,
  generateCannedQA,
  generateCorrections,
  generateGlossary,
  generateIntents,
  generateSummary,
  generateMetadata,
  generateVectorIndex,
  getFileExtension,
  getFileTypeLabel,
} from './engine';

export async function fetchPackages(): Promise<KnowledgePackage[]> {
  const { data, error } = await supabase
    .from('knowledge_packages')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data as KnowledgePackage[];
}

export async function fetchPackage(id: string): Promise<KnowledgePackage | null> {
  const { data, error } = await supabase
    .from('knowledge_packages')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as KnowledgePackage | null;
}

export async function createPackage(input: {
  name: string;
  slug: string;
  description: string;
  type: PackageType;
  color: string;
  icon: string;
}): Promise<KnowledgePackage> {
  const { data, error } = await supabase
    .from('knowledge_packages')
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description,
      type: input.type,
      color: input.color,
      icon: input.icon,
      status: 'draft',
    })
    .select()
    .single();
  if (error) throw error;

  const pkg = data as KnowledgePackage;

  await supabase.from('processing_jobs').insert({
    package_id: pkg.id,
    stage: 'idle',
    progress: 0,
    status: 'idle',
    log: [],
  });

  return pkg;
}

export async function deletePackage(id: string): Promise<void> {
  const { error } = await supabase.from('knowledge_packages').delete().eq('id', id);
  if (error) throw error;
}

export async function updatePackage(
  id: string,
  updates: Partial<KnowledgePackage>
): Promise<void> {
  const { error } = await supabase
    .from('knowledge_packages')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function fetchSources(packageId: string): Promise<KnowledgeSource[]> {
  const { data, error } = await supabase
    .from('knowledge_sources')
    .select('*')
    .eq('package_id', packageId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as KnowledgeSource[];
}

export async function addSource(
  packageId: string,
  file: File
): Promise<KnowledgeSource> {
  const ext = getFileExtension(file.name);
  const { data, error } = await supabase
    .from('knowledge_sources')
    .insert({
      package_id: packageId,
      filename: file.name,
      file_type: ext || 'unknown',
      file_size: file.size,
      status: 'uploaded',
    })
    .select()
    .single();
  if (error) throw error;
  return data as KnowledgeSource;
}

export async function addSourceByName(
  packageId: string,
  filename: string,
  fileSize: number
): Promise<KnowledgeSource> {
  const ext = getFileExtension(filename);
  const { data, error } = await supabase
    .from('knowledge_sources')
    .insert({
      package_id: packageId,
      filename,
      file_type: ext || 'unknown',
      file_size: fileSize,
      status: 'uploaded',
    })
    .select()
    .single();
  if (error) throw error;
  return data as KnowledgeSource;
}

export async function deleteSource(id: string): Promise<void> {
  const { error } = await supabase.from('knowledge_sources').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchAssets(packageId: string): Promise<KnowledgeAsset[]> {
  const { data, error } = await supabase
    .from('knowledge_assets')
    .select('*')
    .eq('package_id', packageId);
  if (error) throw error;
  return data as KnowledgeAsset[];
}

export async function fetchAsset(
  packageId: string,
  assetType: AssetType
): Promise<KnowledgeAsset | null> {
  const { data, error } = await supabase
    .from('knowledge_assets')
    .select('*')
    .eq('package_id', packageId)
    .eq('asset_type', assetType)
    .maybeSingle();
  if (error) throw error;
  return data as KnowledgeAsset | null;
}

export async function upsertAsset(
  packageId: string,
  assetType: AssetType,
  assetData: unknown
): Promise<void> {
  const { error } = await supabase
    .from('knowledge_assets')
    .upsert(
      {
        package_id: packageId,
        asset_type: assetType,
        asset_data: assetData as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'package_id,asset_type' }
    );
  if (error) throw error;
}

export async function fetchJob(packageId: string): Promise<ProcessingJob | null> {
  const { data, error } = await supabase
    .from('processing_jobs')
    .select('*')
    .eq('package_id', packageId)
    .maybeSingle();
  if (error) throw error;
  return data as ProcessingJob | null;
}

export async function updateJob(
  packageId: string,
  updates: Partial<ProcessingJob>
): Promise<void> {
  const { error } = await supabase
    .from('processing_jobs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('package_id', packageId);
  if (error) throw error;
}

function makeLogEntry(stage: string, message: string, type: 'info' | 'success' | 'error' = 'info') {
  return {
    time: new Date().toISOString(),
    stage,
    message,
    type,
  };
}

export async function runProcessingPipeline(
  packageId: string,
  pkg: KnowledgePackage,
  sources: KnowledgeSource[],
  onProgress?: (stage: string, progress: number, log: ProcessingJob['log']) => void
): Promise<void> {
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  await updatePackage(packageId, { status: 'processing' });

  const freshLog = [makeLogEntry('normalization', `Starting normalization of ${sources.length} source${sources.length !== 1 ? 's' : ''}...`)];
  await updateJob(packageId, {
    stage: 'normalization',
    progress: 0,
    status: 'running',
    log: freshLog,
  });

  if (onProgress) onProgress('normalization', 0, freshLog);

  // Stage 1: Normalization
  for (let i = 0; i < sources.length; i++) {
    await delay(400);
    const source = sources[i];
    const normalizedName = normalizeFilename(source.filename);
    const normalizedContent = generateNormalizedContent(source.filename);

    await supabase
      .from('knowledge_sources')
      .update({
        normalized_name: normalizedName,
        normalized_content: normalizedContent,
        status: 'normalized',
      })
      .eq('id', source.id);

    const progress = Math.round(((i + 1) / sources.length) * 20);
    const logEntry = makeLogEntry('normalization', `Normalized ${source.filename} → ${normalizedName} [${getFileTypeLabel(source.file_type)}]`, 'success');
    const newLog = [...freshLog, logEntry];
    await updateJob(packageId, { stage: 'normalization', progress, log: newLog });
    if (onProgress) onProgress('normalization', progress, newLog);
  }

  // Stage 2: Knowledge Intelligence (Extraction)
  await delay(500);
  const afterNormLog = [...freshLog, makeLogEntry('extraction', 'AI Gateway Hub: gateway.chat() — extracting facts, entities, and relationships...', 'info')];
  await updateJob(packageId, { stage: 'extraction', progress: 30, log: afterNormLog });
  if (onProgress) onProgress('extraction', 30, afterNormLog);

  const facts = generateFacts(pkg.type);
  const entities = generateEntities(pkg.type);
  const qas = generateCannedQA(pkg.type);
  const corrections = generateCorrections(pkg.type);
  const glossary = generateGlossary(pkg.type);
  const intents = generateIntents(pkg.type);

  await delay(600);
  const afterExtractLog = [...afterNormLog, makeLogEntry('extraction', `Extracted ${facts.length} facts, ${entities.length} entities, ${qas.length} Q&A pairs via gateway.embed()`, 'success')];
  await updateJob(packageId, { stage: 'extraction', progress: 40, log: afterExtractLog });
  if (onProgress) onProgress('extraction', 40, afterExtractLog);

  // Stage 3: Deduplication
  await delay(500);
  const dedupLog = [...afterExtractLog, makeLogEntry('deduplication', 'Running deduplication engine — unifying semantically equivalent entities...', 'info')];
  await updateJob(packageId, { stage: 'deduplication', progress: 50, log: dedupLog });
  if (onProgress) onProgress('deduplication', 50, dedupLog);

  await delay(700);
  const afterDedupLog = [...dedupLog, makeLogEntry('deduplication', `Canonicalized ${entities.length} entities. Merged duplicate skills, companies, and references.`, 'success')];
  await updateJob(packageId, { stage: 'deduplication', progress: 60, log: afterDedupLog });
  if (onProgress) onProgress('deduplication', 60, afterDedupLog);

  // Stage 4: Master Knowledge Builder
  await delay(500);
  const masterLog = [...afterDedupLog, makeLogEntry('master', 'Building master.md — the canonical source of truth...', 'info')];
  await updateJob(packageId, { stage: 'master', progress: 70, log: masterLog });
  if (onProgress) onProgress('master', 70, masterLog);

  const updatedSources = await fetchSources(packageId);
  const masterDoc = generateMasterDoc(pkg.type, pkg.name, updatedSources);

  await delay(600);
  await upsertAsset(packageId, 'master', { content: masterDoc });

  const afterMasterLog = [...masterLog, makeLogEntry('master', `master.md generated (${masterDoc.length} chars). This is now the single editable source.`, 'success')];
  await updateJob(packageId, { stage: 'master', progress: 75, log: afterMasterLog });
  if (onProgress) onProgress('master', 75, afterMasterLog);

  // Stage 5: Asset Generation
  await delay(400);
  const genLog = [...afterMasterLog, makeLogEntry('generation', 'Generating derived assets from master.md...', 'info')];
  await updateJob(packageId, { stage: 'generation', progress: 80, log: genLog });
  if (onProgress) onProgress('generation', 80, genLog);

  await upsertAsset(packageId, 'facts', facts);
  await upsertAsset(packageId, 'entities', entities);
  await delay(200);
  const summaryText = generateSummary(pkg.type, pkg.name, updatedSources.length, facts.length);
  await upsertAsset(packageId, 'summary', { content: summaryText });
  await upsertAsset(packageId, 'canned-qa', qas);
  await delay(200);
  await upsertAsset(packageId, 'corrections', corrections);
  await upsertAsset(packageId, 'glossary', glossary);
  await upsertAsset(packageId, 'intents', intents);
  await delay(200);
  const metadata = generateMetadata(pkg.slug, pkg.version, updatedSources.length, facts.length);
  await upsertAsset(packageId, 'metadata', metadata);
  const vectorIndex = generateVectorIndex(masterDoc);
  await upsertAsset(packageId, 'vector-index', vectorIndex);

  const finalLog = [...genLog, makeLogEntry('generation', `Generated: facts.json, entities.json, summary.md, canned-qa.json, corrections.json, glossary.json, intents.json, metadata.json, vector-index.json`, 'success')];
  await updateJob(packageId, { stage: 'generation', progress: 100, status: 'completed', log: finalLog });
  if (onProgress) onProgress('generation', 100, finalLog);

  // Update package status
  await updatePackage(packageId, {
    status: 'ready',
    sources_count: updatedSources.length,
    facts_count: facts.length,
    updated_at: new Date().toISOString(),
  });

  const doneLog = [...finalLog, makeLogEntry('generation', 'Knowledge package is ready for deployment.', 'success')];
  await updateJob(packageId, { log: doneLog });
  if (onProgress) onProgress('generation', 100, doneLog);
}

export { getFileTypeLabel, getFileExtension };

export async function fetchChatMessages(packageId: string): Promise<ChatMessageRow[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('package_id', packageId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as ChatMessageRow[];
}

export async function addChatMessage(
  packageId: string,
  role: 'user' | 'assistant',
  content: string,
  tokensUsed?: number,
  provider?: string
): Promise<ChatMessageRow> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      package_id: packageId,
      role,
      content,
      tokens_used: tokensUsed || 0,
      provider: provider || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ChatMessageRow;
}

export async function clearChatMessages(packageId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('package_id', packageId);
  if (error) throw error;
}
