import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Dictation, Category, DictationResult } from '../types/dictation';

interface DictationListProps {
  dictations: Dictation[];
  categories: Category[];
  savedResults: Record<string, DictationResult>;
  onSelectDictation: (dictation: Dictation) => void;
}

export const DictationList: React.FC<DictationListProps> = ({
  dictations,
  categories,
  savedResults,
  onSelectDictation,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  const filteredDictations = dictations.filter((d) => {
    const matchesCategory = selectedCategoryId === 'all' || d.categoryId === selectedCategoryId;
    const matchesDifficulty = difficultyFilter === 'all' || d.difficulty === difficultyFilter;
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.rawText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesDifficulty && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Category selector */}
      <div className="flex items-center gap-1 border-b border-zinc-200 overflow-x-auto pb-px">
        <button
          onClick={() => setSelectedCategoryId('all')}
          className={`px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
            selectedCategoryId === 'all'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Wszystkie ({dictations.length})
        </button>

        {categories.map((cat) => {
          const count = dictations.filter((d) => d.categoryId === cat.id).length;
          const isActive = selectedCategoryId === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Search and difficulty bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-zinc-200 bg-white placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
          <label htmlFor="difficulty-select" className="text-zinc-500 text-xs">Poziom:</label>
          <select
            id="difficulty-select"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded border border-zinc-200 bg-white text-zinc-800 focus:outline-none focus:border-zinc-900"
          >
            <option value="all">Wszystkie</option>
            <option value="easy">Łatwy</option>
            <option value="medium">Średni</option>
            <option value="hard">Trudny</option>
          </select>
        </div>
      </div>

      {/* Dictations List */}
      {filteredDictations.length === 0 ? (
        <div className="py-16 text-center text-xs text-zinc-400 border border-zinc-200 rounded bg-white">
          {dictations.length === 0 ? 'Brak dodanych dyktand.' : 'Brak dyktand dla wybranych filtrów.'}
        </div>
      ) : (
        <div className="divide-y divide-zinc-200 border border-zinc-200 rounded bg-white overflow-hidden">
          {filteredDictations.map((dictation) => {
            const cat = categories.find((c) => c.id === dictation.categoryId);
            const saved = savedResults[dictation.id];
            const diffText =
              dictation.difficulty === 'easy'
                ? 'Łatwy'
                : dictation.difficulty === 'medium'
                ? 'Średni'
                : 'Trudny';

            return (
              <div
                key={dictation.id}
                onClick={() => onSelectDictation(dictation)}
                className="p-5 hover:bg-zinc-50/70 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-2xl">
                  {/* Clean unboxed metadata with bullet separators */}
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="text-zinc-600 font-medium">{cat?.name || 'Dyktando'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{diffText}</span>
                    <span aria-hidden="true">·</span>
                    <span>{dictation.totalGaps} luk</span>
                  </div>

                  <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
                    {dictation.title}
                  </h2>

                  <p className="text-xs text-zinc-500 line-clamp-1 leading-relaxed">
                    {dictation.rawText}
                  </p>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto shrink-0 text-xs">
                  {saved && (
                    <span className="font-mono text-zinc-600 text-xs">
                      Wynik: {saved.scorePercentage}%
                    </span>
                  )}

                  <span className="px-3 py-1.5 rounded bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-colors">
                    Rozwiąż
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
