import React, { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Check, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Dictation, DictationSegment, GapSegment, Category } from '../types/dictation';
import { saveLocalResult } from '../services/dictationService';

interface DictationPlayerProps {
  dictation: Dictation;
  category?: Category;
  onBack: () => void;
  onNext?: () => void;
}

export const DictationPlayer: React.FC<DictationPlayerProps> = ({
  dictation,
  category,
  onBack,
  onNext,
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeChoiceGapId, setActiveChoiceGapId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'slides' | 'full'>('slides');
  const [activeHintId, setActiveHintId] = useState<string | null>(null);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const allGaps = dictation.segments.filter((s): s is GapSegment => s.type === 'gap');

  // Slide partitioning by sentences
  const slides = React.useMemo(() => {
    const list: DictationSegment[][] = [];
    let currentSlide: DictationSegment[] = [];

    dictation.segments.forEach((seg) => {
      currentSlide.push(seg);
      if (seg.type === 'text') {
        if (/[.!?]\s*$/.test(seg.text)) {
          list.push(currentSlide);
          currentSlide = [];
        }
      }
    });

    if (currentSlide.length > 0) {
      list.push(currentSlide);
    }
    return list.length > 0 ? list : [dictation.segments];
  }, [dictation.segments]);

  const handleSelectChoice = (gapId: string, choice: string) => {
    setAnswers((prev) => ({ ...prev, [gapId]: choice }));
    setActiveChoiceGapId(null);
    setChecked(false);
    focusNextGap(gapId);
  };

  const handleInputChange = (gapId: string, expectedLength: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [gapId]: value }));
    setChecked(false);
    if (value.trim().length >= expectedLength) {
      focusNextGap(gapId);
    }
  };

  const focusNextGap = (currentGapId: string) => {
    const currentIndex = allGaps.findIndex((g) => g.id === currentGapId);
    if (currentIndex >= 0 && currentIndex < allGaps.length - 1) {
      const nextGap = allGaps[currentIndex + 1];
      if (nextGap.gapType === 'input') {
        setTimeout(() => {
          inputRefs.current[nextGap.id]?.focus();
        }, 40);
      }
    }
  };

  const totalGapsCount = allGaps.length;
  const answeredCount = Object.keys(answers).filter((k) => (answers[k] || '').trim().length > 0).length;

  const results = React.useMemo(() => {
    let correct = 0;
    const gapResults: Record<string, boolean> = {};

    allGaps.forEach((gap) => {
      const userVal = (answers[gap.id] || '').trim();
      const expectedVal = gap.expected.trim();
      const isMatch = gap.caseSensitive
        ? userVal === expectedVal
        : userVal.toLowerCase() === expectedVal.toLowerCase();

      gapResults[gap.id] = isMatch;
      if (isMatch) correct += 1;
    });

    const percentage = totalGapsCount > 0 ? Math.round((correct / totalGapsCount) * 100) : 100;

    return {
      correct,
      total: totalGapsCount,
      percentage,
      gapResults,
    };
  }, [answers, allGaps, totalGapsCount]);

  const handleVerify = () => {
    setChecked(true);
    saveLocalResult({
      dictationId: dictation.id,
      totalGaps: totalGapsCount,
      correctAnswers: results.correct,
      scorePercentage: results.percentage,
      completedAt: new Date().toISOString(),
    });
  };

  const handleReset = () => {
    setAnswers({});
    setChecked(false);
    setActiveSlideIndex(0);
    setActiveHintId(null);
  };

  const renderGap = (gap: GapSegment) => {
    const userVal = answers[gap.id] || '';
    const isCorrect = results.gapResults[gap.id];

    let stateStyle = 'border-zinc-300 text-zinc-900 bg-zinc-50/50 hover:border-zinc-400';
    if (checked) {
      if (isCorrect) {
        stateStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium';
      } else {
        stateStyle = 'border-red-400 bg-red-50 text-red-900 font-medium';
      }
    } else if (userVal) {
      stateStyle = 'border-zinc-900 bg-white text-zinc-900 font-medium';
    }

    if (gap.gapType === 'choice') {
      const options = gap.options && gap.options.length > 0 ? gap.options : [gap.expected, 'x'];
      const isOpen = activeChoiceGapId === gap.id;

      return (
        <span key={gap.id} className="relative inline-block mx-0.5 align-baseline">
          <button
            type="button"
            onClick={() => setActiveChoiceGapId(isOpen ? null : gap.id)}
            className={`min-w-[36px] px-2 py-0.5 text-sm rounded border text-center transition-colors cursor-pointer ${stateStyle}`}
          >
            {userVal || <span className="text-zinc-400">...</span>}
          </button>

          {/* Choice popup */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.12 }}
                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-30 bg-white rounded border border-zinc-200 shadow-md p-1 flex gap-1 whitespace-nowrap"
              >
                {options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectChoice(gap.id, opt)}
                    className="px-2.5 py-1 text-xs font-medium rounded hover:bg-zinc-100 text-zinc-800 transition-colors"
                  >
                    {opt}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {checked && !isCorrect && gap.hint && (
            <button
              onClick={() => setActiveHintId(activeHintId === gap.id ? null : gap.id)}
              className="ml-1 text-zinc-400 hover:text-zinc-700 inline-block align-middle"
              title="Wskazówka"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          )}

          {activeHintId === gap.id && gap.hint && (
            <div className="absolute left-0 bottom-full mb-1 z-20 w-44 p-2 text-xs bg-zinc-900 text-white rounded shadow">
              {gap.hint}
            </div>
          )}
        </span>
      );
    }

    // Input mode
    const expectedLen = Math.max(gap.expected.length, 2);

    return (
      <span key={gap.id} className="relative inline-block mx-0.5 align-baseline">
        <input
          ref={(el) => {
            inputRefs.current[gap.id] = el;
          }}
          type="text"
          value={userVal}
          maxLength={gap.expected.length + 2}
          onChange={(e) => handleInputChange(gap.id, gap.expected.length, e.target.value)}
          style={{ width: `${Math.max(expectedLen * 18, 40)}px` }}
          className={`h-6 px-1.5 text-sm text-center rounded border outline-none transition-colors ${stateStyle}`}
        />

        {checked && !isCorrect && gap.hint && (
          <button
            onClick={() => setActiveHintId(activeHintId === gap.id ? null : gap.id)}
            className="ml-1 text-zinc-400 hover:text-zinc-700 inline-block align-middle"
            title="Wskazówka"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        )}

        {activeHintId === gap.id && gap.hint && (
          <div className="absolute left-0 bottom-full mb-1 z-20 w-44 p-2 text-xs bg-zinc-900 text-white rounded shadow">
            {gap.hint}
          </div>
        )}
      </span>
    );
  };

  const renderSegment = (seg: DictationSegment) => {
    if (seg.type === 'text') {
      return (
        <span key={seg.id} className="text-zinc-800">
          {seg.text}
        </span>
      );
    }
    return renderGap(seg);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between text-xs">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Powrót
        </button>

        <div className="flex items-center gap-1 border border-zinc-200 rounded p-0.5 bg-zinc-50 text-xs">
          <button
            onClick={() => setViewMode('slides')}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewMode === 'slides' ? 'bg-white text-zinc-900 font-medium shadow-xs' : 'text-zinc-500'
            }`}
          >
            Zdaniami
          </button>
          <button
            onClick={() => setViewMode('full')}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewMode === 'full' ? 'bg-white text-zinc-900 font-medium shadow-xs' : 'text-zinc-500'
            }`}
          >
            Cały tekst
          </button>
        </div>
      </div>

      {/* Main Reading Card */}
      <div className="border border-zinc-200 rounded bg-white overflow-hidden">
        {/* Title area */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-400">
              {category?.name || 'Dyktando'} · {dictation.difficulty === 'easy' ? 'Łatwy' : dictation.difficulty === 'medium' ? 'Średni' : 'Trudny'}
            </div>
            <h1 className="text-lg font-semibold text-zinc-900 mt-0.5">{dictation.title}</h1>
          </div>

          <div className="text-xs text-zinc-400 font-mono">
            {answeredCount}/{totalGapsCount} luk
          </div>
        </div>

        {/* Text Area */}
        <div className="p-8 sm:p-10 min-h-[180px] text-base sm:text-lg leading-relaxed font-normal">
          {viewMode === 'full' ? (
            <div>{dictation.segments.map(renderSegment)}</div>
          ) : (
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSlideIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {slides[activeSlideIndex]?.map(renderSegment)}
                </motion.div>
              </AnimatePresence>

              {slides.length > 1 && (
                <div className="flex items-center justify-between pt-8 mt-8 border-t border-zinc-100 text-xs">
                  <button
                    disabled={activeSlideIndex === 0}
                    onClick={() => setActiveSlideIndex((p) => Math.max(p - 1, 0))}
                    className="text-zinc-500 hover:text-zinc-900 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Poprzednie zdanie
                  </button>

                  <span className="text-zinc-400 font-mono text-[11px]">
                    {activeSlideIndex + 1} / {slides.length}
                  </span>

                  <button
                    disabled={activeSlideIndex === slides.length - 1}
                    onClick={() => setActiveSlideIndex((p) => Math.min(p + 1, slides.length - 1))}
                    className="text-zinc-500 hover:text-zinc-900 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Następne zdanie
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3.5 bg-zinc-50/60 border-t border-zinc-100 flex items-center justify-between text-xs">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Wyczyść
          </button>

          <button
            onClick={handleVerify}
            className="px-4 py-1.5 rounded bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-colors"
          >
            Sprawdź
          </button>
        </div>
      </div>

      {/* Verification Score Card */}
      {checked && (
        <div className="p-4 rounded border border-zinc-200 bg-white flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-zinc-900">
              Wynik: {results.correct} z {results.total} ({results.percentage}%)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="text-zinc-500 hover:text-zinc-800"
            >
              Spróbuj ponownie
            </button>

            {onNext && (
              <button
                onClick={onNext}
                className="flex items-center gap-1 text-zinc-900 font-medium hover:underline"
              >
                Następne dyktando <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
