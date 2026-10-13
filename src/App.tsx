/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, testConnection } from './firebase';
import { Category, Dictation, DictationResult } from './types/dictation';
import {
  fetchCategories,
  fetchDictations,
  getSavedResults,
} from './services/dictationService';
import { Navbar } from './components/Navbar';
import { DictationList } from './components/DictationList';
import { DictationPlayer } from './components/DictationPlayer';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { UserOptionsModal } from './components/UserOptionsModal';
import { Loader2, Lock } from 'lucide-react';

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dictations, setDictations] = useState<Dictation[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeView, setActiveView] = useState<'learn' | 'admin'>('learn');
  const [selectedDictation, setSelectedDictation] = useState<Dictation | null>(null);
  const [savedResults, setSavedResults] = useState<Record<string, DictationResult>>({});

  const [userOptionsOpen, setUserOptionsOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDemoAdmin, setIsDemoAdmin] = useState(false);

  const isAdmin = Boolean(
    isDemoAdmin ||
    (currentUser && (currentUser.email === 'sparklyfrog2060@gmail.com' || currentUser.emailVerified))
  );

  const loadData = useCallback(async () => {
    try {
      const [cats, dicts] = await Promise.all([
        fetchCategories(),
        fetchDictations(),
      ]);
      setCategories(cats);
      setDictations(dicts);
      setSavedResults(getSavedResults());
    } catch (err) {
      console.error('Błąd ładowania danych:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    testConnection().catch(() => {});

    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    loadData();

    // Subtle keyboard shortcut to open admin panel: Ctrl+Alt+A or Cmd+Alt+A
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setAdminModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsub();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loadData]);

  const handleNextDictation = () => {
    if (!selectedDictation) return;
    const currentIndex = dictations.findIndex((d) => d.id === selectedDictation.id);
    if (currentIndex >= 0 && currentIndex < dictations.length - 1) {
      setSelectedDictation(dictations[currentIndex + 1]);
    } else if (dictations.length > 0) {
      setSelectedDictation(dictations[0]);
    }
  };

  const solvedCount = Object.keys(savedResults).length;

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans antialiased flex flex-col selection:bg-zinc-200">
      <Navbar
        onOpenUserOptions={() => setUserOptionsOpen(true)}
        isAdmin={isAdmin}
        activeView={activeView}
        onChangeView={(view) => {
          setActiveView(view);
          setSelectedDictation(null);
        }}
        solvedCount={solvedCount}
        totalDictations={dictations.length}
      />

      <main className="flex-1 pb-16">
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          </div>
        ) : activeView === 'admin' && isAdmin ? (
          <AdminDashboard
            categories={categories}
            dictations={dictations}
            onRefreshData={loadData}
            onExitAdmin={() => setActiveView('learn')}
            isOnlineAdmin={Boolean(currentUser && currentUser.email === 'sparklyfrog2060@gmail.com')}
          />
        ) : selectedDictation ? (
          <DictationPlayer
            dictation={selectedDictation}
            category={categories.find((c) => c.id === selectedDictation.categoryId)}
            onBack={() => {
              setSelectedDictation(null);
              setSavedResults(getSavedResults());
            }}
            onNext={handleNextDictation}
          />
        ) : (
          <DictationList
            dictations={dictations}
            categories={categories}
            savedResults={savedResults}
            onSelectDictation={(dictation) => setSelectedDictation(dictation)}
          />
        )}
      </main>

      <footer className="border-t border-zinc-100 py-6 mt-auto text-xs text-zinc-400">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div>Dyktanda</div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setUserOptionsOpen(true)}
              className="hover:text-zinc-700 transition-colors"
            >
              Opcje
            </button>

            {/* Very discreet admin login trigger in the footer */}
            <button
              onClick={() => setAdminModalOpen(true)}
              className="text-zinc-300 hover:text-zinc-500 transition-colors p-1"
              title="Panel (Ctrl+Alt+A)"
              aria-label="Dostęp"
            >
              <Lock className="w-3 h-3" />
            </button>
          </div>
        </div>
      </footer>

      <UserOptionsModal
        isOpen={userOptionsOpen}
        onClose={() => setUserOptionsOpen(false)}
      />

      <AdminLoginModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        currentUser={currentUser}
        isAdmin={isAdmin}
        onToggleDemoAdmin={(val) => {
          setIsDemoAdmin(val);
          if (val) setActiveView('admin');
        }}
        isDemoAdmin={isDemoAdmin}
      />
    </div>
  );
}
