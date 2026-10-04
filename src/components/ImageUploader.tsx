'use client';

import React, { useRef, useState } from 'react';
import { Camera, Upload, Trash2, CheckCircle2, AlertCircle, RefreshCw, Eye } from 'lucide-react';
import { compressImageTo40KB, CompressedImageResult, formatBytes } from '@/lib/image-compressor';

interface ImageUploaderProps {
  label: string;
  kind: 'aadhaar_front' | 'aadhaar_back' | 'guest_photo';
  value: CompressedImageResult | null;
  onChange: (result: CompressedImageResult | null) => void;
  required?: boolean;
  existingImageUrl?: string;
  onDeleteExisting?: () => void;
  helpText?: string;
}

export function ImageUploader({
  label,
  kind,
  value,
  onChange,
  required = false,
  existingImageUrl,
  onDeleteExisting,
  helpText,
}: ImageUploaderProps) {
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    setError(null);
    setCompressing(true);

    try {
      const result = await compressImageTo40KB(file);
      onChange(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to compress image';
      setError(msg);
      onChange(null);
    } finally {
      setCompressing(false);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
    // Reset input so same file can be re-selected if desired
    e.target.value = '';
  };

  const clearImage = () => {
    onChange(null);
    setError(null);
    if (onDeleteExisting && existingImageUrl) {
      onDeleteExisting();
    }
  };

  const previewSource = value?.dataUrl || existingImageUrl;

  return (
    <div className="flex flex-col gap-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          {label}
          {required && <span className="text-red-500 font-bold">*</span>}
        </label>
        {value && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {value.sizeFormatted} (≤ 40KB)
          </span>
        )}
      </div>

      {helpText && <p className="text-xs text-slate-500">{helpText}</p>}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onFileInputChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileInputChange}
      />

      {/* Preview Area or Upload Dropzone */}
      {previewSource ? (
        <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-black/5 aspect-[4/3] flex items-center justify-center">
          <img
            src={previewSource}
            alt={label}
            className="w-full h-full object-contain cursor-pointer transition-transform group-hover:scale-[1.02]"
            onClick={() => setShowPreviewModal(true)}
          />

          {/* Overlay controls */}
          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="p-2 bg-white/90 text-slate-800 hover:bg-white rounded-lg shadow text-xs font-medium flex items-center gap-1 transition"
              title="Preview Image"
            >
              <Eye className="w-4 h-4 text-blue-600" />
              Zoom
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-white/90 text-slate-800 hover:bg-white rounded-lg shadow text-xs font-medium flex items-center gap-1 transition"
              title="Replace Image"
            >
              <RefreshCw className="w-4 h-4 text-slate-700" />
              Replace
            </button>
            <button
              type="button"
              onClick={clearImage}
              className="p-2 bg-red-600/90 text-white hover:bg-red-700 rounded-lg shadow text-xs font-medium flex items-center gap-1 transition"
              title="Remove Image"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          </div>

          {/* Mobile visible action strip below or badges */}
          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center sm:hidden">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="bg-black/70 text-white text-xs px-2.5 py-1 rounded backdrop-blur"
            >
              Tap to view
            </button>
            <button
              type="button"
              onClick={clearImage}
              className="bg-red-600 text-white text-xs px-2.5 py-1 rounded shadow"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-lg bg-white hover:bg-blue-50/40 transition">
          {compressing ? (
            <div className="flex flex-col items-center py-4 text-blue-600 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <p className="text-xs font-medium text-slate-700">Compressing to &le; 40KB...</p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center text-center gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium rounded-lg shadow-sm active:scale-95 transition"
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 shadow-sm active:scale-95 transition"
                >
                  <Upload className="w-4 h-4 text-slate-600" />
                  Gallery Upload
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Camera or file upload &bull; Auto-compressed to &le; 40 KB for fast storage
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Zoom / Lightbox Modal */}
      {showPreviewModal && previewSource && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 text-sm">{label}</span>
                {value && (
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                    {value.sizeFormatted} ({value.width}&times;{value.height})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-500 hover:text-slate-800 text-sm font-bold px-2 py-1 rounded-md"
              >
                &times; Close
              </button>
            </div>

            <div className="max-h-[70vh] flex items-center justify-center overflow-auto rounded-lg bg-slate-900">
              <img
                src={previewSource}
                alt={label}
                className="max-h-[68vh] object-contain rounded"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageUploader;
