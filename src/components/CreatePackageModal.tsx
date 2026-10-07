import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { createPackage } from '@/lib/services';
import { PACKAGE_TYPE_OPTIONS } from '@/lib/icons';
import { getPackageIcon } from '@/lib/icons';
import type { KnowledgePackage, PackageType } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';

interface CreatePackageModalProps {
  onClose: () => void;
  onCreated: (pkg: KnowledgePackage) => void;
}

export function CreatePackageModal({ onClose, onCreated }: CreatePackageModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<string>('portfolio');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(value));
    }
  };

  function slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const selected = PACKAGE_TYPE_OPTIONS.find((t) => t.value === selectedType)!;
      const pkg = await createPackage({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        type: selectedType as PackageType,
        color: selected.color,
        icon: selected.icon,
      });
      onCreated(pkg);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create package');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-[#111827] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b]">
          <div>
            <h2 className="text-lg font-bold text-white">Create Knowledge Package</h2>
            <p className="text-xs text-slate-500 mt-0.5">Choose a type and name your knowledge package</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Type selection */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Package Type
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {PACKAGE_TYPE_OPTIONS.map((opt) => {
                const Icon: LucideIcon = getPackageIcon(opt.icon);
                const isSelected = selectedType === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedType(opt.value)}
                    className={`relative flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-cyan-500/40 bg-cyan-500/5'
                        : 'border-[#1e293b] hover:border-slate-700 hover:bg-slate-800/30'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${opt.color}20` }}
                    >
                      <Icon className="w-4.5 h-4.5" style={{ color: opt.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white">{opt.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5 leading-snug">{opt.description}</div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-4 h-4 text-cyan-400" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Package Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., My Professional Portfolio"
              className="input-field"
              autoFocus
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Folder Name
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 font-mono">knowledge/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="my-portfolio"
                className="input-field font-mono text-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Description <span className="text-slate-600 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this knowledge package about?"
              rows={2}
              className="input-field resize-none"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1e293b] bg-[#0d1220]">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !slug.trim() || creating}
            className="btn-primary"
          >
            {creating ? 'Creating...' : 'Create Package'}
          </button>
        </div>
      </div>
    </div>
  );
}
