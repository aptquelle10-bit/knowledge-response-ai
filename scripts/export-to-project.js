#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    target: '',
    type: 'apartments',
    name: 'Apzurquelle',
    sourcesDir: '',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target' || args[i] === '-t') {
      options.target = args[++i];
    } else if (args[i] === '--type') {
      options.type = args[++i];
    } else if (args[i] === '--name' || args[i] === '-n') {
      options.name = args[++i];
    } else if (args[i] === '--sources' || args[i] === '-s') {
      options.sourcesDir = args[++i];
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  if (!options.target) {
    console.error('Error: --target directory is required');
    console.log('Usage: node scripts/export-to-project.js --target <dir> [--type apartments] [--name "Project Name"] [--sources <sourcesDir>]');
    process.exit(1);
  }

  const targetDir = path.resolve(process.cwd(), options.target);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log(`[knowledge-response-ai] Exporting knowledge for "${options.name}" (${options.type}) to:`);
  console.log(`  Target: ${targetDir}`);

  // Dynamically import engine
  const engine = await import('../src/lib/engine.ts');

  // Discover sources from sourcesDir or targetDir/sources
  const sourcesDir = options.sourcesDir || path.join(targetDir, 'sources');
  const sourceFiles = [];

  if (fs.existsSync(sourcesDir)) {
    const files = fs.readdirSync(sourcesDir);
    for (const f of files) {
      const fullPath = path.join(sourcesDir, f);
      const stat = fs.statSync(fullPath);
      if (stat.isFile()) {
        sourceFiles.push({
          id: `src-${f}`,
          package_id: 'pkg-local',
          filename: f,
          file_type: engine.getFileExtension(f),
          file_size: stat.size,
          normalized_name: engine.normalizeFilename(f),
          normalized_content: null,
          status: 'normalized',
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  console.log(`[knowledge-response-ai] Found ${sourceFiles.length} source file(s) in ${sourcesDir}`);

  // Generate knowledge assets
  const masterDoc = engine.generateMasterDoc(options.type, options.name, sourceFiles);
  const facts = engine.generateFacts(options.type);
  const entities = engine.generateEntities(options.type);
  const qas = engine.generateCannedQA(options.type);
  const corrections = engine.generateCorrections(options.type);
  const glossary = engine.generateGlossary(options.type);
  const intents = engine.generateIntents(options.type);
  const summary = engine.generateSummary(options.type, options.name, sourceFiles.length, facts.length);
  const metadata = engine.generateMetadata(options.name.toLowerCase().replace(/\s+/g, '-'), '1.1.0', sourceFiles.length, facts.length);
  const vectorIndex = engine.generateVectorIndex(masterDoc);

  const filesToWrite = {
    'master.md': masterDoc,
    'facts.json': JSON.stringify(facts, null, 2),
    'entities.json': JSON.stringify(entities, null, 2),
    'canned-qa.json': JSON.stringify(qas, null, 2),
    'corrections.json': JSON.stringify(corrections, null, 2),
    'glossary.json': JSON.stringify(glossary, null, 2),
    'intents.json': JSON.stringify(intents, null, 2),
    'summary.md': summary,
    'metadata.json': JSON.stringify(metadata, null, 2),
    'vector-index.json': JSON.stringify(vectorIndex, null, 2),
  };

  for (const [filename, content] of Object.entries(filesToWrite)) {
    const dest = path.join(targetDir, filename);
    fs.writeFileSync(dest, content, 'utf8');
    console.log(`  ✓ Written: ${filename}`);
  }

  console.log(`[knowledge-response-ai] Successfully exported ${Object.keys(filesToWrite).length} assets to ${targetDir}`);
}

main().catch((err) => {
  console.error('[knowledge-response-ai] Export failed:', err);
  process.exit(1);
});
