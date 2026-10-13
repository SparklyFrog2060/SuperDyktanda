import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { DEFAULT_CATEGORIES, DEFAULT_DICTATIONS } from '../data/defaultDictations';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Category, Dictation, DictationResult } from '../types/dictation';

const CATEGORIES_COLLECTION = 'categories';
const DICTATIONS_COLLECTION = 'dictations';
const LOCAL_STORAGE_RESULTS_KEY = 'dyktanda_user_results_v1';
const LOCAL_STORAGE_CUSTOM_CATS = 'dyktanda_local_categories_v1';
const LOCAL_STORAGE_CUSTOM_DICTS = 'dyktanda_local_dictations_v1';

// Helpers for localStorage fallback if Firestore is fresh or offline
function getLocalFallbackCategories(): Category[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_CATS);
    if (raw) {
      const parsed: Category[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_CATEGORIES;
}

function saveLocalFallbackCategories(cats: Category[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_CATS, JSON.stringify(cats));
  } catch (e) {
    console.error(e);
  }
}

function getLocalFallbackDictations(): Dictation[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_DICTS);
    if (raw) {
      const parsed: Dictation[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_DICTATIONS;
}

function saveLocalFallbackDictations(dicts: Dictation[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_DICTS, JSON.stringify(dicts));
  } catch (e) {
    console.error(e);
  }
}

// 1. Categories
export async function fetchCategories(): Promise<Category[]> {
  try {
    const snap = await getDocs(collection(db, CATEGORIES_COLLECTION));
    if (snap.empty) {
      // First run: return defaults and optionally seed in background
      return getLocalFallbackCategories();
    }
    const list: Category[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        name: data.name || '',
        description: data.description || '',
        icon: data.icon || 'BookOpen',
        order: typeof data.order === 'number' ? data.order : 0,
        createdAt: data.createdAt,
      });
    });
    list.sort((a, b) => a.order - b.order);
    return list;
  } catch (error) {
    console.warn('Using local categories fallback:', error);
    return getLocalFallbackCategories();
  }
}

export async function saveCategory(category: Category, isOnlineAdmin: boolean): Promise<void> {
  const cleanId = category.id || `kat-${Date.now()}`;
  const data = {
    name: category.name,
    order: Number(category.order) || 1,
    description: category.description || '',
    icon: category.icon || 'BookOpen',
    createdAt: category.createdAt || new Date().toISOString(),
  };

  if (isOnlineAdmin) {
    try {
      await setDoc(doc(db, CATEGORIES_COLLECTION, cleanId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${CATEGORIES_COLLECTION}/${cleanId}`);
    }
  }

  // Also maintain local store
  const current = getLocalFallbackCategories();
  const index = current.findIndex((c) => c.id === cleanId);
  if (index >= 0) {
    current[index] = { ...category, id: cleanId };
  } else {
    current.push({ ...category, id: cleanId });
  }
  saveLocalFallbackCategories(current);
}

export async function deleteCategory(categoryId: string, isOnlineAdmin: boolean): Promise<void> {
  if (isOnlineAdmin) {
    try {
      await deleteDoc(doc(db, CATEGORIES_COLLECTION, categoryId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${CATEGORIES_COLLECTION}/${categoryId}`);
    }
  }
  const current = getLocalFallbackCategories().filter((c) => c.id !== categoryId);
  saveLocalFallbackCategories(current);
}

// 2. Dictations
export async function fetchDictations(): Promise<Dictation[]> {
  try {
    const snap = await getDocs(collection(db, DICTATIONS_COLLECTION));
    if (snap.empty) {
      return getLocalFallbackDictations();
    }
    const list: Dictation[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        title: data.title || '',
        categoryId: data.categoryId || '',
        description: data.description || '',
        difficulty: data.difficulty || 'medium',
        rawText: data.rawText || '',
        segments: data.segments || [],
        totalGaps: Number(data.totalGaps) || 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });
    return list;
  } catch (error) {
    console.warn('Using local dictations fallback:', error);
    return getLocalFallbackDictations();
  }
}

export async function saveDictation(dictation: Dictation, isOnlineAdmin: boolean): Promise<void> {
  const cleanId = dictation.id || `dykt-${Date.now()}`;
  const now = new Date().toISOString();
  const data = {
    title: dictation.title,
    categoryId: dictation.categoryId,
    description: dictation.description || '',
    difficulty: dictation.difficulty || 'medium',
    rawText: dictation.rawText,
    segments: dictation.segments,
    totalGaps: Number(dictation.totalGaps) || 0,
    createdAt: dictation.createdAt || now,
    updatedAt: now,
  };

  if (isOnlineAdmin) {
    try {
      await setDoc(doc(db, DICTATIONS_COLLECTION, cleanId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${DICTATIONS_COLLECTION}/${cleanId}`);
    }
  }

  const current = getLocalFallbackDictations();
  const index = current.findIndex((d) => d.id === cleanId);
  if (index >= 0) {
    current[index] = { ...dictation, id: cleanId, updatedAt: now };
  } else {
    current.push({ ...dictation, id: cleanId, createdAt: now, updatedAt: now });
  }
  saveLocalFallbackDictations(current);
}

export async function deleteDictation(dictationId: string, isOnlineAdmin: boolean): Promise<void> {
  if (isOnlineAdmin) {
    try {
      await deleteDoc(doc(db, DICTATIONS_COLLECTION, dictationId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${DICTATIONS_COLLECTION}/${dictationId}`);
    }
  }
  const current = getLocalFallbackDictations().filter((d) => d.id !== dictationId);
  saveLocalFallbackDictations(current);
}

// Seed default items into Firestore if admin wants to initialize cloud data
export async function seedDefaultsToFirestore(): Promise<void> {
  for (const cat of DEFAULT_CATEGORIES) {
    await setDoc(doc(db, CATEGORIES_COLLECTION, cat.id), {
      name: cat.name,
      order: cat.order,
      description: cat.description || '',
      icon: cat.icon || 'BookOpen',
      createdAt: cat.createdAt || new Date().toISOString(),
    });
  }

  for (const dict of DEFAULT_DICTATIONS) {
    await setDoc(doc(db, DICTATIONS_COLLECTION, dict.id), {
      title: dict.title,
      categoryId: dict.categoryId,
      description: dict.description || '',
      difficulty: dict.difficulty,
      rawText: dict.rawText,
      segments: dict.segments,
      totalGaps: dict.totalGaps,
      createdAt: dict.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

// 3. Anonymous Learner Local Storage Results (No login needed!)
export function getSavedResults(): Record<string, DictationResult> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_RESULTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return {};
}

export function saveLocalResult(result: DictationResult): void {
  try {
    const results = getSavedResults();
    results[result.dictationId] = result;
    localStorage.setItem(LOCAL_STORAGE_RESULTS_KEY, JSON.stringify(results));
  } catch (e) {
    console.error(e);
  }
}
