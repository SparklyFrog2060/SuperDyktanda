import React, { useState, useRef } from 'react';
import { Plus, Trash2, Edit2, ArrowLeft, Eye } from 'lucide-react';
import { Category, Dictation, DictationSegment, GapSegment, Difficulty, GapType } from '../../types/dictation';
import {
  saveDictation,
  deleteDictation,
  saveCategory,
  deleteCategory,
  seedDefaultsToFirestore,
} from '../../services/dictationService';

interface AdminDashboardProps {
  categories: Category[];
  dictations: Dictation[];
  onRefreshData: () => Promise<void>;
  onExitAdmin: () => void;
  isOnlineAdmin: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  categories,
  dictations,
  onRefreshData,
  onExitAdmin,
  isOnlineAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'dictations' | 'categories' | 'database'>('dictations');
  const [editingDictation, setEditingDictation] = useState<Dictation | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', icon: 'BookOpen', order: 1 });

  const [editorTitle, setEditorTitle] = useState('');
  const [editorCategoryId, setEditorCategoryId] = useState('');
  const [editorDifficulty, setEditorDifficulty] = useState<Difficulty>('medium');
  const [editorDescription, setEditorDescription] = useState('');
  const [editorRawText, setEditorRawText] = useState('');
  const [editorSegments, setEditorSegments] = useState<DictationSegment[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectedSnippet, setSelectedSnippet] = useState<{ start: number; end: number; text: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenEditor = (dictation?: Dictation) => {
    if (dictation) {
      setEditingDictation(dictation);
      setIsCreatingNew(false);
      setEditorTitle(dictation.title);
      setEditorCategoryId(dictation.categoryId);
      setEditorDifficulty(dictation.difficulty);
      setEditorDescription(dictation.description || '');
      setEditorRawText(dictation.rawText);
      setEditorSegments(dictation.segments);
    } else {
      setEditingDictation(null);
      setIsCreatingNew(true);
      setEditorTitle('');
      setEditorCategoryId(categories[0]?.id || '');
      setEditorDifficulty('medium');
      setEditorDescription('');
      setEditorRawText('');
      setEditorSegments([]);
    }
    setSelectedSnippet(null);
    setStatusMsg(null);
  };

  const handleCloseEditor = () => {
    setEditingDictation(null);
    setIsCreatingNew(false);
  };

  const handleRawTextChange = (text: string) => {
    setEditorRawText(text);
    if (editorSegments.length === 0 || editorSegments.every((s) => s.type === 'text')) {
      setEditorSegments([{ id: 'seg-init', type: 'text', text }]);
    }
  };

  const handleTextareaSelect = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = editorRawText.substring(start, end);

    if (selected.trim().length > 0) {
      setSelectedSnippet({ start, end, text: selected });
    } else {
      setSelectedSnippet(null);
    }
  };

  const getDefaultOptionsFor = (text: string): string[] => {
    const lower = text.toLowerCase();
    if (lower === 'ó' || lower === 'u') return ['ó', 'u'];
    if (lower === 'rz' || lower === 'ż') return ['rz', 'ż'];
    if (lower === 'ch' || lower === 'h') return ['ch', 'h'];
    if (lower === 'ą' || lower === 'om') return ['ą', 'om'];
    if (lower === 'ę' || lower === 'em') return ['ę', 'em'];
    return [text, text + '?'];
  };

