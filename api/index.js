import express from 'express';
import { createServer } from 'http';
import { storage, DEFAULT_GAME_IDS } from '../server/storage.js';
import multer from 'multer';
import path from 'path';
import { insertGameSchema, insertSettingsSchema } from '../shared/schema.js';
import { put, del, list } from '@vercel/blob';
import { randomUUID } from 'crypto';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Global CORS Middleware for Vercel
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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

// Google reCAPTCHA v3 verification helper
async function verifyRecaptcha(token, remoteIp) {
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
  } catch (err) {
    console.error('reCAPTCHA siteverify error:', err);
    return { success: false, error: 'reCAPTCHA service communication error' };
  }
}

// reCAPTCHA configuration & verification routes
app.get("/api/recaptcha/site-key", (req, res) => {
  const siteKey = process.env.VITE_RECAPTCHA_SITE_KEY || process.env.RECAPTCHA_SITE_KEY || '';
  const isEnabled = Boolean(process.env.RECAPTCHA_SECRET_KEY && process.env.RECAPTCHA_SECRET_KEY !== 'test');
  res.json({ siteKey, isEnabled, isDemo: !isEnabled });
});

app.post("/api/recaptcha/verify", async (req, res) => {
  try {
    const { token } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    const result = await verifyRecaptcha(token, clientIp);
    if (!result.success) {
      return res.status(403).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Verification error' });
  }
});

// Cloudflare exterior pipeline & stream WHIP routes (Guarded by reCAPTCHA v3)
app.post("/api/stream/whip-session", async (req, res) => {
  try {
    const { userId, username, gameTitle, recaptchaToken } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;

    // Verify reCAPTCHA token against bot abuse
    const recaptchaResult = await verifyRecaptcha(recaptchaToken, clientIp);
    if (!recaptchaResult.success) {
      return res.status(403).json({
        error: 'reCAPTCHA verification failed. Bot detected.',
        details: recaptchaResult.details || recaptchaResult.error
      });
    }

    const workerUrl = process.env.CLOUDFLARE_WORKER_URL;
    if (workerUrl) {
      // Forward to exterior Cloudflare pipeline
      try {
        const workerRes = await fetch(`${workerUrl.replace(/\/$/, '')}/api/stream/whip-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body),
        });
        const data = await workerRes.json();
        return res.status(workerRes.status).json(data);
      } catch (proxyErr) {
        console.warn('[Pipeline] Exterior Cloudflare Worker unreachable, using fallback:', proxyErr);
      }
    }

    // Default arcade simulation response
    res.json({
      success: true,
      mode: 'arcade_mesh_simulated',
      whipUrl: `/api/stream/simulated-whip`,
      twitchChannel: process.env.TWITCH_CHANNEL_NAME || 'NeonArcadeLive',
      message: 'Running in Arcade Arena Mode with client canvas relay and queue management',
      isSimulation: true,
      recaptchaScore: recaptchaResult.score,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to provision stream session' });
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

    const { title, system, sessionId, recaptchaToken } = req.body;

    if (!title || !system) {
      return res.status(400).json({ error: 'Title and system are required' });
    }

    // Verify reCAPTCHA token against bot abuse
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    const recaptchaResult = await verifyRecaptcha(recaptchaToken, clientIp);
    if (!recaptchaResult.success) {
      return res.status(403).json({
        error: 'reCAPTCHA verification failed. Bot detected.',
        details: recaptchaResult.details || recaptchaResult.error
      });
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
    if (req.params.id.startsWith('local_')) {
      return res.json({ id: req.params.id, isFavorite: true });
    }
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
    if (req.params.id.startsWith('local_')) {
      return res.json({ id: req.params.id, lastPlayed: new Date() });
    }
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
    if (req.params.id.startsWith('local_')) {
      return res.json({ success: true });
    }
    if (DEFAULT_GAME_IDS && DEFAULT_GAME_IDS.has(req.params.id)) {
      return res.status(403).json({ error: 'Built-in arcade games cannot be deleted' });
    }
    const deleted = await storage.deleteGame(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Game not found or protected' });
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

    // Redirect to Blob URL or public static path with CORS
    res.header('Access-Control-Allow-Origin', '*');
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
