// Base game interface
export interface Game {
  id?: number;
  name: string;
  type: GameType;
  createdAt: string;
  updatedAt: string;
}

export type GameType = 'category' | 'quiz' | 'wheel';

// Category Quiz (Jeopardy-style)
export interface CategoryGame extends Game {
  type: 'category';
  categories: Category[];
}

export interface Category {
  id?: number;
  gameId?: number;
  name: string;
  questions: CategoryQuestion[];
}

export interface CategoryQuestion {
  id?: number;
  categoryId?: number;
  points: number; // 200, 400, 600, 800, 1000
  question: string;
  answer: string;
}

// Multiple Choice Quiz
export interface QuizGame extends Game {
  type: 'quiz';
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id?: number;
  gameId?: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  timeLimit?: number; // seconds
}

// Wheel of Fortune
export interface WheelGame extends Game {
  type: 'wheel';
  segments: WheelSegment[];
}

export interface WheelSegment {
  id?: number;
  gameId?: number;
  label: string;
  color: string;
  value?: number; // optional point value
  action?: string; // e.g., "lose turn", "bonus", etc.
}

// Union type for all game types
export type AnyGame = CategoryGame | QuizGame | WheelGame;

// Point values for category quiz
export const CATEGORY_POINT_VALUES = [200, 400, 600, 800, 1000];

// Default colors for wheel segments
export const DEFAULT_WHEEL_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
  '#9966FF', '#FF9F40', '#7CFC00', '#FF69B4'
];
