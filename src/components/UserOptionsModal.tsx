import React from 'react';
import { X } from 'lucide-react';

interface UserOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserOptionsModal: React.FC<UserOptionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/25"
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white rounded-lg border border-zinc-200 shadow-lg p-5 z-10">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-900">Opcje użytkownika</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 p-1 rounded"
            aria-label="Zamknij"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-8 text-center text-xs text-zinc-400">
          Brak dostępnych opcji.
        </div>

        <div className="flex justify-end pt-2 border-t border-zinc-100">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 rounded border border-zinc-200"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
