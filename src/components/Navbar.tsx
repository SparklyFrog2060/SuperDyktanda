import React from 'react';

interface NavbarProps {
  onOpenUserOptions: () => void;
  isAdmin: boolean;
  activeView: 'learn' | 'admin';
  onChangeView: (view: 'learn' | 'admin') => void;
  solvedCount: number;
  totalDictations: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenUserOptions,
  isAdmin,
  activeView,
  onChangeView,
  solvedCount,
  totalDictations,
}) => {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onChangeView('learn')}
            className="text-base font-semibold tracking-tight text-zinc-900 hover:text-zinc-600 transition-colors"
          >
            Dyktanda
          </button>

          {/* View switcher only visible when already an admin */}
          {isAdmin && (
            <nav className="flex items-center gap-1 text-xs">
              <button
                onClick={() => onChangeView('learn')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeView === 'learn'
                    ? 'font-medium text-zinc-900 bg-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Dyktanda
              </button>
              <button
                onClick={() => onChangeView('admin')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeView === 'admin'
                    ? 'font-medium text-zinc-900 bg-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Panel edycji
              </button>
            </nav>
          )}
        </div>

        {/* Right actions: clean and discreet */}
        <div className="flex items-center gap-3 text-xs">
          {totalDictations > 0 && (
            <span className="text-zinc-400 font-mono text-[11px] hidden sm:inline">
              Ukończono: {solvedCount}/{totalDictations}
            </span>
          )}

          <button
            onClick={onOpenUserOptions}
            className="px-2.5 py-1 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors"
          >
            Opcje
          </button>

          {/* Only shown if already logged in as admin */}
          {isAdmin && (
            <button
              onClick={() => onChangeView(activeView === 'admin' ? 'learn' : 'admin')}
              className="px-2.5 py-1 rounded border border-zinc-900 bg-zinc-900 text-white text-xs font-medium"
            >
              Panel
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
