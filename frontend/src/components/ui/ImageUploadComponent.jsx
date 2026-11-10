import React, { useEffect, useRef, useState } from 'react';
import { Camera, Upload, Trash2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ImageUploadComponent({
  image,
  onImageChange,
  onImageRemove,
  error = null,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
}) {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }

    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  const handleFileProcess = (file) => {
    if (!file) return;

    if (!allowedTypes.includes(file.type)) {
      alert(`Allowed image formats: ${allowedTypes.map((type) => type.replace('image/', '').toUpperCase()).join(', ')}.`);
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

  const handleCameraOpen = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported by this browser. Use Browse File to attach a photo.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      setCameraStream(stream);
    } catch (error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Allow camera access in your browser settings, or use Browse File.');
      } else {
        setCameraError(`Could not open the camera: ${error.message || 'Please check that a camera is connected.'}`);
      }
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setCameraError('The camera is not ready yet. Please wait a moment and try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2560 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('Could not prepare the photo for capture. Please try again.');
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError('Could not capture the photo. Please try again.');
        return;
      }
      if (blob.size > 5 * 1024 * 1024) {
        setCameraError('The captured photo exceeds the 5 MB limit. Please try again.');
        return;
      }

      const file = new File([blob], `civic-report-${Date.now()}.jpg`, { type: 'image/jpeg' });
      handleFileProcess(file);
      setCameraStream(null);
    }, 'image/jpeg', 0.82);
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileProcess(e.target.files[0])}
        accept={allowedTypes.join(',')}
        className="hidden"
      />

      {image ? (
        /* Image Preview Box matching report issue.png */
        <div className="relative rounded-3xl overflow-hidden border border-[#cfe9f0] bg-[#0B5A9C] shadow-[0_10px_30px_-14px_rgba(11,90,156,0.35)] group">
          <img
            src={image.previewUrl}
            alt="Report evidence"
            className="w-full h-64 sm:h-72 object-cover"
          />

          {/* Top badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="bg-[#0B5A9C]/85 backdrop-blur-md text-emerald-300 text-xs font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1.5 border border-emerald-300/30">
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
              <p className="text-white/75 text-[11px]">
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
      ) : cameraStream ? (
        <div className="space-y-3">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full max-h-[28rem] rounded-3xl bg-[#0B5A9C] object-contain"
          />
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={handleCapture}
              className="bg-gradient-to-br from-[#38C6DC] to-[#0B5A9C] hover:brightness-110 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Photo</span>
            </button>
            <button
              type="button"
              onClick={() => setCameraStream(null)}
              className="bg-white hover:bg-[#E6F5F8] text-[#0B5A9C] border border-[#cfe9f0] text-xs font-bold px-4 py-2 rounded-xl transition-colors"
            >
              Cancel
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
              ? 'border-[#1B8FC0] bg-[#E6F5F8]'
              : error
              ? 'border-rose-300 bg-rose-50/30'
              : 'border-[#cfe9f0] hover:border-[#1B8FC0] bg-white/70 hover:bg-white'
          }`}
        >
          <div className="flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-[#E6F5F8] border border-[#cfe9f0] text-[#1B8FC0] flex items-center justify-center mb-4">
              <Camera className="w-7 h-7" />
            </div>

            <h4 className="text-sm font-extrabold text-[#4a4a4a] mb-1">
              Upload On-Site Photo Evidence
            </h4>
            <p className="text-xs text-[#5F5F5F] max-w-sm mb-5 leading-relaxed">
              High-resolution photos allow municipal teams to gauge severity and safety hazards before rolling trucks. Max 5 MB (JPEG/PNG).
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCameraOpen}
                className="bg-gradient-to-br from-[#38C6DC] to-[#0B5A9C] hover:brightness-110 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Take Photo</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                data-tour="report-photo"
                className="bg-white hover:bg-[#E6F5F8] text-[#0B5A9C] border border-[#cfe9f0] text-xs font-bold px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4 text-[#1B8FC0]" />
                <span>Browse File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {cameraError && (
        <p role="alert" className="text-xs text-rose-600 font-medium">
          {cameraError}
        </p>
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
