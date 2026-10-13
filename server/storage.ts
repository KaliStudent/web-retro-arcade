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

export const DEFAULT_GAMES: Array<Omit<Game, "createdAt">> = [
  {
    id: "nes-invaders",
    title: "Space Invaders Deluxe",
    system: "NES",
    romFileName: "invaders.nes",
    romFilePath: "/roms/invaders.nes",
    fileSize: 32784,
    coverImage: "/covers/invaders.png",
    isFavorite: true,
    lastPlayed: new Date(Date.now() - 3600000),
  },
  {
    id: "nes-flappybird",
    title: "Flappy Bird 8-Bit",
    system: "NES",
    romFileName: "flappybird.nes",
    romFilePath: "/roms/flappybird.nes",
    fileSize: 24592,
    coverImage: "/covers/flappybird.png",
    isFavorite: true,
    lastPlayed: new Date(Date.now() - 7200000),
  },
  {
    id: "nes-driar",
    title: "Driar Arcade Adventure",
    system: "NES",
    romFileName: "driar.nes",
    romFilePath: "/roms/driar.nes",
    fileSize: 131088,
    coverImage: "/covers/driar.png",
    isFavorite: false,
    lastPlayed: null,
  },
  {
    id: "nes-blaster",
    title: "Blaster Master Retro",
    system: "NES",
    romFileName: "blaster.nes",
    romFilePath: "/roms/blaster.nes",
    fileSize: 24592,
    coverImage: "/covers/blaster.png",
    isFavorite: false,
    lastPlayed: null,
  },
  {
    id: "nes-bombarray",
    title: "Bomb Array Strategy",
    system: "NES",
    romFileName: "bombarray.nes",
    romFilePath: "/roms/bombarray.nes",
    fileSize: 16400,
    coverImage: "/covers/bombarray.png",
    isFavorite: false,
    lastPlayed: null,
  },
  {
    id: "nes-babelblox",
    title: "Babel Blox Puzzle",
    system: "NES",
    romFileName: "babelblox.nes",
    romFilePath: "/roms/babelblox.nes",
    fileSize: 524304,
    coverImage: "/covers/babelblox.png",
    isFavorite: false,
    lastPlayed: null,
  },
  {
    id: "snes-astrohawk",
    title: "Astro Hawk 16-Bit",
    system: "SNES",
    romFileName: "astrohawk.smc",
    romFilePath: "/roms/astrohawk.smc",
    fileSize: 786944,
    coverImage: "/covers/astrohawk.png",
    isFavorite: true,
    lastPlayed: new Date(Date.now() - 14400000),
  },
  {
    id: "gba-anguna",
    title: "Anguna: Demonic Lord",
    system: "GBA",
    romFileName: "anguna.gba",
    romFilePath: "/roms/anguna.gba",
    fileSize: 1710888,
    coverImage: "/covers/anguna.png",
    isFavorite: true,
    lastPlayed: null,
  },
  {
    id: "gba-asteroidsb",
    title: "Asteroids 32-Bit Enhanced",
    system: "GBA",
    romFileName: "asteroidsb.gba",
    romFilePath: "/roms/asteroidsb.gba",
    fileSize: 80240,
    coverImage: "/covers/asteroidsb.png",
    isFavorite: false,
    lastPlayed: null,
  },
  {
    id: "genesis-barbarian",
    title: "Barbarian Arcade Action",
    system: "Genesis",
    romFileName: "barbarian.bin",
    romFilePath: "/roms/barbarian.bin",
    fileSize: 2296122,
    coverImage: "/covers/barbarian.png",
    isFavorite: false,
    lastPlayed: null,
  },
];

export const DEFAULT_GAME_IDS = new Set(DEFAULT_GAMES.map(g => g.id));

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

    // Seed built-in homebrew & public domain classic retro games
    this.ensureDefaultGames();
  }

  public ensureDefaultGames() {
    for (const g of DEFAULT_GAMES) {
      if (!this.games.has(g.id)) {
        this.games.set(g.id, {
          ...g,
          createdAt: new Date(),
        });
      }
    }
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
    this.ensureDefaultGames();
    return Array.from(this.games.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getGameById(id: string): Promise<Game | undefined> {
    this.ensureDefaultGames();
    const direct = this.games.get(id);
    if (direct) return direct;

    // Resilient fallback: search by id, romFileName, or title match
    const normalized = id.toLowerCase().replace(/[^a-z0-9]/g, '');
    return Array.from(this.games.values()).find((g) => {
      if (g.id === id) return true;
      if (g.romFileName.toLowerCase() === id.toLowerCase()) return true;
      if (g.romFilePath.toLowerCase().includes(id.toLowerCase())) return true;
      const gameNorm = g.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      return gameNorm.includes(normalized) || normalized.includes(gameNorm);
    });
  }

  async getGamesBySystem(system: string): Promise<Game[]> {
    this.ensureDefaultGames();
    return Array.from(this.games.values())
      .filter(game => game.system === system)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getFavoriteGames(): Promise<Game[]> {
    this.ensureDefaultGames();
    return Array.from(this.games.values())
      .filter(game => game.isFavorite)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getRecentGames(limit: number = 10): Promise<Game[]> {
    this.ensureDefaultGames();
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
    if (DEFAULT_GAME_IDS.has(id)) {
      // Protected built-in games can never be deleted
      return false;
    }
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
