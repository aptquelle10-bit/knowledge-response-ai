import { Cpu, Play, CheckCircle2, Loader2, Circle, AlertCircle } from 'lucide-react';
import type { KnowledgePackage, KnowledgeSource, ProcessingJob } from '@/lib/types';
import { PROCESSING_STAGES } from '@/lib/engine';

interface ProcessingTabProps {
  job: ProcessingJob | null;
  pkg: KnowledgePackage;
  sources: KnowledgeSource[];
  processing: boolean;
  onProcess: () => void;
}

export function ProcessingTab({ job, pkg, sources, processing, onProcess }: ProcessingTabProps) {
  const currentStageIndex = PROCESSING_STAGES.findIndex((s) => s.id === job?.stage);
  const progress = job?.progress || 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Pipeline overview */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-white">Processing Pipeline</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Transforms raw sources into a structured knowledge package
            </p>
          </div>
          {pkg.status === 'ready' && !processing && (
            <span className="badge badge-ready">
              <CheckCircle2 className="w-3 h-3" />
              Completed
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Progress</span>
            <span className="text-sm font-bold text-cyan-400">{progress}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stages */}
        <div className="space-y-3">
          {PROCESSING_STAGES.map((stage, index) => {
            const stageIndex = currentStageIndex;
            const isCompleted = pkg.status === 'ready' || (stageIndex !== -1 && index < stageIndex);
            const isCurrent = processing && stageIndex === index;
            const isPending = !isCompleted && !isCurrent;

            return (
              <div
                key={stage.id}
                className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all ${
                  isCurrent
                    ? 'border-cyan-500/30 bg-cyan-500/5'
                    : isCompleted
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : 'border-[#1e293b]'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-700" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isPending ? 'text-slate-500' : 'text-white'}`}>
                      {stage.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-600 uppercase">Stage {index + 1}</span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isPending ? 'text-slate-600' : 'text-slate-400'}`}>
                    {stage.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action button */}
        {sources.length > 0 && !processing && (
          <button onClick={onProcess} className="btn-primary mt-5 w-full justify-center">
            <Play className="w-4 h-4" />
            {pkg.status === 'ready' ? 'Reprocess Knowledge' : 'Start Processing'}
          </button>
        )}
        {sources.length === 0 && !processing && (
          <div className="mt-5 text-center text-sm text-slate-500 py-3 border border-dashed border-[#1e293b] rounded-xl">
            Upload sources first to start processing
          </div>
        )}
      </div>

      {/* Processing log */}
      {job && job.log && job.log.length > 0 && (
        <div className="card p-5">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Processing Log
          </h4>
          <div className="space-y-1.5 max-h-96 overflow-y-auto font-mono text-xs">
            {job.log.map((entry, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-slate-600 shrink-0">
                  {new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className={`shrink-0 ${
                  entry.type === 'success' ? 'text-emerald-500' :
                  entry.type === 'error' ? 'text-red-500' : 'text-cyan-500'
                }`}>
                  {entry.type === 'success' ? '✓' : entry.type === 'error' ? '✗' : '›'}
                </span>
                <span className="text-slate-600 shrink-0">[{entry.stage}]</span>
                <span className={`${
                  entry.type === 'success' ? 'text-slate-300' :
                  entry.type === 'error' ? 'text-red-400' : 'text-slate-400'
                }`}>
                  {entry.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Architecture info */}
      <div className="card p-5">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Pipeline Architecture
        </h4>
        <div className="space-y-2.5 text-xs text-slate-400">
          <ArchRow label="Normalization" detail="Every source → Markdown (pdfjs-dist, mammoth, turndown, papaparse, tesseract.js)" />
          <ArchRow label="Knowledge Intelligence" detail="AI Gateway Hub: gateway.chat() + gateway.embed() for extraction" />
          <ArchRow label="Deduplication Engine" detail="Canonicalize entities (e.g., Java 8 / JAVA8 / Java SE 8 → Java 8)" />
          <ArchRow label="Master Knowledge Builder" detail="Generate master.md — the single editable source of truth" />
          <ArchRow label="Asset Generation" detail="facts.json, entities.json, canned-qa.json, corrections.json, glossary.json, intents.json, metadata.json, vector-index.json (Orama)" />
        </div>
      </div>
    </div>
  );
}

function ArchRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-start gap-2">
      <Cpu className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" />
      <div>
        <span className="font-semibold text-slate-300">{label}:</span>{' '}
        <span>{detail}</span>
      </div>
    </div>
  );
}
