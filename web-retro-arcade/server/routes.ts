import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import { insertGameSchema, insertSettingsSchema } from "@shared/schema";
import { put } from "@vercel/blob";

// Check if running on Vercel
const isVercel = process.env.VERCEL === '1';

// Configure multer for ROM file uploads
// In production (Vercel), use memory storage
// In development, use disk storage
const uploadStorage = isVercel
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, 'uploads/roms');
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      }
    });

const upload = multer({
  storage: uploadStorage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.nes', '.smc', '.sfc', '.gb', '.gbc', '.gba', '.bin', '.md', '.gen', '.z64', '.n64', '.iso'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Game routes
  app.get("/api/games", async (req, res) => {
    try {
      const { system, favorites, recent } = req.query;
      
      let games;
      if (favorites === 'true') {
        games = await storage.getFavoriteGames();
      } else if (recent === 'true') {
        games = await storage.getRecentGames(10);
      } else if (system) {
        games = await storage.getGamesBySystem(system as string);
      } else {
        games = await storage.getAllGames();
      }
      
      res.json(games);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch games' });
    }
  });

  app.get("/api/games/:id", async (req, res) => {
    try {
      const game = await storage.getGameById(req.params.id);
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }
      res.json(game);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch game' });
    }
  });

  app.post("/api/games/upload", upload.single('rom'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { title, system } = req.body;

      if (!title || !system) {
        return res.status(400).json({ error: 'Title and system are required' });
      }

      let romFilePath: string;

      // Upload to Vercel Blob in production, local file system in development
      if (isVercel) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `roms/${uniqueSuffix}${path.extname(req.file.originalname)}`;

        const blob = await put(filename, req.file.buffer, {
          access: 'public',
          addRandomSuffix: false,
        });

        romFilePath = blob.url;
      } else {
        romFilePath = req.file.path;
      }

      const gameData = {
        title,
        system,
        romFileName: req.file.originalname,
        romFilePath,
        fileSize: req.file.size,
        isFavorite: false,
        coverImage: null,
        lastPlayed: null,
      };

      const validatedData = insertGameSchema.parse(gameData);
      const game = await storage.createGame(validatedData);

      res.json(game);
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload game' });
    }
  });

  app.patch("/api/games/:id/favorite", async (req, res) => {
    try {
      const game = await storage.toggleFavorite(req.params.id);
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }
      res.json(game);
    } catch (error) {
      res.status(500).json({ error: 'Failed to toggle favorite' });
    }
  });

  app.patch("/api/games/:id/play", async (req, res) => {
    try {
      const game = await storage.updateLastPlayed(req.params.id);
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }
      res.json(game);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update last played' });
    }
  });

  app.delete("/api/games/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteGame(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Game not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete game' });
    }
  });

  // Settings routes
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.patch("/api/settings", async (req, res) => {
    try {
      const validatedData = insertSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateSettings(validatedData);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // Serve ROM files securely
  app.get("/api/roms/:gameId", async (req, res) => {
    try {
      const game = await storage.getGameById(req.params.gameId);
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      // If it's a Vercel Blob URL (starts with https://), redirect to it
      if (game.romFilePath.startsWith('https://')) {
        return res.redirect(game.romFilePath);
      }

      // Otherwise, serve from local file system (development mode)
      const filePath = path.resolve(game.romFilePath);

      // Additional security check: ensure the resolved path is within uploads directory
      const uploadsDir = path.resolve(process.cwd(), 'uploads', 'roms');
      if (!filePath.startsWith(uploadsDir)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.sendFile(filePath);
    } catch (error) {
      console.error('ROM serving error:', error);
      res.status(500).json({ error: 'Failed to serve ROM file' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
