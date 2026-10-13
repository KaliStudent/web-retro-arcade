import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Heart, Trash2, Tv } from "lucide-react";
import { useState, useEffect } from "react";

interface GameCardProps {
  id: string;
  title: string;
  system: string;
  coverImage?: string;
  lastPlayed?: string;
  isFavorite?: boolean;
  onPlay?: () => void;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
}

const SYSTEM_COLORS: Record<string, string> = {
  'NES': 'border-[#00f0ff]/40 text-[#00f0ff] bg-[#00f0ff]/10',
  'SNES': 'border-[#ff7700]/40 text-[#ff7700] bg-[#ff7700]/10',
  'GBA': 'border-[#39ff14]/40 text-[#39ff14] bg-[#39ff14]/10',
  'Game Boy': 'border-[#39ff14]/40 text-[#39ff14] bg-[#39ff14]/10',
  'Genesis': 'border-[#ff007f]/40 text-[#ff00aa] bg-[#ff007f]/10',
  'N64': 'border-[#ffe600]/40 text-[#ffe600] bg-[#ffe600]/10',
};

export function GameCard({
  id,
  title,
  system,
  coverImage,
  lastPlayed,
  isFavorite: initialFavorite,
  onPlay,
  onToggleFavorite,
  onDelete,
}: GameCardProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setIsFavorite(initialFavorite);
  }, [initialFavorite]);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    onToggleFavorite?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  const badgeStyle = SYSTEM_COLORS[system] || 'border-[#00f0ff]/40 text-[#00f0ff] bg-[#00f0ff]/10';

  return (
    <Card
      className="group overflow-hidden cursor-pointer relative bg-[#0a0e22] border border-[#00f0ff]/20 hover:border-[#00f0ff] hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all duration-300 rounded-xl flex flex-col justify-between"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onPlay}
      data-testid={`card-game-${id}`}
    >
      <div className="aspect-[3/4] relative bg-[#060814] overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0c1330] to-[#1a0f2b]">
            <span className="text-5xl font-display font-extrabold text-[#00f0ff]/30">
              {title.charAt(0)}
            </span>
            <span className="text-[10px] font-mono text-cyan-300/40 uppercase mt-2">
              RETRO CLASSIC
            </span>
          </div>
        )}

        {/* Hover overlay with Play button */}
        <div
          className={`absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-2 transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <Button
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              onPlay?.();
            }}
            data-testid={`button-play-${id}`}
            className="font-display font-bold uppercase tracking-wider text-black bg-[#00f0ff] hover:bg-[#00c9d6] shadow-[0_0_25px_rgba(0,240,255,0.8)] gap-2 px-6"
          >
            <Play className="h-5 w-5 fill-current" />
            Play
          </Button>
          <span className="text-[10px] font-mono text-[#ff7700] uppercase font-bold tracking-wider">
            Solo or Twitch Live
          </span>
        </div>

        {/* Top actions (Heart & Delete) */}
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          <Button
            size="icon"
            variant="secondary"
            className={`h-7 w-7 bg-black/70 border border-white/10 hover:bg-black/90 ${
              isFavorite ? "text-[#ff007f]" : "text-white/70"
            }`}
            onClick={handleToggleFavorite}
            data-testid={`button-favorite-${id}`}
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-current" : ""}`} />
          </Button>
          {onDelete && (
            <Button
              size="icon"
              variant="secondary"
              className="h-7 w-7 bg-black/70 border border-white/10 hover:bg-red-950/80 hover:text-red-400 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleDelete}
              data-testid={`button-delete-${id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Card Info Footer */}
      <div className="p-3 bg-[#0a0e22] border-t border-[#00f0ff]/10">
        <h3
          className="font-bold text-sm text-white truncate group-hover:text-[#00f0ff] transition-colors"
          data-testid={`text-title-${id}`}
        >
          {title}
        </h3>
        <div className="flex items-center justify-between mt-2 font-mono text-xs">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${badgeStyle}`}>
            {system}
          </span>
          {lastPlayed && (
            <span className="text-[10px] text-cyan-200/50">{lastPlayed}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
