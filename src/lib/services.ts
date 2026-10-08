// Zero-database, pure local file/storage engine for knowledge-response-ai
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

const STORAGE_KEYS = {
  PACKAGES: 'omni_knowledge_packages',
  SOURCES: 'omni_knowledge_sources',
  ASSETS: 'omni_knowledge_assets',
  JOBS: 'omni_knowledge_jobs',
  MESSAGES: 'omni_knowledge_messages',
};

// Seed default initial packages if storage is empty
const INITIAL_PACKAGES: KnowledgePackage[] = [
  {
    id: 'apzurquelle',
    name: 'Apartments zur Quelle',
    slug: 'apzurquelle',
    description: 'AI Knowledge Package for Apartments zur Quelle in Vienna',
    type: 'apartments',
    status: 'ready',
    color: '#06b6d4',
    icon: 'Building',
    sources_count: 1,
    facts_count: 8,
    version: '1.1.0',
    config: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'bergservice',
    name: 'BergService GmbH',
    slug: 'bergservice',
    description: 'Service & Facility Management Knowledge Package',
    type: 'company',
    status: 'draft',
    color: '#3b82f6',
    icon: 'Briefcase',
    sources_count: 0,
    facts_count: 0,
    version: '1.0.0',
    config: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_SOURCES: KnowledgeSource[] = [
  {
    id: 'src-apz-1',
    package_id: 'apzurquelle',
    filename: 'Apartments_Information_Guide.md',
    file_type: 'md',
    file_size: 14200,
    normalized_name: 'apartments-information-guide.md',
    normalized_content: 'Apartments zur Quelle in Vienna. Pet-friendly accommodation, high-speed WiFi, smart digital key access, self check-in from 15:00.',
    status: 'normalized',
    created_at: new Date().toISOString(),
  },
];

function getFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (err) {
    console.warn(`[omni-storage] Failed to save key "${key}":`, err);
  }
}

// -------------------------------------------------------------
// Packages
// -------------------------------------------------------------
export async function fetchPackages(): Promise<KnowledgePackage[]> {
  const pkgs = getFromStorage<KnowledgePackage[]>(STORAGE_KEYS.PACKAGES, INITIAL_PACKAGES);
  if (!localStorage.getItem(STORAGE_KEYS.PACKAGES)) {
    saveToStorage(STORAGE_KEYS.PACKAGES, pkgs);
  }
  return pkgs;
}

export async function fetchPackage(id: string): Promise<KnowledgePackage | null> {
  const pkgs = await fetchPackages();
  return pkgs.find((p) => p.id === id || p.slug === id) || null;
}

export async function createPackage(input: {
  name: string;
  slug: string;
  description: string;
  type: PackageType;
  color: string;
  icon: string;
}): Promise<KnowledgePackage> {
  const pkgs = await fetchPackages();
  const id = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const now = new Date().toISOString();

  const newPkg: KnowledgePackage = {
    id,
    name: input.name,
    slug: id,
    description: input.description,
    type: input.type,
    color: input.color || '#06b6d4',
    icon: input.icon || 'Brain',
    status: 'draft',
    sources_count: 0,
    facts_count: 0,
    version: '1.0.0',
    config: {},
    created_at: now,
    updated_at: now,
  };

  pkgs.unshift(newPkg);
  saveToStorage(STORAGE_KEYS.PACKAGES, pkgs);
  return newPkg;
}

export async function deletePackage(id: string): Promise<void> {
  const pkgs = (await fetchPackages()).filter((p) => p.id !== id);
  saveToStorage(STORAGE_KEYS.PACKAGES, pkgs);

  const sources = (await fetchSources(id)).filter((s) => s.package_id !== id);
  saveToStorage(STORAGE_KEYS.SOURCES, sources);
}

export async function updatePackage(id: string, updates: Partial<KnowledgePackage>): Promise<void> {
  const pkgs = await fetchPackages();
  const idx = pkgs.findIndex((p) => p.id === id);
  if (idx !== -1) {
    pkgs[idx] = { ...pkgs[idx], ...updates, updated_at: new Date().toISOString() };
    saveToStorage(STORAGE_KEYS.PACKAGES, pkgs);
  }
}

// -------------------------------------------------------------
// Sources
// -------------------------------------------------------------
export async function fetchSources(packageId: string): Promise<KnowledgeSource[]> {
  const allSources = getFromStorage<KnowledgeSource[]>(STORAGE_KEYS.SOURCES, INITIAL_SOURCES);
  return allSources.filter((s) => s.package_id === packageId);
}

export async function addSourceByName(packageId: string, filename: string, fileSize: number): Promise<KnowledgeSource> {
  const allSources = getFromStorage<KnowledgeSource[]>(STORAGE_KEYS.SOURCES, INITIAL_SOURCES);
  const now = new Date().toISOString();
  const ext = getFileExtension(filename);

  const newSource: KnowledgeSource = {
    id: `src-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    package_id: packageId,
    filename,
    file_type: ext,
    file_size: fileSize,
    normalized_name: normalizeFilename(filename),
    normalized_content: generateNormalizedContent(filename),
    status: 'normalized',
    created_at: now,
  };

  allSources.unshift(newSource);
  saveToStorage(STORAGE_KEYS.SOURCES, allSources);

  // Update package counts
  const pkgSources = allSources.filter((s) => s.package_id === packageId);
  await updatePackage(packageId, { sources_count: pkgSources.length });

  return newSource;
}

export async function deleteSource(id: string, packageId: string): Promise<void> {
  const allSources = (getFromStorage<KnowledgeSource[]>(STORAGE_KEYS.SOURCES, INITIAL_SOURCES)).filter((s) => s.id !== id);
  saveToStorage(STORAGE_KEYS.SOURCES, allSources);

  const pkgSources = allSources.filter((s) => s.package_id === packageId);
  await updatePackage(packageId, { sources_count: pkgSources.length });
}

// -------------------------------------------------------------
// Assets
// -------------------------------------------------------------
export async function fetchAssets(packageId: string): Promise<KnowledgeAsset[]> {
  const assets = getFromStorage<KnowledgeAsset[]>(`${STORAGE_KEYS.ASSETS}_${packageId}`, []);
  if (assets.length === 0 && packageId === 'apzurquelle') {
    // Generate initial assets for apzurquelle
    const now = new Date().toISOString();
    const seededAssets: KnowledgeAsset[] = [
      {
        id: 'asset-master',
        package_id: 'apzurquelle',
        asset_type: 'master',
        asset_data: generateMasterDoc('apartments', 'Apartments zur Quelle', INITIAL_SOURCES),
        created_at: now,
        updated_at: now,
      },
      {
        id: 'asset-facts',
        package_id: 'apzurquelle',
        asset_type: 'facts',
        asset_data: generateFacts('apartments'),
        created_at: now,
        updated_at: now,
      },
      {
        id: 'asset-canned',
        package_id: 'apzurquelle',
        asset_type: 'canned-qa',
        asset_data: generateCannedQA('apartments'),
        created_at: now,
        updated_at: now,
      },
    ];
    saveToStorage(`${STORAGE_KEYS.ASSETS}_${packageId}`, seededAssets);
    return seededAssets;
  }
  return assets;
}

// -------------------------------------------------------------
// Jobs & Processing Engine
// -------------------------------------------------------------
export async function fetchJobs(packageId: string): Promise<ProcessingJob[]> {
  const jobs = getFromStorage<any[]>(`${STORAGE_KEYS.JOBS}_${packageId}`, []);
  return jobs.map((j) => {
    let log = j.log;
    if (!Array.isArray(log)) {
      if (typeof log === 'string' && (log as string).trim()) {
        log = [{ time: j.updated_at || new Date().toISOString(), stage: j.stage || 'Log', message: log, type: 'info' }];
      } else {
        log = [];
      }
    }
    return {
      ...j,
      log,
    };
  });
}

export async function runProcessingJob(
  packageId: string,
  onProgress?: (job: ProcessingJob) => void
): Promise<ProcessingJob> {
  const pkg = await fetchPackage(packageId);
  if (!pkg) throw new Error(`Package "${packageId}" not found`);

  const sources = await fetchSources(packageId);
  const now = new Date().toISOString();

  const job: ProcessingJob = {
    id: `job-${Date.now()}`,
    package_id: packageId,
    stage: 'Initializing',
    progress: 5,
    status: 'running',
    log: [{ time: now, stage: 'Init', message: `Started pipeline for ${pkg.name}`, type: 'info' }],
    created_at: now,
    updated_at: now,
  };

  const updateJob = (stage: string, progress: number, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    job.stage = stage;
    job.progress = progress;
    job.updated_at = new Date().toISOString();
    job.log.push({ time: new Date().toISOString(), stage, message, type });
    onProgress?.({ ...job, log: [...job.log] });
  };

  updateJob('Normalizing', 25, `Normalizing ${sources.length} sources...`);
  await new Promise((r) => setTimeout(r, 400));

  updateJob('Extracting Facts', 50, 'Extracting canonical facts & entities...');
  const facts = generateFacts(pkg.type);
  const entities = generateEntities(pkg.type);
  await new Promise((r) => setTimeout(r, 400));

  updateJob('Generating Q&A', 75, 'Building zero-token canned answers and master document...');
  const canned = generateCannedQA(pkg.type);
  const masterDoc = generateMasterDoc(pkg.type, pkg.name, sources);
  await new Promise((r) => setTimeout(r, 400));

  // Save generated assets
  const assets: KnowledgeAsset[] = [
    { id: `ast-master-${Date.now()}`, package_id: packageId, asset_type: 'master', asset_data: masterDoc, created_at: now, updated_at: now },
    { id: `ast-facts-${Date.now()}`, package_id: packageId, asset_type: 'facts', asset_data: facts, created_at: now, updated_at: now },
    { id: `ast-canned-${Date.now()}`, package_id: packageId, asset_type: 'canned-qa', asset_data: canned, created_at: now, updated_at: now },
    { id: `ast-entities-${Date.now()}`, package_id: packageId, asset_type: 'entities', asset_data: entities, created_at: now, updated_at: now },
  ];
  saveToStorage(`${STORAGE_KEYS.ASSETS}_${packageId}`, assets);

  updateJob('Finalizing', 100, 'Knowledge Package compiled and ready for deployment!', 'success');
  job.status = 'completed';

  // Update package status and facts count
  await updatePackage(packageId, {
    status: 'ready',
    facts_count: facts.length,
    sources_count: sources.length,
  });

  const jobs = await fetchJobs(packageId);
  jobs.unshift(job);
  saveToStorage(`${STORAGE_KEYS.JOBS}_${packageId}`, jobs);

  return job;
}

export async function runProcessingPipeline(
  packageId: string,
  _pkg: KnowledgePackage,
  _sources: KnowledgeSource[],
  onProgress?: (job: ProcessingJob) => void
): Promise<ProcessingJob> {
  return runProcessingJob(packageId, (job) => {
    onProgress?.({ ...job, log: [...job.log] });
  });
}

export async function fetchJob(packageIdOrJobId: string): Promise<ProcessingJob | null> {
  const jobs = await fetchJobs(packageIdOrJobId);
  return jobs[0] || null;
}

// -------------------------------------------------------------
// Chat Messages
// -------------------------------------------------------------
export async function fetchChatMessages(packageId: string): Promise<ChatMessageRow[]> {
  return getFromStorage<ChatMessageRow[]>(`${STORAGE_KEYS.MESSAGES}_${packageId}`, []);
}

export async function addChatMessage(
  packageId: string,
  role: 'user' | 'assistant',
  content: string,
  tokensUsed: number = 0,
  provider?: string
): Promise<ChatMessageRow> {
  const list = await fetchChatMessages(packageId);
  const newMsg: ChatMessageRow = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    package_id: packageId,
    role,
    content,
    tokens_used: tokensUsed,
    provider: provider || 'local-ai',
    created_at: new Date().toISOString(),
  };
  list.push(newMsg);
  saveToStorage(`${STORAGE_KEYS.MESSAGES}_${packageId}`, list);
  return newMsg;
}

export async function clearChatMessages(packageId: string): Promise<void> {
  saveToStorage(`${STORAGE_KEYS.MESSAGES}_${packageId}`, []);
}

export async function upsertAsset(
  packageId: string,
  assetType: AssetType,
  assetData: any
): Promise<KnowledgeAsset> {
  const assets = await fetchAssets(packageId);
  const now = new Date().toISOString();
  const existingIndex = assets.findIndex((a) => a.asset_type === assetType);

  if (existingIndex >= 0) {
    assets[existingIndex] = {
      ...assets[existingIndex],
      asset_data: assetData,
      updated_at: now,
    };
    saveToStorage(`${STORAGE_KEYS.ASSETS}_${packageId}`, assets);
    return assets[existingIndex];
  } else {
    const newAsset: KnowledgeAsset = {
      id: `ast-${assetType}-${Date.now()}`,
      package_id: packageId,
      asset_type: assetType,
      asset_data: assetData,
      created_at: now,
      updated_at: now,
    };
    assets.push(newAsset);
    saveToStorage(`${STORAGE_KEYS.ASSETS}_${packageId}`, assets);
    return newAsset;
  }
}

export async function sendChatMessage(
  packageId: string,
  userMessage: string
): Promise<{ text: string; canned: boolean }> {
  const assets = await fetchAssets(packageId);
  const cannedAsset = assets.find((a) => a.asset_type === 'canned-qa');
  const cannedItems: { question: string; answer: string }[] = Array.isArray(cannedAsset?.asset_data) ? (cannedAsset.asset_data as any) : [];

  // Match canned Q&A
  const lower = userMessage.toLowerCase().trim();
  const matched = cannedItems.find((c) => lower.includes(c.question.toLowerCase().slice(0, 15)) || c.question.toLowerCase().includes(lower.slice(0, 15)));

  if (matched) {
    return { text: matched.answer, canned: true };
  }

  return {
    text: `Based on the knowledge base for this package: We are ready to answer your questions. For detailed requests, please consult the master guide.`,
    canned: false,
  };
}
