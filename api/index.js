import express from 'express';
import { createServer } from 'http';
import { storage } from '../server/storage.js';
import multer from 'multer';
import path from 'path';
import { insertGameSchema, insertSettingsSchema } from '../shared/schema.js';
import { put, del, list } from '@vercel/blob';
import { randomUUID } from 'crypto';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Check if running on Vercel
const isVercel = process.env.VERCEL === '1';

// Configure multer to use memory storage for Vercel
const upload = multer({
  storage: multer.memoryStorage(),
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
      games = await storage.getGamesBySystem(system);
    } else {
      games = await storage.getAllGames();
    }

    res.json(games);
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ error: 'Failed to fetch games', message: error.message });
  }
});

app.post("/api/games/upload", upload.single('rom'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, system, sessionId } = req.body;

    if (!title || !system) {
      return res.status(400).json({ error: 'Title and system are required' });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Use sessionId if provided, otherwise use 'temp' folder
    const folder = sessionId || 'temp';
    const filename = `roms/${folder}/${uniqueSuffix}${path.extname(req.file.originalname)}`;

    const blob = await put(filename, req.file.buffer, {
      access: 'public',
      addRandomSuffix: false,
    });

    const gameData = {
      title,
      system,
      romFileName: req.file.originalname,
      romFilePath: blob.url,
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
    res.status(500).json({ error: 'Failed to upload game', message: error.message });
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
    console.error('Toggle favorite error:', error);
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
    console.error('Update last played error:', error);
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
    console.error('Delete game error:', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

app.get("/api/settings", async (req, res) => {
  try {
    const settings = await storage.getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.patch("/api/settings", async (req, res) => {
  try {
    const validatedData = insertSettingsSchema.partial().parse(req.body);
    const settings = await storage.updateSettings(validatedData);
    res.json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

app.get("/api/roms/:gameId", async (req, res) => {
  try {
    const game = await storage.getGameById(req.params.gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Redirect to Blob URL
    res.redirect(game.romFilePath);
  } catch (error) {
    console.error('ROM serving error:', error);
    res.status(500).json({ error: 'Failed to serve ROM file' });
  }
});

// Cleanup session ROMs
app.post("/api/cleanup", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // List all blobs for this session
    const { blobs } = await list({ prefix: `roms/${sessionId}/` });

    // Delete all blobs for this session
    const deletePromises = blobs.map(blob => del(blob.url));
    await Promise.all(deletePromises);

    res.json({ success: true, deletedCount: blobs.length });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup session', message: error.message });
  }
});

export default app;
