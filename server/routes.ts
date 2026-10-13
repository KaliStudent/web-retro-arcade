import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, DEFAULT_GAME_IDS } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
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

// Google reCAPTCHA v3 verification helper
async function verifyRecaptcha(token?: string, remoteIp?: string): Promise<{ success: boolean; score?: number; action?: string; isDemo?: boolean; error?: string; details?: any }> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  // In test/demo mode or if RECAPTCHA_SECRET_KEY is not configured, bypass verification
  if (!secretKey || secretKey === 'test' || secretKey === 'demo' || secretKey === 'mock') {
    return { success: true, score: 1.0, isDemo: true };
  }

  if (!token) {
    return { success: false, error: 'Missing reCAPTCHA token' };
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', secretKey);
    params.append('response', token);
    if (remoteIp) {
      params.append('remoteip', remoteIp);
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();
    if (!data.success) {
      return {
        success: false,
        error: 'reCAPTCHA verification failed',
        details: data['error-codes'] || []
      };
    }

    const minScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE || '0.5');
    if (typeof data.score === 'number' && data.score < minScore) {
      return {
        success: false,
        score: data.score,
        error: `Bot score ${data.score} below threshold ${minScore}`
      };
    }

    return { success: true, score: data.score, action: data.action };
  } catch (err: any) {
    console.error('reCAPTCHA siteverify error:', err);
    return { success: false, error: 'reCAPTCHA service communication error' };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // reCAPTCHA configuration & verification routes
  app.get("/api/recaptcha/site-key", (req, res) => {
    const siteKey = process.env.VITE_RECAPTCHA_SITE_KEY || process.env.RECAPTCHA_SITE_KEY || '';
    const isEnabled = Boolean(process.env.RECAPTCHA_SECRET_KEY && process.env.RECAPTCHA_SECRET_KEY !== 'test');
    res.json({ siteKey, isEnabled, isDemo: !isEnabled });
  });

  app.post("/api/recaptcha/verify", async (req, res) => {
    try {
      const { token } = req.body;
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
      const result = await verifyRecaptcha(token, clientIp);
      if (!result.success) {
        return res.status(403).json(result);
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Verification error' });
    }
  });
  
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

      const { title, system, recaptchaToken } = req.body;

      if (!title || !system) {
        return res.status(400).json({ error: 'Title and system are required' });
      }

      // Verify reCAPTCHA token against bot abuse
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
      const recaptchaResult = await verifyRecaptcha(recaptchaToken, clientIp);
      if (!recaptchaResult.success) {
        return res.status(403).json({
          error: 'reCAPTCHA verification failed. Bot detected.',
          details: recaptchaResult.details || recaptchaResult.error
        });
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
      if (req.params.id.startsWith('local_')) {
        return res.json({ id: req.params.id, isFavorite: true });
      }
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
      if (req.params.id.startsWith('local_')) {
        return res.json({ id: req.params.id, lastPlayed: new Date() });
      }
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
      if (req.params.id.startsWith('local_')) {
        return res.json({ success: true });
      }
      if (DEFAULT_GAME_IDS.has(req.params.id)) {
        return res.status(403).json({ error: 'Built-in arcade games cannot be deleted' });
      }
      const deleted = await storage.deleteGame(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Game not found or protected' });
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

      // If it's a remote URL (Vercel Blob or external), redirect to it
      if (game.romFilePath.startsWith('http://') || game.romFilePath.startsWith('https://')) {
        return res.redirect(game.romFilePath);
      }

      // If it's a seeded public ROM (e.g., /roms/invaders.nes)
      if (game.romFilePath.startsWith('/roms/')) {
        const publicPath = path.resolve(process.cwd(), 'client', 'public', game.romFilePath.replace(/^\//, ''));
        if (fs.existsSync(publicPath)) {
          return res.sendFile(publicPath);
        }
        return res.redirect(game.romFilePath);
      }

      // Otherwise, serve from local file system (development uploads)
      const filePath = path.resolve(game.romFilePath);
      const uploadsDir = path.resolve(process.cwd(), 'uploads', 'roms');
      if (filePath.startsWith(uploadsDir) && fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }

      // Fallback: check client/public
      const fallbackPublic = path.resolve(process.cwd(), 'client', 'public', game.romFileName);
      if (fs.existsSync(fallbackPublic)) {
        return res.sendFile(fallbackPublic);
      }

      return res.status(404).json({ error: 'ROM file not found on disk' });
    } catch (error) {
      console.error('ROM serving error:', error);
      res.status(500).json({ error: 'Failed to serve ROM file' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
