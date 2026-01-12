import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import {
  Game,
  GameType,
  CategoryGame,
  QuizGame,
  WheelGame,
  AnyGame,
  Category,
  CategoryQuestion,
  QuizQuestion,
  WheelSegment,
  CATEGORY_POINT_VALUES
} from '../models/game.models';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  constructor(private db: DatabaseService) {}

  async initialize(): Promise<void> {
    await this.db.initialize();
  }

  // Get all games
  async getAllGames(): Promise<Game[]> {
    const result = await this.db.query('SELECT * FROM games ORDER BY updated_at DESC');
    return (result.values || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type as GameType,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  // Get games by type
  async getGamesByType(type: GameType): Promise<Game[]> {
    const result = await this.db.query('SELECT * FROM games WHERE type = ? ORDER BY updated_at DESC', [type]);
    return (result.values || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type as GameType,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  // Get full game with all related data
  async getFullGame(gameId: number): Promise<AnyGame | null> {
    const gameResult = await this.db.query('SELECT * FROM games WHERE id = ?', [gameId]);
    if (!gameResult.values?.length) return null;

    const row = gameResult.values[0];
    const baseGame: Game = {
      id: row.id,
      name: row.name,
      type: row.type as GameType,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    switch (baseGame.type) {
      case 'category':
        return this.loadCategoryGame(baseGame);
      case 'quiz':
        return this.loadQuizGame(baseGame);
      case 'wheel':
        return this.loadWheelGame(baseGame);
      default:
        return null;
    }
  }

  private async loadCategoryGame(baseGame: Game): Promise<CategoryGame> {
    const categoriesResult = await this.db.query(
      'SELECT * FROM categories WHERE game_id = ?',
      [baseGame.id]
    );

    const categories: Category[] = [];
    for (const catRow of categoriesResult.values || []) {
      const questionsResult = await this.db.query(
        'SELECT * FROM category_questions WHERE category_id = ? ORDER BY points',
        [catRow.id]
      );

      categories.push({
        id: catRow.id,
        gameId: catRow.game_id,
        name: catRow.name,
        questions: (questionsResult.values || []).map((q: any) => ({
          id: q.id,
          categoryId: q.category_id,
          points: q.points,
          question: q.question,
          answer: q.answer
        }))
      });
    }

    return { ...baseGame, type: 'category', categories };
  }

  private async loadQuizGame(baseGame: Game): Promise<QuizGame> {
    const questionsResult = await this.db.query(
      'SELECT * FROM quiz_questions WHERE game_id = ?',
      [baseGame.id]
    );

    return {
      ...baseGame,
      type: 'quiz',
      questions: (questionsResult.values || []).map((q: any) => ({
        id: q.id,
        gameId: q.game_id,
        question: q.question,
        optionA: q.option_a,
        optionB: q.option_b,
        optionC: q.option_c,
        optionD: q.option_d,
        correctAnswer: q.correct_answer,
        timeLimit: q.time_limit
      }))
    };
  }

  private async loadWheelGame(baseGame: Game): Promise<WheelGame> {
    const segmentsResult = await this.db.query(
      'SELECT * FROM wheel_segments WHERE game_id = ?',
      [baseGame.id]
    );

    return {
      ...baseGame,
      type: 'wheel',
      segments: (segmentsResult.values || []).map((s: any) => ({
        id: s.id,
        gameId: s.game_id,
        label: s.label,
        color: s.color,
        value: s.value,
        action: s.action
      }))
    };
  }

  // Create a new game
  async createGame(name: string, type: GameType): Promise<number> {
    const now = new Date().toISOString();
    await this.db.run(
      'INSERT INTO games (name, type, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [name, type, now, now]
    );
    return this.db.getLastInsertId();
  }

  // Update game name
  async updateGameName(gameId: number, name: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run(
      'UPDATE games SET name = ?, updated_at = ? WHERE id = ?',
      [name, now, gameId]
    );
  }

  // Delete game
  async deleteGame(gameId: number): Promise<void> {
    await this.db.run('DELETE FROM games WHERE id = ?', [gameId]);
  }

  // Category Quiz methods
  async addCategory(gameId: number, name: string): Promise<number> {
    await this.db.run(
      'INSERT INTO categories (game_id, name) VALUES (?, ?)',
      [gameId, name]
    );
    const categoryId = await this.db.getLastInsertId();

    // Add default questions for each point value
    for (const points of CATEGORY_POINT_VALUES) {
      await this.db.run(
        'INSERT INTO category_questions (category_id, points, question, answer) VALUES (?, ?, ?, ?)',
        [categoryId, points, '', '']
      );
    }

    await this.updateGameTimestamp(gameId);
    return categoryId;
  }

  async updateCategory(categoryId: number, name: string): Promise<void> {
    await this.db.run('UPDATE categories SET name = ? WHERE id = ?', [name, categoryId]);
  }

  async deleteCategory(categoryId: number): Promise<void> {
    await this.db.run('DELETE FROM categories WHERE id = ?', [categoryId]);
  }

  async updateCategoryQuestion(questionId: number, question: string, answer: string): Promise<void> {
    await this.db.run(
      'UPDATE category_questions SET question = ?, answer = ? WHERE id = ?',
      [question, answer, questionId]
    );
  }

  // Quiz methods
  async addQuizQuestion(gameId: number, question: QuizQuestion): Promise<number> {
    await this.db.run(
      `INSERT INTO quiz_questions 
       (game_id, question, option_a, option_b, option_c, option_d, correct_answer, time_limit) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        gameId,
        question.question,
        question.optionA,
        question.optionB,
        question.optionC,
        question.optionD,
        question.correctAnswer,
        question.timeLimit || null
      ]
    );
    await this.updateGameTimestamp(gameId);
    return this.db.getLastInsertId();
  }

  async updateQuizQuestion(question: QuizQuestion): Promise<void> {
    await this.db.run(
      `UPDATE quiz_questions SET 
       question = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, 
       correct_answer = ?, time_limit = ? 
       WHERE id = ?`,
      [
        question.question,
        question.optionA,
        question.optionB,
        question.optionC,
        question.optionD,
        question.correctAnswer,
        question.timeLimit || null,
        question.id
      ]
    );
  }

  async deleteQuizQuestion(questionId: number): Promise<void> {
    await this.db.run('DELETE FROM quiz_questions WHERE id = ?', [questionId]);
  }

  // Wheel methods
  async addWheelSegment(gameId: number, segment: WheelSegment): Promise<number> {
    await this.db.run(
      'INSERT INTO wheel_segments (game_id, label, color, value, action) VALUES (?, ?, ?, ?, ?)',
      [gameId, segment.label, segment.color, segment.value || null, segment.action || null]
    );
    await this.updateGameTimestamp(gameId);
    return this.db.getLastInsertId();
  }

  async updateWheelSegment(segment: WheelSegment): Promise<void> {
    await this.db.run(
      'UPDATE wheel_segments SET label = ?, color = ?, value = ?, action = ? WHERE id = ?',
      [segment.label, segment.color, segment.value || null, segment.action || null, segment.id]
    );
  }

  async deleteWheelSegment(segmentId: number): Promise<void> {
    await this.db.run('DELETE FROM wheel_segments WHERE id = ?', [segmentId]);
  }

  private async updateGameTimestamp(gameId: number): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run('UPDATE games SET updated_at = ? WHERE id = ?', [now, gameId]);
  }
}
