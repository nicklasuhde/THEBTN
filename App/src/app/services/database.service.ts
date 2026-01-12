import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private readonly DB_NAME = 'thebtn_games';
  private initialized = false;
  private platform: string;
  private isWeb = false;
  
  // LocalStorage key for web development
  private readonly WEB_STORAGE_KEY = 'thebtn_games_db';

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.platform = Capacitor.getPlatform();
    this.isWeb = this.platform === 'web';
  }

  // Web storage using localStorage for persistence
  private getWebStorage(): Record<string, any[]> {
    if (!this.isWeb) return {};
    const stored = localStorage.getItem(this.WEB_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return this.initializeWebStorageData();
  }

  private saveWebStorage(data: Record<string, any[]>): void {
    if (!this.isWeb) return;
    localStorage.setItem(this.WEB_STORAGE_KEY, JSON.stringify(data));
  }

  private initializeWebStorageData(): Record<string, any[]> {
    const data = {
      games: [],
      categories: [],
      category_questions: [],
      quiz_questions: [],
      wheel_segments: []
    };
    this.saveWebStorage(data);
    return data;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.isWeb) {
      // Use in-memory storage for web development
      console.log('📱 Web platform detected - using in-memory storage for development');
      console.log('   Database features will work fully on Android/iOS devices');
      this.initializeWebStorage();
      this.initialized = true;
      return;
    }

    try {
      const ret = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection(this.DB_NAME, false)).result;

      if (ret.result && isConn) {
        this.db = await this.sqlite.retrieveConnection(this.DB_NAME, false);
      } else {
        this.db = await this.sqlite.createConnection(
          this.DB_NAME,
          false,
          'no-encryption',
          1,
          false
        );
      }

      await this.db.open();
      await this.createTables();
      this.initialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  private initializeWebStorage(): void {
    // Just ensure localStorage is initialized
    this.getWebStorage();
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const createTablesSQL = `
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS category_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        points INTEGER NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS quiz_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        question TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        time_limit INTEGER,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS wheel_segments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        label TEXT NOT NULL,
        color TEXT NOT NULL,
        value INTEGER,
        action TEXT,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
      );
    `;

    await this.db.execute(createTablesSQL, false);
  }

  async execute(sql: string, transaction?: boolean): Promise<any> {
    if (this.isWeb) {
      return { changes: { changes: 0 } };
    }
    if (!this.db) {
      await this.initialize();
    }
    return this.db!.execute(sql, transaction);
  }

  async run(sql: string, values?: any[]): Promise<any> {
    if (this.isWeb) {
      return this.runWeb(sql, values);
    }
    if (!this.db) {
      await this.initialize();
    }
    return this.db!.run(sql, values, false);
  }

  async query(sql: string, values?: any[]): Promise<any> {
    if (this.isWeb) {
      return this.queryWeb(sql, values);
    }
    if (!this.db) {
      await this.initialize();
    }
    return this.db!.query(sql, values);
  }

  async getLastInsertId(): Promise<number> {
    if (this.isWeb) {
      return this.webLastInsertId;
    }
    const result = await this.query('SELECT last_insert_rowid() as id');
    return result.values?.[0]?.id || 0;
  }

  // Web storage helpers
  private webLastInsertId = 0;

  private runWeb(sql: string, values?: any[]): any {
    const lowerSql = sql.toLowerCase().trim();
    const storage = this.getWebStorage();
    
    if (lowerSql.startsWith('insert into')) {
      const table = this.extractTableName(sql, 'insert into');
      const data = storage[table] || [];
      // Generate unique ID based on max existing ID
      this.webLastInsertId = data.length > 0 
        ? Math.max(...data.map((r: any) => r.id || 0)) + 1 
        : 1;
      const newRow = this.createRowFromInsert(sql, values, this.webLastInsertId);
      data.push(newRow);
      storage[table] = data;
      this.saveWebStorage(storage);
      return { changes: { changes: 1, lastId: this.webLastInsertId } };
    }
    
    if (lowerSql.startsWith('update')) {
      const table = this.extractTableName(sql, 'update');
      const data = storage[table] || [];
      const id = values?.[values.length - 1];
      const index = data.findIndex((r: any) => r.id === id);
      if (index >= 0) {
        this.updateRowFromUpdate(data[index], sql, values);
        storage[table] = data;
        this.saveWebStorage(storage);
      }
      return { changes: { changes: index >= 0 ? 1 : 0 } };
    }
    
    if (lowerSql.startsWith('delete from')) {
      const table = this.extractTableName(sql, 'delete from');
      const data = storage[table] || [];
      const id = values?.[0];
      const newData = data.filter((r: any) => r.id !== id);
      storage[table] = newData;
      this.saveWebStorage(storage);
      return { changes: { changes: data.length - newData.length } };
    }
    
    return { changes: { changes: 0 } };
  }

  private queryWeb(sql: string, values?: any[]): any {
    const lowerSql = sql.toLowerCase().trim();
    
    if (lowerSql.includes('last_insert_rowid')) {
      return { values: [{ id: this.webLastInsertId }] };
    }
    
    const fromMatch = lowerSql.match(/from\s+(\w+)/);
    if (!fromMatch) return { values: [] };
    
    const storage = this.getWebStorage();
    const table = fromMatch[1];
    let data = [...(storage[table] || [])];
    
    // Simple WHERE clause handling - use snake_case field names
    if (lowerSql.includes('where') && values?.length) {
      const whereMatch = lowerSql.match(/where\s+(\w+)\s*=\s*\?/);
      if (whereMatch) {
        const field = whereMatch[1]; // Keep snake_case
        data = data.filter((r: any) => r[field] === values[0]);
      }
    }
    
    // Simple ORDER BY handling - use snake_case field names
    if (lowerSql.includes('order by')) {
      const orderMatch = lowerSql.match(/order by\s+(\w+)(?:\s+(asc|desc))?/);
      if (orderMatch) {
        const field = orderMatch[1]; // Keep snake_case
        const desc = orderMatch[2] === 'desc';
        data.sort((a: any, b: any) => {
          const aVal = a[field] ?? '';
          const bVal = b[field] ?? '';
          if (desc) return bVal > aVal ? 1 : -1;
          return aVal > bVal ? 1 : -1;
        });
      }
    }
    
    return { values: data };
  }

  private extractTableName(sql: string, prefix: string): string {
    const regex = new RegExp(`${prefix}\\s+(\\w+)`, 'i');
    const match = sql.match(regex);
    return match ? match[1] : '';
  }

  private createRowFromInsert(sql: string, values?: any[], id?: number): any {
    const row: any = { id };
    const columnsMatch = sql.match(/\(([^)]+)\)\s*values/i);
    if (columnsMatch && values) {
      // Keep snake_case to match real SQLite behavior
      const columns = columnsMatch[1].split(',').map(c => c.trim());
      columns.forEach((col, i) => {
        if (values[i] !== undefined) {
          row[col] = values[i];
        }
      });
    }
    return row;
  }

  private updateRowFromUpdate(row: any, sql: string, values?: any[]): void {
    const setMatch = sql.match(/set\s+(.+)\s+where/i);
    if (setMatch && values) {
      const assignments = setMatch[1].split(',');
      assignments.forEach((assignment, i) => {
        const colMatch = assignment.match(/(\w+)\s*=/);
        if (colMatch && values[i] !== undefined) {
          // Keep snake_case to match real SQLite behavior
          const col = colMatch[1].trim();
          row[col] = values[i];
        }
      });
    }
  }
}