  const handleCreateGapFromSelection = (gapType: GapType = 'choice') => {
    if (!selectedSnippet) return;
    const { start, end, text } = selectedSnippet;

    const before = editorRawText.substring(0, start);
    const after = editorRawText.substring(end);

    const defaultOptions = getDefaultOptionsFor(text);

    const newGap: GapSegment = {
      id: `gap-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'gap',
      expected: text,
      gapType,
      options: defaultOptions,
      hint: '',
    };

    const newSegments: DictationSegment[] = [];
    if (before) newSegments.push({ id: `txt-${Date.now()}-1`, type: 'text', text: before });
    newSegments.push(newGap);
    if (after) newSegments.push({ id: `txt-${Date.now()}-2`, type: 'text', text: after });

    setEditorSegments(newSegments);
    setSelectedSnippet(null);
  };

  const handleAutoDetectOrthography = () => {
    if (!editorRawText.trim()) return;

    const regex = /(rz|ż|ch|h|ó|u)/gi;
    const segments: DictationSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    let gapCount = 0;
    while ((match = regex.exec(editorRawText)) !== null) {
      if (gapCount >= 20) break;

      const matchText = match[0];
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        segments.push({
          id: `txt-${Date.now()}-${matchIndex}`,
          type: 'text',
          text: editorRawText.substring(lastIndex, matchIndex),
        });
      }

      const options = getDefaultOptionsFor(matchText);
      const chosenGapType: GapType = gapCount % 2 === 0 ? 'choice' : 'input';

      segments.push({
        id: `gap-${Date.now()}-${matchIndex}`,
        type: 'gap',
        expected: matchText,
        gapType: chosenGapType,
        options,
        hint: '',
      });

      lastIndex = matchIndex + matchText.length;
      gapCount++;
    }

    if (lastIndex < editorRawText.length) {
      segments.push({
        id: `txt-end-${Date.now()}`,
        type: 'text',
        text: editorRawText.substring(lastIndex),
      });
    }

    if (segments.length > 0) {
      setEditorSegments(segments);
      setStatusMsg({
        type: 'success',
        text: `Wykryto ${gapCount} pozycji w tekście.`,
      });
    }
  };

  const handleRemoveGap = (gapId: string) => {
    const updated: DictationSegment[] = [];
    editorSegments.forEach((seg) => {
      if (seg.type === 'gap' && seg.id === gapId) {
        updated.push({ id: `txt-${Date.now()}`, type: 'text', text: seg.expected });
      } else {
        updated.push(seg);
      }
    });

    const merged: DictationSegment[] = [];
    updated.forEach((seg) => {
      if (seg.type === 'text' && merged.length > 0 && merged[merged.length - 1].type === 'text') {
        const last = merged[merged.length - 1] as { id: string; type: 'text'; text: string };
        last.text += seg.text;
      } else {
        merged.push(seg);
      }
    });

    setEditorSegments(merged);
  };

  const handleUpdateGap = (gapId: string, updates: Partial<GapSegment>) => {
    setEditorSegments((prev) =>
      prev.map((seg) => {
        if (seg.type === 'gap' && seg.id === gapId) {
          return { ...seg, ...updates };
        }
        return seg;
      })
    );
  };

  const handleSaveDictation = async () => {
    if (!editorTitle.trim()) {
      setStatusMsg({ type: 'error', text: 'Podaj tytuł dyktanda.' });
      return;
    }
    if (!editorCategoryId) {
      setStatusMsg({ type: 'error', text: 'Wybierz kategorię.' });
      return;
    }
    if (!editorRawText.trim()) {
      setStatusMsg({ type: 'error', text: 'Wprowadź tekst dyktanda.' });
      return;
    }

    const gaps = editorSegments.filter((s) => s.type === 'gap');
    if (gaps.length === 0) {
      setStatusMsg({
        type: 'error',
        text: 'Wymagana jest co najmniej jedna luka w tekście.',
      });
      return;
    }

    try {
      setSaving(true);
      setStatusMsg(null);

      const dictationToSave: Dictation = {
        id: editingDictation?.id || `dykt-${Date.now()}`,
        title: editorTitle.trim(),
        categoryId: editorCategoryId,
        difficulty: editorDifficulty,
        description: editorDescription.trim(),
        rawText: editorRawText.trim(),
        segments: editorSegments,
        totalGaps: gaps.length,
        createdAt: editingDictation?.createdAt || new Date().toISOString(),
      };

      await saveDictation(dictationToSave, isOnlineAdmin);
      await onRefreshData();

      setStatusMsg({ type: 'success', text: 'Zapisano.' });
      setTimeout(() => {
        handleCloseEditor();
      }, 500);
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Błąd podczas zapisu.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDictation = async (id: string) => {
    if (!confirm('Usunąć to dyktando?')) return;
    try {
      await deleteDictation(id, isOnlineAdmin);
      await onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) return;
    try {
      setSaving(true);
      const catToSave: Category = {
        id: editingCategory?.id || `kat-${Date.now()}`,
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim(),
        icon: categoryForm.icon,
        order: Number(categoryForm.order) || 1,
        createdAt: editingCategory?.createdAt || new Date().toISOString(),
      };
      await saveCategory(catToSave, isOnlineAdmin);
      await onRefreshData();
      setIsCreatingCategory(false);
      setEditingCategory(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Usunąć tę kategorię?')) return;
    try {
      await deleteCategory(id, isOnlineAdmin);
      await onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      setSaving(true);
      await seedDefaultsToFirestore();
      await onRefreshData();
      alert('Zsynchronizowano z bazą.');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const gapsList = editorSegments.filter((s): s is GapSegment => s.type === 'gap');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Panel administratora</h1>
        </div>

        <button
          onClick={onExitAdmin}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-200 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Wyjdź z panelu
        </button>
      </div>

      {/* Tabs */}
      {!isCreatingNew && !editingDictation && (
        <div className="flex items-center gap-1 border-b border-zinc-200 text-xs">
          <button
            onClick={() => setActiveTab('dictations')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'dictations'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Dyktanda ({dictations.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'categories'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Kategorie ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'database'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Baza danych
          </button>
        </div>
      )}

      {/* VIEW: DICTATION EDITOR */}
      {(isCreatingNew || editingDictation) && (
        <div className="border border-zinc-200 rounded bg-white p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">
              {editingDictation ? 'Edycja dyktanda' : 'Nowe dyktando'}
            </h2>
            <button
              onClick={handleCloseEditor}
              className="text-xs text-zinc-500 hover:text-zinc-800"
            >
              Anuluj
            </button>
          </div>

          {statusMsg && (
            <div
              className={`p-2.5 rounded text-xs ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                  : 'bg-red-50 text-red-800 border border-red-100'
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs text-zinc-600 block">Tytuł *</label>
              <input
                type="text"
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
                placeholder="Tytuł dyktanda"
                className="w-full px-3 py-1.5 text-xs rounded border border-zinc-200 focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-600 block">Kategoria *</label>
              <select
                value={editorCategoryId}
                onChange={(e) => setEditorCategoryId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-zinc-200 bg-white focus:outline-none focus:border-zinc-900"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-600 block">Poziom</label>
              <select
                value={editorDifficulty}
                onChange={(e) => setEditorDifficulty(e.target.value as Difficulty)}
                className="w-full px-3 py-1.5 text-xs rounded border border-zinc-200 bg-white focus:outline-none focus:border-zinc-900"
              >
                <option value="easy">Łatwy</option>
                <option value="medium">Średni</option>
                <option value="hard">Trudny</option>
              </select>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs text-zinc-600 block">Krótki opis / wskazówka</label>
              <input
                type="text"
                value={editorDescription}
                onChange={(e) => setEditorDescription(e.target.value)}
                placeholder="Opcjonalna wskazówka"
                className="w-full px-3 py-1.5 text-xs rounded border border-zinc-200 focus:outline-none focus:border-zinc-900"
              />
            </div>
          </div>

          {/* Raw Text Input */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-900">
                Pełny tekst
              </label>

              <button
                type="button"
                onClick={handleAutoDetectOrthography}
                className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded text-xs transition-colors"
              >
                Wykryj reguły (ó/u, rz/ż, ch/h)
              </button>
            </div>

            <textarea
              ref={textareaRef}
              rows={4}
              value={editorRawText}
              onChange={(e) => handleRawTextChange(e.target.value)}
              onSelect={handleTextareaSelect}
              placeholder="Wprowadź tekst dyktanda..."
              className="w-full p-3 text-sm rounded border border-zinc-200 focus:outline-none focus:border-zinc-900 leading-relaxed"
            />

            {/* Selection action bar */}
            {selectedSnippet && (
              <div className="p-2.5 bg-zinc-50 rounded border border-zinc-200 flex items-center justify-between text-xs">
                <div>
                  Zaznaczono: <code className="bg-white px-1.5 py-0.5 rounded border border-zinc-200 font-mono">{selectedSnippet.text}</code>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCreateGapFromSelection('choice')}
                    className="px-2.5 py-1 bg-zinc-900 text-white rounded text-xs"
                  >
                    Ukryj (wybór z opcji)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateGapFromSelection('input')}
                    className="px-2.5 py-1 border border-zinc-200 text-zinc-700 bg-white rounded text-xs"
                  >
                    Ukryj (do wpisania)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Gaps List */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-medium text-zinc-900">
              Luki w tekście ({gapsList.length})
            </div>

            {gapsList.length === 0 ? (
              <div className="p-4 border border-zinc-200 rounded text-center text-xs text-zinc-400">
                Brak luk. Wpisz tekst i zaznacz litery lub kliknij "Wykryj reguły".
              </div>
            ) : (
              <div className="border border-zinc-200 rounded divide-y divide-zinc-100 max-h-64 overflow-y-auto">
                {gapsList.map((gap, idx) => (
                  <div
                    key={gap.id}
                    className="p-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-400 text-[11px] w-4">{idx + 1}.</span>
                      <input
                        type="text"
                        value={gap.expected}
                        onChange={(e) => handleUpdateGap(gap.id, { expected: e.target.value })}
                        className="w-16 px-1.5 py-0.5 border border-zinc-200 rounded font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleUpdateGap(gap.id, { gapType: 'choice' })}
                        className={`px-2 py-0.5 rounded ${
                          gap.gapType === 'choice' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        Wybór
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateGap(gap.id, { gapType: 'input' })}
                        className={`px-2 py-0.5 rounded ${
                          gap.gapType === 'input' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        Wpisanie
                      </button>
                    </div>

                    {gap.gapType === 'choice' ? (
                      <input
                        type="text"
                        value={gap.options?.join(', ') || ''}
                        onChange={(e) =>
                          handleUpdateGap(gap.id, {
                            options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        placeholder="Opcje, np. ó, u"
                        className="px-2 py-0.5 text-xs border border-zinc-200 rounded w-32 font-mono"
                      />
                    ) : (
                      <span className="text-[11px] text-zinc-400 w-32">Z klawiatury</span>
                    )}

                    <input
                      type="text"
                      value={gap.hint || ''}
                      onChange={(e) => handleUpdateGap(gap.id, { hint: e.target.value })}
                      placeholder="Wskazówka"
                      className="px-2 py-0.5 text-xs border border-zinc-200 rounded w-36"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveGap(gap.id)}
                      className="p-1 text-zinc-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Preview */}
          <div className="space-y-1.5 pt-2">
            <div className="text-xs font-medium text-zinc-900 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-zinc-400" />
              Podgląd
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-xs leading-relaxed text-zinc-800">
              {editorSegments.map((seg) => {
                if (seg.type === 'text') return <span key={seg.id}>{seg.text}</span>;
                return (
                  <span
                    key={seg.id}
                    className="inline-block mx-0.5 px-1 py-0.5 rounded border border-zinc-300 bg-white font-mono text-[11px]"
                  >
                    {seg.gapType === 'choice' ? `[${seg.options?.join('/') || '?'}]` : '[...]'}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 text-xs">
            <button
              onClick={handleCloseEditor}
              className="px-3 py-1.5 border border-zinc-200 rounded text-zinc-700 hover:bg-zinc-50"
            >
              Anuluj
            </button>
            <button
              onClick={handleSaveDictation}
              disabled={saving}
              className="px-4 py-1.5 bg-zinc-900 text-white rounded font-medium hover:bg-zinc-800"
            >
              {saving ? 'Zapisywanie...' : 'Zapisz dyktando'}
            </button>
          </div>
        </div>
      )}

      {/* VIEW: DICTATIONS LIST */}
      {!isCreatingNew && !editingDictation && activeTab === 'dictations' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Lista dyktand</h2>
            <button
              onClick={() => handleOpenEditor()}
              className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 text-white rounded text-xs font-medium hover:bg-zinc-800"
            >
              <Plus className="w-3.5 h-3.5" />
              Dodaj dyktando
            </button>
          </div>

          <div className="border border-zinc-200 rounded bg-white divide-y divide-zinc-100">
            {dictations.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                Brak dyktand.
              </div>
            ) : (
              dictations.map((dict) => {
                const cat = categories.find((c) => c.id === dict.categoryId);
                return (
                  <div
                    key={dict.id}
                    className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-zinc-50/50"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-900">{dict.title}</span>
                        <span className="text-zinc-400">·</span>
                        <span className="text-zinc-500">{cat?.name || 'Inne'}</span>
                        <span className="text-zinc-400">·</span>
                        <span className="text-zinc-400">{dict.totalGaps} luk</span>
                      </div>
                      <p className="text-zinc-400 text-[11px] line-clamp-1">{dict.rawText}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditor(dict)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded hover:bg-zinc-100"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDictation(dict.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 rounded hover:bg-zinc-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW: CATEGORIES */}
      {!isCreatingNew && !editingDictation && activeTab === 'categories' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Kategorie</h2>
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ name: '', description: '', icon: 'BookOpen', order: categories.length + 1 });
                setIsCreatingCategory(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 text-white rounded text-xs font-medium hover:bg-zinc-800"
            >
              <Plus className="w-3.5 h-3.5" />
              Dodaj kategorię
            </button>
          </div>

          {isCreatingCategory && (
            <div className="p-4 border border-zinc-200 rounded bg-zinc-50 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-zinc-600 block mb-1">Nazwa</label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white rounded border border-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-zinc-600 block mb-1">Opis</label>
                  <input
                    type="text"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white rounded border border-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-zinc-600 block mb-1">Kolejność</label>
                  <input
                    type="number"
                    value={categoryForm.order}
                    onChange={(e) => setCategoryForm({ ...categoryForm, order: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white rounded border border-zinc-200"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsCreatingCategory(false)}
                  className="px-3 py-1 text-zinc-600 hover:bg-zinc-200/50 rounded"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSaveCategory}
                  className="px-3 py-1 bg-zinc-900 text-white rounded font-medium"
                >
                  Zapisz
                </button>
              </div>
            </div>
          )}

          <div className="border border-zinc-200 rounded bg-white divide-y divide-zinc-100">
            {categories.map((cat) => {
              const count = dictations.filter((d) => d.categoryId === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="p-3.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-medium text-zinc-900">{cat.name}</div>
                    {cat.description && <div className="text-zinc-400 text-[11px]">{cat.description}</div>}
                    <div className="text-[11px] text-zinc-500 mt-0.5">Liczba dyktand: {count}</div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingCategory(cat);
                        setCategoryForm({
                          name: cat.name,
                          description: cat.description || '',
                          icon: cat.icon || 'BookOpen',
                          order: cat.order,
                        });
                        setIsCreatingCategory(true);
                      }}
                      className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded hover:bg-zinc-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-600 rounded hover:bg-zinc-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: DATABASE */}
      {!isCreatingNew && !editingDictation && activeTab === 'database' && (
        <div className="border border-zinc-200 rounded bg-white p-5 space-y-3 text-xs">
          <h3 className="font-semibold text-zinc-900">Baza danych (Firebase Firestore)</h3>
          <p className="text-zinc-500">
            Możesz zsynchronizować domyślny zestaw ćwiczeń do bazy danych.
          </p>

          <button
            onClick={handleSeedDefaults}
            disabled={saving}
            className="px-3 py-1.5 bg-zinc-900 text-white rounded font-medium hover:bg-zinc-800"
          >
            {saving ? 'Synchronizowanie...' : 'Wgraj domyślne dyktanda do bazy'}
          </button>
        </div>
      )}
    </div>
  );
};
