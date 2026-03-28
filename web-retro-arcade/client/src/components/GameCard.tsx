import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Heart, Trash2 } from "lucide-react";
import { useState } from "react";

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

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    onToggleFavorite?.();
    console.log('Toggle favorite:', title);
  };

  const handlePlay = () => {
    onPlay?.();
    console.log('Play game:', title);
  };

  const handleDelete = () => {
    onDelete?.();
    console.log('Delete game:', title);
  };

  return (
    <Card
      className="group overflow-hidden cursor-pointer hover-elevate active-elevate-2 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`card-game-${id}`}
    >
      <div className="aspect-[3/4] relative bg-muted">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <span className="text-4xl font-display font-bold text-muted-foreground/40">
              {title.charAt(0)}
            </span>
          </div>
        )}
        
        {isHovered && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center transition-opacity">
            <Button
              size="lg"
              onClick={handlePlay}
              data-testid={`button-play-${id}`}
              className="gap-2"
            >
              <Play className="h-5 w-5" />
              Play
            </Button>
          </div>
        )}

        <div className="absolute top-2 right-2 flex gap-1">
          <Button
            size="icon"
            variant="secondary"
            className={`h-8 w-8 ${isFavorite ? "text-chart-5" : ""}`}
            onClick={handleToggleFavorite}
            data-testid={`button-favorite-${id}`}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            onClick={handleDelete}
            data-testid={`button-delete-${id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-sm truncate" data-testid={`text-title-${id}`}>
          {title}
        </h3>
        <div className="flex items-center justify-between mt-2">
          <Badge variant="secondary" className="text-xs">
            {system}
          </Badge>
          {lastPlayed && (
            <span className="text-xs text-muted-foreground">{lastPlayed}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
