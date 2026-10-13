import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Hero } from "@/components/Hero";
import { SystemCard } from "@/components/SystemCard";
import { GameCard } from "@/components/GameCard";
import { ROMUploadDialog } from "@/components/ROMUploadDialog";
import { EmulatorPlayer } from "@/components/EmulatorPlayer";
import { SettingsPanel } from "@/components/SettingsPanel";
import { LiveTwitchBar } from "@/components/LiveTwitchBar";
import { StreamModeModal } from "@/components/StreamModeModal";
import { QuadStreamArena } from "@/components/QuadStreamArena";
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
  Grid2X2,
  Tv,
  Trash2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllGames, toggleFavorite, deleteGame, updateLastPlayed } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { streamManager, type StreamMode } from "@/lib/streamManager";
import { localDB } from "@/lib/localStorageDB";
import { useEffect } from "react";
import type { Game } from "@shared/schema";

const DEFAULT_GAME_IDS = new Set([
  'nes-invaders',
  'nes-flappybird',
  'nes-driar',
  'nes-blaster',
  'nes-bombarray',
  'nes-babelblox',
  'snes-astrohawk',
  'gba-anguna',
  'gba-asteroidsb',
  'genesis-barbarian',
]);

const systems = [
  { id: 'nes', name: 'NES', formats: ['.nes'] },
  { id: 'snes', name: 'SNES', formats: ['.smc', '.sfc'] },
  { id: 'gb', name: 'Game Boy', formats: ['.gb', '.gbc'] },
  { id: 'gba', name: 'GBA', formats: ['.gba'] },
  { id: 'genesis', name: 'Genesis', formats: ['.bin', '.md'] },
  { id: 'n64', name: 'N64', formats: ['.z64', '.n64'] },
];

