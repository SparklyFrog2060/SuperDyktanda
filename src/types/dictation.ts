export type Difficulty = 'easy' | 'medium' | 'hard';

export type GapType = 'input' | 'choice';

export interface GapSegment {
  id: string;
  type: 'gap';
  expected: string; // The correct letter/cluster, e.g. "ó", "rz", "ch", "ż"
  gapType: GapType; // 'input' for keyboard typing, 'choice' for popup options
  options?: string[]; // e.g. ["ó", "u"] or ["rz", "ż"]
  hint?: string; // Optional orthographic rule explanation
  caseSensitive?: boolean;
}

export interface TextSegment {
  id: string;
  type: 'text';
  text: string;
}

export type DictationSegment = TextSegment | GapSegment;

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order: number;
  createdAt?: string;
}

export interface Dictation {
  id: string;
  title: string;
  categoryId: string;
  description?: string;
  difficulty: Difficulty;
  rawText: string;
  segments: DictationSegment[];
  totalGaps: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserGapAnswer {
  gapId: string;
  userValue: string;
  isCorrect?: boolean;
  checked?: boolean;
}

export interface DictationResult {
  dictationId: string;
  totalGaps: number;
  correctAnswers: number;
  scorePercentage: number;
  completedAt: string;
}
