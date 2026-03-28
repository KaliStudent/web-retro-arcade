import { type User, type InsertUser, type Game, type InsertGame, type Settings, type InsertSettings } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Game methods
  getAllGames(): Promise<Game[]>;
  getGameById(id: string): Promise<Game | undefined>;
  getGamesBySystem(system: string): Promise<Game[]>;
  getFavoriteGames(): Promise<Game[]>;
  getRecentGames(limit?: number): Promise<Game[]>;
  createGame(game: InsertGame): Promise<Game>;
  updateGame(id: string, updates: Partial<InsertGame>): Promise<Game | undefined>;
  deleteGame(id: string): Promise<boolean>;
  toggleFavorite(id: string): Promise<Game | undefined>;
  updateLastPlayed(id: string): Promise<Game | undefined>;
  
  // Settings methods
  getSettings(): Promise<Settings>;
  updateSettings(updates: Partial<InsertSettings>): Promise<Settings>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private games: Map<string, Game>;
  private settings: Settings;

  constructor() {
    this.users = new Map();
    this.games = new Map();
    this.settings = {
      id: randomUUID(),
      resolution: 'native',
      crtFilter: true,
      scanlines: false,
      aspectRatio: '4:3',
      volume: 75,
      audioSync: true,
      audioLatency: 'low',
      gamepadSupport: true,
      autoSave: true,
      fastForward: false,
      saveLocation: '/saves',
      updatedAt: new Date(),
    };
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Game methods
  async getAllGames(): Promise<Game[]> {
    return Array.from(this.games.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getGameById(id: string): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async getGamesBySystem(system: string): Promise<Game[]> {
    return Array.from(this.games.values())
      .filter(game => game.system === system)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getFavoriteGames(): Promise<Game[]> {
    return Array.from(this.games.values())
      .filter(game => game.isFavorite)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getRecentGames(limit: number = 10): Promise<Game[]> {
    return Array.from(this.games.values())
      .filter(game => game.lastPlayed)
      .sort((a, b) => {
        if (!a.lastPlayed || !b.lastPlayed) return 0;
        return b.lastPlayed.getTime() - a.lastPlayed.getTime();
      })
      .slice(0, limit);
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = randomUUID();
    const game: Game = {
      ...insertGame,
      id,
      coverImage: insertGame.coverImage ?? null,
      isFavorite: insertGame.isFavorite ?? false,
      lastPlayed: insertGame.lastPlayed ?? null,
      createdAt: new Date(),
    };
    this.games.set(id, game);
    return game;
  }

  async updateGame(id: string, updates: Partial<InsertGame>): Promise<Game | undefined> {
    const game = this.games.get(id);
    if (!game) return undefined;
    
    const updatedGame = { ...game, ...updates };
    this.games.set(id, updatedGame);
    return updatedGame;
  }

  async deleteGame(id: string): Promise<boolean> {
    return this.games.delete(id);
  }

  async toggleFavorite(id: string): Promise<Game | undefined> {
    const game = this.games.get(id);
    if (!game) return undefined;
    
    const updatedGame = { ...game, isFavorite: !game.isFavorite };
    this.games.set(id, updatedGame);
    return updatedGame;
  }

  async updateLastPlayed(id: string): Promise<Game | undefined> {
    const game = this.games.get(id);
    if (!game) return undefined;
    
    const updatedGame = { ...game, lastPlayed: new Date() };
    this.games.set(id, updatedGame);
    return updatedGame;
  }

  // Settings methods
  async getSettings(): Promise<Settings> {
    return this.settings;
  }

  async updateSettings(updates: Partial<InsertSettings>): Promise<Settings> {
    this.settings = {
      ...this.settings,
      ...updates,
      updatedAt: new Date(),
    };
    return this.settings;
  }
}

export const storage = new MemStorage();
