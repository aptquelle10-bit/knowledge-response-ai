import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Trash2, Check, Loader2, FileCheck, Image, FileCode, Mail, Archive, RefreshCw } from 'lucide-react';
import type { KnowledgeSource } from '@/lib/types';
import { addSourceByName, deleteSource } from '@/lib/services';
import { generateNormalizedContent, normalizeFilename, getFileExtension } from '@/lib/engine';

interface SourcesTabProps {
  packageId: string;
  sources: KnowledgeSource[];
  onSourcesChanged: () => void;
  pkgStatus: string;
  onReprocess: () => void;
}

const ACCEPTED_EXTENSIONS = [
  'pdf', 'docx', 'doc', 'txt', 'md', 'rtf', 'html', 'htm', 'xml', 'json', 'csv', 'pptx',
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'eml', 'email', 'zip',
];

function getFileIcon(ext: string) {
  const e = ext.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(e)) return Image;
  if (['html', 'htm', 'xml', 'json', 'csv'].includes(e)) return FileCode;
  if (['eml', 'email'].includes(e)) return Mail;
  if (e === 'zip') return Archive;
  return FileText;
}

const DEMO_FILES: { name: string; type: string }[] = [
  { name: 'resume.pdf', type: 'pdf' },
  { name: 'cover-letter.docx', type: 'docx' },
  { name: 'linkedin-profile.html', type: 'html' },
  { name: 'certificates.pdf', type: 'pdf' },
  { name: 'github-projects.json', type: 'json' },
  { name: 'skills-export.csv', type: 'csv' },
];

export function SourcesTab({ packageId, sources, onSourcesChanged, pkgStatus, onReprocess }: SourcesTabProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = getFileExtension(file.name);
        if (!ACCEPTED_EXTENSIONS.includes(ext)) continue;
        await addSourceByName(packageId, file.name, file.size);
      }
      onSourcesChanged();
    } finally {
      setUploading(false);
    }
  }, [packageId, onSourcesChanged]);

  const handleDemoAdd = async () => {
    setUploading(true);
    try {
      for (const name of selectedDemo) {
        await addSourceByName(packageId, name, Math.floor(Math.random() * 500000) + 50000);
      }
      setSelectedDemo([]);
      onSourcesChanged();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteSource(id, packageId);
    onSourcesChanged();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Upload zone */}
      <div
        className={`card border-2 border-dashed transition-all p-8 text-center ${
          dragging ? 'border-cyan-500 bg-cyan-500/5' : 'border-[#1e293b] hover:border-slate-700'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-3">
          {uploading ? (
            <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
          ) : (
            <Upload className="w-7 h-7 text-cyan-400" />
          )}
        </div>
        <h3 className="text-base font-semibold text-white">
          {uploading ? 'Uploading sources...' : 'Upload Source Files'}
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Drag and drop files here, or click to browse
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-ghost mt-4 mx-auto"
          disabled={uploading}
        >
          <Upload className="w-4 h-4" />
          Choose Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(',')}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
        <div className="flex flex-wrap justify-center gap-1.5 mt-4">
          {ACCEPTED_EXTENSIONS.map((ext) => (
            <span key={ext} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-500 uppercase">
              {ext}
            </span>
          ))}
        </div>
      </div>

      {/* Demo files */}
      {sources.length === 0 && (
        <div className="card p-5">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Quick Start — Add Demo Sources
          </h4>
          <div className="space-y-2">
            {DEMO_FILES.map((demo) => {
              const isSelected = selectedDemo.includes(demo.name);
              const Icon = getFileIcon(demo.type);
              return (
                <button
                  key={demo.name}
                  onClick={() => {
                    setSelectedDemo((prev) =>
                      isSelected ? prev.filter((n) => n !== demo.name) : [...prev, demo.name]
                    );
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-cyan-500/40 bg-cyan-500/5'
                      : 'border-[#1e293b] hover:border-slate-700 hover:bg-slate-800/30'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-cyan-500/20' : 'bg-slate-800/60'}`}>
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                  </div>
                  <span className="text-sm text-slate-300 font-medium flex-1 text-left">{demo.name}</span>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    isSelected ? 'border-cyan-500 bg-cyan-500' : 'border-slate-600'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
          {selectedDemo.length > 0 && (
            <button onClick={handleDemoAdd} className="btn-primary mt-3 w-full justify-center" disabled={uploading}>
              {uploading ? 'Adding...' : `Add ${selectedDemo.length} Demo Source${selectedDemo.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}

      {/* Add more knowledge banner */}
      {sources.length > 0 && pkgStatus === 'ready' && (
        <div className="card p-4 border-cyan-500/20 bg-cyan-500/5 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">This package is live</div>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload more files above to add knowledge, then click <span className="text-cyan-400 font-medium">Update Knowledge</span> below to regenerate master.md and all assets.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Source list */}
      {sources.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Uploaded Sources ({sources.length})
            </h4>
            {pkgStatus === 'ready' && (
              <button onClick={onReprocess} className="btn-primary text-xs">
                <RefreshCw className="w-3.5 h-3.5" />
                Update Knowledge
              </button>
            )}
          </div>
          <div className="space-y-2">
            {sources.map((source) => {
              const Icon = getFileIcon(source.file_type);
              return (
                <div key={source.id} className="card p-3.5 flex items-center gap-3 group animate-slide-in">
                  <div className="w-9 h-9 rounded-lg bg-slate-800/60 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{source.filename}</span>
                      <span className="text-[10px] font-mono uppercase text-slate-600 shrink-0">
                        {source.file_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">
                        {formatFileSize(source.file_size)}
                      </span>
                      {source.normalized_name && (
                        <>
                          <span className="text-slate-700">→</span>
                          <span className="text-xs text-slate-400 font-mono truncate">
                            {source.normalized_name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <SourceStatusBadge status={source.status} />
                    <button
                      onClick={() => handleDelete(source.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SourceStatusBadge({ status }: { status: string }) {
  if (status === 'normalized') {
    return (
      <span className="badge badge-ready">
        <FileCheck className="w-3 h-3" />
        Normalized
      </span>
    );
  }
  if (status === 'normalizing') {
    return (
      <span className="badge badge-processing">
        <Loader2 className="w-3 h-3 animate-spin" />
        Normalizing
      </span>
    );
  }
  return <span className="badge badge-draft">Uploaded</span>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
