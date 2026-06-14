import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Save, FolderOpen, Maximize2, Settings, Volume2, VolumeX } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface EmulatorPlayerProps {
  gameId: string;
  gameName: string;
  system: string;
  onClose?: () => void;
}

const SYSTEM_CORES: Record<string, string> = {
  'NES': 'nes',
  'SNES': 'snes',
  'Game Boy': 'gb',
  'Game Boy Color': 'gbc',
  'Game Boy Advance': 'gba',
  'Genesis': 'genesis',
  'Nintendo 64': 'n64',
  'PlayStation': 'psx',
  'GBA': 'gba',
  'N64': 'n64',
};

export function EmulatorPlayer({ gameId, gameName, system, onClose }: EmulatorPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [fps] = useState(60);
  const [emulatorReady, setEmulatorReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load EmulatorJS scripts dynamically
    const loadEmulatorJS = () => {
      // Set config before loading the script
      const core = SYSTEM_CORES[system] || 'nes';

      (window as any).EJS_player = '#emulator-container';
      (window as any).EJS_core = core;
      (window as any).EJS_gameName = gameName;
      (window as any).EJS_color = '#A855F7';
      (window as any).EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
      (window as any).EJS_gameUrl = `/api/roms/${gameId}`;
      (window as any).EJS_startOnLoaded = true;
      (window as any).EJS_volume = isMuted ? 0 : 0.75;

      // Check if loader is already loaded
      if ((window as any).EJS_emulator) {
        setEmulatorReady(true);
        return;
      }

      // Load the loader script
      const script = document.createElement('script');
      script.src = 'https://cdn.emulatorjs.org/stable/data/loader.js';
      script.async = true;
      script.onload = () => {
        setEmulatorReady(true);
      };
      script.onerror = (error) => {
        console.error('Failed to load EmulatorJS:', error);
      };
      document.body.appendChild(script);
    };

    loadEmulatorJS();

    // Cleanup
    return () => {
      // Note: EmulatorJS doesn't provide a clean way to destroy instances
    };
  }, [gameId, gameName, system, isMuted]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    console.log(isPlaying ? 'Paused' : 'Playing');
  };

  const handleSaveState = () => {
    console.log('Save state created');
  };

  const handleLoadState = () => {
    console.log('Load state');
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if ((window as any).EJS_emulator) {
      (window as any).EJS_emulator.volume = isMuted ? 0.75 : 0;
    }
  };

  return (
    <div className="w-full h-full md:max-w-6xl md:mx-auto">
      <Card className="overflow-hidden h-full md:h-auto">
        <div
          ref={containerRef}
          id="emulator-container"
          className="bg-black aspect-[4/3] md:aspect-[4/3] min-h-[60vh] md:min-h-0 relative flex items-center justify-center"
        >
          {!emulatorReady && (
            <>
              <div className="absolute inset-0 opacity-5">
                {Array.from({ length: 100 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[2px] w-full"
                    style={{
                      background: i % 2 === 0 ? 'transparent' : 'white',
                    }}
                  />
                ))}
              </div>
              
              <div className="relative z-10 text-center">
                <div className="text-primary text-6xl font-display mb-4">
                  {gameName}
                </div>
                <div className="text-accent text-xl font-mono">
                  Loading {system} Emulator...
                </div>
              </div>
            </>
          )}

          <div className="absolute top-4 left-4 flex gap-2 z-50">
            <div className="bg-background/80 backdrop-blur-sm px-3 py-1 rounded-md">
              <span className="text-xs font-mono text-foreground">FPS: {fps}</span>
            </div>
          </div>

          <div className="absolute top-4 right-4 z-50">
            <Button
              size="icon"
              variant="secondary"
              onClick={toggleMute}
              className="bg-background/80 backdrop-blur-sm"
              data-testid="button-mute"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="p-4 bg-card border-t border-card-border">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                onClick={togglePlay}
                data-testid="button-play-pause"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="text-sm">
                <div className="font-semibold">{gameName}</div>
                <div className="text-xs text-muted-foreground">{system}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveState}
                data-testid="button-save-state"
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save State
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadState}
                data-testid="button-load-state"
                className="gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                Load State
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleFullscreen}
                data-testid="button-fullscreen"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                data-testid="button-settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
