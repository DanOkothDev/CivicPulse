import React from 'react';
import Modal from './Modal';
import { AlertTriangle, Info } from 'lucide-react';

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  loading = false,
  children = null,
}) {
  const isDanger = type === 'danger';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-start gap-4 mb-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isDanger ? 'bg-rose-100 text-rose-600' : 'bg-[#E6F5F8] text-[#0B5A9C]'
          }`}
        >
          {isDanger ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <h4 className="text-base font-extrabold text-[#4a4a4a]">{title}</h4>
          <p className="text-xs text-[#5F5F5F] mt-1 leading-relaxed">{message}</p>
        </div>
      </div>

      {children && <div className="my-3">{children}</div>}

      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#cfe9f0]">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-xs font-semibold text-[#0B5A9C] bg-white border border-[#cfe9f0] hover:bg-[#E6F5F8] rounded-xl transition-colors disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2 ${
            isDanger
              ? 'bg-rose-600 hover:bg-rose-700'
              : 'bg-gradient-to-br from-[#38C6DC] to-[#0B5A9C] hover:brightness-110'
          }`}
        >
          {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          <span>{confirmText}</span>
        </button>
      </div>
    </Modal>
  );
}
