import React, { useState } from 'react';
import { X, LogOut } from 'lucide-react';
import { auth, googleProvider, signInWithPopup, signOut } from '../../firebase';
import { User } from 'firebase/auth';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  isAdmin: boolean;
  onToggleDemoAdmin: (enabled: boolean) => void;
  isDemoAdmin: boolean;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isAdmin,
  onToggleDemoAdmin,
  isDemoAdmin,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('Logowanie nie powiodło się. Możesz użyć szybkiego dostępu poniżej.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      onToggleDemoAdmin(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/25" />

      <div className="relative w-full max-w-sm bg-white rounded-lg border border-zinc-200 shadow-lg p-5 z-10 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-900">Panel administratora</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded bg-red-50 text-red-800 text-xs border border-red-100">
            {errorMsg}
          </div>
        )}

        {isAdmin ? (
          <div className="space-y-3 text-xs">
            <p className="text-zinc-600">
              Zalogowano jako administrator {currentUser?.email ? `(${currentUser.email})` : ''}.
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={onClose}
                className="w-full py-1.5 bg-zinc-900 text-white rounded font-medium hover:bg-zinc-800"
              >
                Przejdź do panelu
              </button>
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="w-full py-1.5 border border-zinc-200 text-zinc-600 rounded hover:bg-zinc-50 flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Wyloguj się
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2 px-3 border border-zinc-200 rounded text-zinc-700 font-medium hover:bg-zinc-50 text-center"
            >
              {loading ? 'Logowanie...' : 'Zaloguj przez Google'}
            </button>

            <div className="text-center text-zinc-400 text-[11px]">lub</div>

            <button
              onClick={() => {
                onToggleDemoAdmin(true);
                onClose();
              }}
              className="w-full py-2 px-3 bg-zinc-900 text-white rounded font-medium hover:bg-zinc-800 text-center"
            >
              Tryb administratora (bez logowania)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
