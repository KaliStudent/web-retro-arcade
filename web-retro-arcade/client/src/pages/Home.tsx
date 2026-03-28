import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Hero } from "@/components/Hero";
import { SystemCard } from "@/components/SystemCard";
import { GameCard } from "@/components/GameCard";
import { ROMUploadDialog } from "@/components/ROMUploadDialog";
import { EmulatorPlayer } from "@/components/EmulatorPlayer";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Gamepad2,
  Grid3x3,
  List,
  Search,
  Settings,
  Upload,
  Star,
  Clock,
  Play,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllGames, toggleFavorite, deleteGame, updateLastPlayed } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Game } from "@shared/schema";

const systems = [
  { id: 'nes', name: 'NES', formats: ['.nes'] },
  { id: 'snes', name: 'SNES', formats: ['.smc', '.sfc'] },
  { id: 'gb', name: 'Game Boy', formats: ['.gb', '.gbc'] },
  { id: 'gba', name: 'GBA', formats: ['.gba'] },
  { id: 'genesis', name: 'Genesis', formats: ['.md', '.bin'] },
  { id: 'n64', name: 'N64', formats: ['.z64', '.n64'] },
];

export default function Home() {
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [playingGame, setPlayingGame] = useState<Game | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const { data: games = [], isLoading } = useQuery({
    queryKey: ['/api/games'],
    queryFn: getAllGames,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: toggleFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      toast({ title: "Favorite updated" });
    },
  });

  const deleteGameMutation = useMutation({
    mutationFn: deleteGame,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      toast({ title: "Game deleted" });
    },
  });

  const updateLastPlayedMutation = useMutation({
    mutationFn: updateLastPlayed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
    },
  });

  const handlePlayGame = (game: Game) => {
    updateLastPlayedMutation.mutate(game.id);
    setPlayingGame(game);
  };

  const systemCounts = systems.map(system => ({
    ...system,
    romCount: games.filter(g => g.system === system.name).length,
  }));

  const filteredGames = games.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSystem = !selectedSystem || game.system === systems.find(s => s.id === selectedSystem)?.name;
    const matchesTab = 
      activeTab === 'all' ||
      (activeTab === 'favorites' && game.isFavorite) ||
      (activeTab === 'recent' && game.lastPlayed);
    return matchesSearch && matchesSystem && matchesTab;
  });

  const formatLastPlayed = (date: Date | null) => {
    if (!date) return undefined;
    const now = new Date();
    const played = new Date(date);
    const diffMs = now.getTime() - played.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  };

  if (playingGame) {
    return (
      <div className="min-h-screen h-screen bg-background flex flex-col overflow-hidden">
        <header className="border-b border-border p-2 md:p-4 flex-shrink-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPlayingGame(null)}
              data-testid="button-back-to-library"
            >
              Back to Library
            </Button>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-2 md:p-8 overflow-hidden">
          <EmulatorPlayer
            gameId={playingGame.id}
            gameName={playingGame.title}
            system={playingGame.system}
            onClose={() => setPlayingGame(null)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Gamepad2 className="h-6 w-6 text-primary" />
            <h1 className="font-display text-xl font-bold">RetroArch Web</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadDialogOpen(true)}
              data-testid="button-header-upload"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsDialogOpen(true)}
              data-testid="button-header-settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <Hero
        onGetStarted={() => {
          document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onUpload={() => setUploadDialogOpen(true)}
      />

      <div id="library" className="max-w-7xl mx-auto px-4 py-12">
        <section className="mb-12">
          <h2 className="font-display text-3xl font-bold mb-6">Select System</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {systemCounts.map((system) => (
              <SystemCard
                key={system.id}
                name={system.name}
                icon={Gamepad2}
                romCount={system.romCount}
                formats={system.formats}
                isActive={selectedSystem === system.id}
                onClick={() => setSelectedSystem(selectedSystem === system.id ? null : system.id)}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="font-display text-3xl font-bold">Game Library</h2>
            
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 md:flex-initial md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search games..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-games"
                />
              </div>
              
              <div className="flex gap-1 border border-border rounded-md p-1">
                <Button
                  size="icon"
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  className="h-8 w-8"
                  onClick={() => setViewMode('grid')}
                  data-testid="button-view-grid"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  className="h-8 w-8"
                  onClick={() => setViewMode('list')}
                  data-testid="button-view-list"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all-games">
                All Games
              </TabsTrigger>
              <TabsTrigger value="favorites" data-testid="tab-favorites" className="gap-2">
                <Star className="h-4 w-4" />
                Favorites
              </TabsTrigger>
              <TabsTrigger value="recent" data-testid="tab-recent" className="gap-2">
                <Clock className="h-4 w-4" />
                Recent
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-flex p-6 rounded-full bg-muted mb-4 animate-pulse">
                <Gamepad2 className="h-12 w-12 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Loading games...</p>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex p-6 rounded-full bg-muted mb-4">
                <Gamepad2 className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No games found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery ? 'Try a different search term' : 'Upload your first ROM to get started'}
              </p>
              <Button onClick={() => setUploadDialogOpen(true)} data-testid="button-upload-first-rom">
                <Upload className="h-4 w-4 mr-2" />
                Upload ROM
              </Button>
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
              : "space-y-2"
            }>
              {filteredGames.map((game) => (
                viewMode === 'grid' ? (
                  <GameCard
                    key={game.id}
                    id={game.id}
                    title={game.title}
                    system={game.system}
                    coverImage={game.coverImage ?? undefined}
                    lastPlayed={formatLastPlayed(game.lastPlayed)}
                    isFavorite={game.isFavorite}
                    onPlay={() => handlePlayGame(game)}
                    onToggleFavorite={() => toggleFavoriteMutation.mutate(game.id)}
                    onDelete={() => deleteGameMutation.mutate(game.id)}
                  />
                ) : (
                  <div key={game.id} className="flex items-center gap-4 p-3 border border-border rounded-md hover-elevate active-elevate-2">
                    <div className="w-16 h-16 bg-muted rounded-md flex-shrink-0">
                      {game.coverImage && (
                        <img src={game.coverImage} alt={game.title} className="w-full h-full object-cover rounded-md" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{game.title}</h3>
                      <p className="text-sm text-muted-foreground">{game.system}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {game.lastPlayed && (
                        <span className="text-xs text-muted-foreground">{formatLastPlayed(game.lastPlayed)}</span>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handlePlayGame(game)}
                        data-testid={`button-play-list-${game.id}`}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Play
                      </Button>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-upload">
          <DialogHeader>
            <DialogTitle>Upload ROM Files</DialogTitle>
            <DialogDescription>
              Add games to your library by uploading ROM files
            </DialogDescription>
          </DialogHeader>
          <ROMUploadDialog 
            onUploadComplete={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/games'] });
              setUploadDialogOpen(false);
            }} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-settings">
          <DialogHeader>
            <DialogTitle>Emulator Settings</DialogTitle>
            <DialogDescription>
              Configure video, audio, controls, and advanced options
            </DialogDescription>
          </DialogHeader>
          <SettingsPanel />
        </DialogContent>
      </Dialog>

      <footer className="border-t border-border mt-24">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Gamepad2 className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                RetroArch Web - Classic Gaming Reimagined
              </span>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4 text-xs text-muted-foreground">
              <p>Emulators are legal. Ensure you own the games you play.</p>
              <div className="flex gap-4">
                <a href="/terms" className="hover:text-primary transition-colors">Terms of Use</a>
                <a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