export default function Home() {
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [quadArenaDialogOpen, setQuadArenaDialogOpen] = useState(false);

  // Game Launch State
  const [pendingGame, setPendingGame] = useState<Game | null>(null);
  const [playingGame, setPlayingGame] = useState<Game | null>(null);
  const [activeStreamMode, setActiveStreamMode] = useState<StreamMode>('SOLO');
  const [activePlayerName, setActivePlayerName] = useState<string>('Player_One');

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const [localGames, setLocalGames] = useState<Game[]>([]);

  const loadLocalROMs = async () => {
    try {
      const roms = await localDB.getAllROMs();
      const converted: Game[] = roms.map((r) => ({
        id: r.id,
        title: r.title,
        system: r.system,
        romFileName: r.fileName,
        romFilePath: URL.createObjectURL(new Blob([r.fileData])),
        fileSize: r.fileSize,
        coverImage: null,
        isFavorite: r.isFavorite,
        lastPlayed: r.lastPlayed || null,
        createdAt: r.createdAt,
      }));
      setLocalGames(converted);
    } catch (e) {
      console.error('Failed to load local ROMs from IndexedDB:', e);
    }
  };

  useEffect(() => {
    loadLocalROMs();
  }, []);

  const { data: serverGames = [], isLoading } = useQuery({
    queryKey: ['/api/games'],
    queryFn: getAllGames,
  });

  // Merge server games and locally stored ROMs
  const games: Game[] = [
    ...localGames,
    ...serverGames.filter((sg) => !localGames.some((lg) => lg.id === sg.id)),
  ];

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

  const handleToggleFavorite = async (game: Game) => {
    if (game.id.startsWith('local_')) {
      try {
        const newFav = await localDB.toggleFavorite(game.id);
        setLocalGames((prev) =>
          prev.map((g) => (g.id === game.id ? { ...g, isFavorite: newFav } : g))
        );
        toast({
          title: newFav ? "Added to favorites" : "Removed from favorites",
        });
      } catch (err) {
        console.error('Failed to toggle favorite locally:', err);
      }
    } else {
      toggleFavoriteMutation.mutate(game.id);
    }
  };

  const handleDeleteGame = async (game: Game) => {
    if (DEFAULT_GAME_IDS.has(game.id)) {
      toast({
        title: "Protected Title",
        description: "Built-in retro games cannot be deleted.",
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${game.title}" from your library?`)) {
      return;
    }

    if (game.id.startsWith('local_')) {
      try {
        await localDB.deleteROM(game.id);
        if (game.romFilePath && game.romFilePath.startsWith('blob:')) {
          URL.revokeObjectURL(game.romFilePath);
        }
        setLocalGames((prev) => prev.filter((g) => g.id !== game.id));
        toast({
          title: "Custom ROM Deleted",
          description: `"${game.title}" was removed from your local arcade library.`,
        });
      } catch (err) {
        console.error('Failed to delete local ROM:', err);
        toast({
          title: "Delete Failed",
          description: "Could not remove ROM from browser storage.",
          variant: "destructive",
        });
      }
    } else {
      deleteGameMutation.mutate(game.id);
    }
  };

  const updateLastPlayedMutation = useMutation({
    mutationFn: updateLastPlayed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
    },
  });

  // Prompt Mode selection modal before launching
  const handleInitiatePlay = (game: Game) => {
    setPendingGame(game);
  };

  const handleConfirmLaunch = (mode: StreamMode, username: string) => {
    if (!pendingGame) return;
    const gameToLaunch = pendingGame;
    setActiveStreamMode(mode);
    setActivePlayerName(username);
    setPendingGame(null);
    setPlayingGame(gameToLaunch);

    try {
      if (!gameToLaunch.id.startsWith('local_')) {
        updateLastPlayedMutation.mutate(gameToLaunch.id);
      } else {
        localDB.updateLastPlayed(gameToLaunch.id);
      }
    } catch (e) {
      console.warn('Update last played notice:', e);
    }
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
      <div className="min-h-screen h-screen bg-[#060814] flex flex-col overflow-hidden text-foreground">
        <main className="flex-1 p-2 md:p-6 overflow-hidden flex flex-col justify-center">
          <EmulatorPlayer
            gameId={playingGame.id}
            gameName={playingGame.title}
            system={playingGame.system}
            gameUrl={playingGame.romFilePath}
            mode={activeStreamMode}
            username={activePlayerName}
            onClose={() => setPlayingGame(null)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060814] text-foreground flex flex-col">
      {/* Real-time Twitch Status Bar */}
      <LiveTwitchBar onOpenQuadArena={() => setQuadArenaDialogOpen(true)} />

      {/* Main Arcade Header */}
      <header className="sticky top-0 z-40 border-b border-[#00f0ff]/20 bg-[#060814]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/40 shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              <Gamepad2 className="h-6 w-6 text-[#00f0ff]" />
            </div>
            <div>
              <h1 className="font-display text-xl md:text-2xl font-black tracking-wider text-white">
                <span className="text-[#00f0ff] neon-glow-blue">WEB</span>{' '}
                <span className="text-[#ff7700] neon-glow-orange">RETRO</span>{' '}
                <span className="text-[#ff007f] neon-glow-pink">ARCADE</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuadArenaDialogOpen(true)}
              className="hidden md:flex font-mono text-xs bg-[#0b132b] border-[#ff007f]/40 text-[#ff00aa] hover:text-white hover:bg-[#ff007f]/20 gap-1.5"
            >
              <Grid2X2 className="h-4 w-4" />
              Quad Arena
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadDialogOpen(true)}
              data-testid="button-header-upload"
              className="font-mono text-xs bg-[#0b132b] border-[#00f0ff]/30 text-cyan-300 hover:text-white hover:bg-[#00f0ff]/20 gap-1.5"
            >
              <Upload className="h-4 w-4" />
              Upload ROM
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsDialogOpen(true)}
              data-testid="button-header-settings"
              className="text-cyan-300 hover:text-white hover:bg-[#00f0ff]/10"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* 80s/90s Synthwave Hero with Sun & Horizon Grid */}
      <Hero
        onGetStarted={() => {
          document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onUpload={() => setUploadDialogOpen(true)}
        onGoLive={() => {
          if (games.length > 0) {
            handleInitiatePlay(games[0]);
          } else {
            setUploadDialogOpen(true);
          }
        }}
        onOpenQuadArena={() => setQuadArenaDialogOpen(true)}
      />

      {/* Arcade Game Library & Systems */}
      <div id="library" className="max-w-7xl mx-auto px-4 py-12 flex-1 w-full">
        {/* Systems Grid */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-wide text-white flex items-center gap-2">
              <span className="w-2.5 h-6 bg-[#00f0ff] rounded-sm inline-block shadow-[0_0_10px_#00f0ff]" />
              SELECT ARCADE SYSTEM
            </h2>
            {selectedSystem && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSystem(null)}
                className="font-mono text-xs text-[#00f0ff] hover:underline"
              >
                Clear Filter
              </Button>
            )}
          </div>

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

        {/* Game Library Section */}
        <section>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-wide text-white flex items-center gap-2">
              <span className="w-2.5 h-6 bg-[#ff7700] rounded-sm inline-block shadow-[0_0_10px_#ff7700]" />
              ARCADE VAULT
            </h2>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 md:flex-initial md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#00f0ff]" />
                <Input
                  type="search"
                  placeholder="Search arcade titles..."
                  className="pl-9 bg-[#0b1024] border-[#00f0ff]/30 text-white font-mono placeholder:text-cyan-300/40 focus:border-[#00f0ff]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-games"
                />
              </div>

              <div className="flex gap-1 border border-[#00f0ff]/30 rounded-lg p-1 bg-[#090d20]">
                <Button
                  size="icon"
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  className={`h-8 w-8 ${viewMode === 'grid' ? 'bg-[#00f0ff] text-black' : 'text-cyan-300'}`}
                  onClick={() => setViewMode('grid')}
                  data-testid="button-view-grid"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  className={`h-8 w-8 ${viewMode === 'list' ? 'bg-[#00f0ff] text-black' : 'text-cyan-300'}`}
                  onClick={() => setViewMode('list')}
                  data-testid="button-view-list"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="bg-[#0a0f24] border border-[#00f0ff]/30">
              <TabsTrigger
                value="all"
                data-testid="tab-all-games"
                className="data-[state=active]:bg-[#00f0ff] data-[state=active]:text-black font-mono text-xs"
              >
                All Games ({games.length})
              </TabsTrigger>
              <TabsTrigger
                value="favorites"
                data-testid="tab-favorites"
                className="gap-2 data-[state=active]:bg-[#ff007f] data-[state=active]:text-white font-mono text-xs"
              >
                <Star className="h-3.5 w-3.5" />
                Favorites
              </TabsTrigger>
              <TabsTrigger
                value="recent"
                data-testid="tab-recent"
                className="gap-2 data-[state=active]:bg-[#ff7700] data-[state=active]:text-black font-mono text-xs"
              >
                <Clock className="h-3.5 w-3.5" />
                Recent
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-flex p-6 rounded-full bg-[#0d1430] border border-[#00f0ff]/30 mb-4 animate-pulse">
                <Gamepad2 className="h-12 w-12 text-[#00f0ff]" />
              </div>
              <p className="text-cyan-300 font-mono">Loading arcade library...</p>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-16 bg-[#090d20] rounded-2xl border border-[#00f0ff]/20 p-8">
              <div className="inline-flex p-6 rounded-full bg-[#0d1430] border border-[#00f0ff]/30 mb-4">
                <Gamepad2 className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 font-display">No Games Found</h3>
              <p className="text-cyan-200/60 mb-6 font-mono text-xs">
                {searchQuery ? 'Try a different search query' : 'Upload your custom ROM files to get started'}
              </p>
              <Button
                onClick={() => setUploadDialogOpen(true)}
                className="bg-[#00f0ff] hover:bg-[#00c9d6] text-black font-display font-bold uppercase"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload ROM
              </Button>
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                  : "space-y-2.5"
              }
            >
              {filteredGames.map((game) =>
                viewMode === 'grid' ? (
                  <GameCard
                    key={game.id}
                    id={game.id}
                    title={game.title}
                    system={game.system}
                    coverImage={game.coverImage ?? undefined}
                    lastPlayed={formatLastPlayed(game.lastPlayed)}
                    isFavorite={game.isFavorite}
                    onPlay={() => handleInitiatePlay(game)}
                    onToggleFavorite={() => handleToggleFavorite(game)}
                    onDelete={!DEFAULT_GAME_IDS.has(game.id) ? () => handleDeleteGame(game) : undefined}
                  />
                ) : (
                  <div
                    key={game.id}
                    className="flex items-center gap-4 p-3 border border-[#00f0ff]/20 bg-[#090d20] hover:border-[#00f0ff] rounded-xl transition-colors cursor-pointer"
                    onClick={() => handleInitiatePlay(game)}
                  >
                    <div className="w-16 h-16 bg-[#060814] rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                      {game.coverImage ? (
                        <img
                          src={game.coverImage}
                          alt={game.title}
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#00f0ff] font-display font-bold">
                          {game.title.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 font-mono">
                      <h3 className="font-bold text-white text-sm truncate">{game.title}</h3>
                      <p className="text-xs text-cyan-300/70">{game.system}</p>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      {game.lastPlayed && (
                        <span className="text-xs text-cyan-200/50 hidden sm:inline">
                          {formatLastPlayed(game.lastPlayed)}
                        </span>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(game);
                        }}
                        className={`h-8 w-8 ${game.isFavorite ? "text-[#ff007f]" : "text-white/60 hover:text-white"}`}
                        title="Toggle Favorite"
                      >
                        <Star className={`h-4 w-4 ${game.isFavorite ? "fill-current" : ""}`} />
                      </Button>
                      {!DEFAULT_GAME_IDS.has(game.id) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGame(game);
                          }}
                          className="h-8 w-8 text-white/50 hover:text-red-400 hover:bg-red-950/40"
                          title="Delete ROM"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInitiatePlay(game);
                        }}
                        className="bg-[#00f0ff] hover:bg-[#00c9d6] text-black font-display font-bold uppercase text-xs"
                      >
                        <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
                        Play
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>

      {/* Stream Mode Selection Modal */}
      {pendingGame && (
        <StreamModeModal
          isOpen={!!pendingGame}
          onClose={() => setPendingGame(null)}
          gameTitle={pendingGame.title}
          system={pendingGame.system}
          onConfirm={handleConfirmLaunch}
        />
      )}

      {/* 4-Player Quad Arena Spectator Modal */}
      <Dialog open={quadArenaDialogOpen} onOpenChange={setQuadArenaDialogOpen}>
        <DialogContent className="max-w-5xl bg-[#070914] border border-[#ff007f]/40 p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-2xl font-display font-bold text-white flex items-center gap-2">
              <Grid2X2 className="h-6 w-6 text-[#ff007f]" />
              4-Player Quad Arena Spectator View
            </DialogTitle>
            <DialogDescription className="text-xs font-mono text-pink-200/70">
              Real-time multi-stream arena compositor. Active when 4 or more players broadcast simultaneously.
            </DialogDescription>
          </DialogHeader>

          <QuadStreamArena
            peers={streamManager.getState().quadPeers}
            twitchChannel={streamManager.getState().twitchChannel}
          />

          <div className="flex items-center justify-between pt-2 border-t border-white/10 font-mono text-xs">
            <Button
              variant="outline"
              size="sm"
              onClick={() => streamManager.simulateQuadMode(true)}
              className="bg-[#0e1634] border-[#00f0ff]/30 text-cyan-300 hover:text-white"
            >
              Simulate 4 Active Players
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQuadArenaDialogOpen(false)}
              className="text-white hover:bg-white/10"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload ROM Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl bg-[#090d20] border border-[#00f0ff]/30" data-testid="dialog-upload">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-white">Upload Custom ROMs</DialogTitle>
            <DialogDescription className="text-cyan-200/70 font-mono text-xs">
              Load your favorite games into the arcade library.
            </DialogDescription>
          </DialogHeader>
          <ROMUploadDialog
            onUploadComplete={() => {
              loadLocalROMs();
              queryClient.invalidateQueries({ queryKey: ['/api/games'] });
              setUploadDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#090d20] border border-[#00f0ff]/30" data-testid="dialog-settings">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-white">Arcade Settings</DialogTitle>
            <DialogDescription className="text-cyan-200/70 font-mono text-xs">
              Configure CRT emulation, audio, and gamepad mappings.
            </DialogDescription>
          </DialogHeader>
          <SettingsPanel />
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-[#00f0ff]/20 bg-[#050711] mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-3">
              <Gamepad2 className="h-5 w-5 text-[#00f0ff]" />
              <span className="text-cyan-200/70">
                Web Retro Arcade &bull; 80s &bull; 90s Classic Gaming Reimagined
              </span>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4 text-cyan-300/50">
              <p>Emulators are legal. Ensure you own games played.</p>
              <div className="flex gap-4">
                <a href="/terms" className="hover:text-[#00f0ff] transition-colors">Terms of Use</a>
                <a href="/privacy" className="hover:text-[#00f0ff] transition-colors">Privacy Policy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
