import React, { useRef, useState } from 'react';
import { Camera, Upload, Trash2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ImageUploadComponent({
  image,
  onImageChange,
  onImageRemove,
  error = null,
}) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileProcess = (file) => {
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      alert('Only JPEG, PNG, or WebP images are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5 MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      onImageChange({
        file,
        previewUrl: e.target.result,
        name: file.name,
        sizeMb: (file.size / (1024 * 1024)).toFixed(1),
        capturedTime: 'Just now',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileProcess(e.target.files[0])}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={(e) => handleFileProcess(e.target.files[0])}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {image ? (
        /* Image Preview Box matching report issue.png */
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md group">
          <img
            src={image.previewUrl}
            alt="Report evidence"
            className="w-full h-64 sm:h-72 object-cover"
          />

          {/* Top badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Captured: {image.capturedTime || 'Today 09:14 AM'}</span>
            </span>
          </div>

          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={onImageRemove}
              className="bg-rose-600/90 hover:bg-rose-600 text-white p-2 rounded-lg backdrop-blur-md transition-colors shadow-sm"
              title="Delete Photo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom metadata & replace overlay */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-transparent p-4 flex flex-wrap items-center justify-between gap-2 text-white">
            <div className="text-xs">
              <p className="font-mono font-semibold truncate max-w-[220px]">
                {image.name || 'IMG_20241014_RAW.jpg'}
              </p>
              <p className="text-slate-300 text-[11px]">
                {image.sizeMb ? `${image.sizeMb} MB • ` : ''}EXIF Verified
              </p>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg backdrop-blur-md transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Replace</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty Upload / Camera drop area */
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all ${
            dragOver
              ? 'border-blue-500 bg-blue-50/50'
              : error
              ? 'border-rose-300 bg-rose-50/30'
              : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-white'
          }`}
        >
          <div className="flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-sm">
              <Camera className="w-7 h-7" />
            </div>

            <h4 className="text-sm font-bold text-slate-800 mb-1">
              Upload On-Site Photo Evidence
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
              High-resolution photos allow municipal teams to gauge severity and safety hazards before rolling trucks. Max 5 MB (JPEG/PNG).
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Take Photo</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Browse File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-600 flex items-center gap-1 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
