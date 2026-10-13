// IndexedDB wrapper for local ROM storage
const DB_NAME = 'RetroArchWeb';
const DB_VERSION = 1;
const STORE_NAME = 'roms';

export interface LocalROM {
  id: string;
  title: string;
  system: string;
  fileName: string;
  fileData: ArrayBuffer;
  fileSize: number;
  createdAt: Date;
  lastPlayed?: Date;
  isFavorite: boolean;
}

class LocalStorageDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          objectStore.createIndex('system', 'system', { unique: false });
          objectStore.createIndex('createdAt', 'createdAt', { unique: false });
          objectStore.createIndex('lastPlayed', 'lastPlayed', { unique: false });
          objectStore.createIndex('isFavorite', 'isFavorite', { unique: false });
        }
      };
    });
  }

  async addROM(rom: LocalROM): Promise<void> {
    if (!this.db) await this.init();

    const existing = await this.getAllROMs();
    const duplicate = existing.find(
      (r) =>
        r.id === rom.id ||
        r.fileName.toLowerCase() === rom.fileName.toLowerCase() ||
        r.title.toLowerCase().trim() === rom.title.toLowerCase().trim()
    );

    const targetId = duplicate ? duplicate.id : rom.id;
    const finalRom = { ...rom, id: targetId };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(finalRom);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllROMs(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllROMs(): Promise<LocalROM[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getROMById(id: string): Promise<LocalROM | undefined> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteROM(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateROM(id: string, updates: Partial<LocalROM>): Promise<void> {
    if (!this.db) await this.init();

    const rom = await this.getROMById(id);
    if (!rom) throw new Error('ROM not found');

    const updatedROM = { ...rom, ...updates };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(updatedROM);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async toggleFavorite(id: string): Promise<boolean> {
    try {
      if (!this.db) await this.init();
      const rom = await this.getROMById(id);
      if (!rom) return false;
      const newFavorite = !rom.isFavorite;
      await this.updateROM(id, { isFavorite: newFavorite });
      return newFavorite;
    } catch (e) {
      console.warn('Failed to toggle favorite in localDB:', e);
      return false;
    }
  }

  async updateLastPlayed(id: string): Promise<void> {
    try {
      await this.updateROM(id, { lastPlayed: new Date() });
    } catch (e) {
      console.warn('Failed to update last played in localDB:', e);
    }
  }

  async getFavorites(): Promise<LocalROM[]> {
    const allROMs = await this.getAllROMs();
    return allROMs.filter(rom => rom.isFavorite);
  }

  async getRecentlyPlayed(limit: number = 10): Promise<LocalROM[]> {
    const allROMs = await this.getAllROMs();
    return allROMs
      .filter(rom => rom.lastPlayed)
      .sort((a, b) => (b.lastPlayed?.getTime() || 0) - (a.lastPlayed?.getTime() || 0))
      .slice(0, limit);
  }

  async getStorageUsage(): Promise<{ used: number; available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0,
      };
    }
    return { used: 0, available: 0 };
  }
}

export const localDB = new LocalStorageDB();
