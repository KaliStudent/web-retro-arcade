import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  system: text("system").notNull(),
  romFileName: text("rom_file_name").notNull(),
  romFilePath: text("rom_file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  coverImage: text("cover_image"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  lastPlayed: timestamp("last_played"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
});

export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resolution: text("resolution").notNull().default('native'),
  crtFilter: boolean("crt_filter").notNull().default(true),
  scanlines: boolean("scanlines").notNull().default(false),
  aspectRatio: text("aspect_ratio").notNull().default('4:3'),
  volume: integer("volume").notNull().default(75),
  audioSync: boolean("audio_sync").notNull().default(true),
  audioLatency: text("audio_latency").notNull().default('low'),
  gamepadSupport: boolean("gamepad_support").notNull().default(true),
  autoSave: boolean("auto_save").notNull().default(true),
  fastForward: boolean("fast_forward").notNull().default(false),
  saveLocation: text("save_location").notNull().default('/saves'),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;
