import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Save,
  FolderOpen,
  Maximize2,
  Volume2,
  VolumeX,
  Tv,
  Video,
  VideoOff,
  Monitor,
  ArrowLeft,
  Users,
  Grid2X2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { videoRecorder, type RecordingResult } from "@/lib/videoRecorder";
import { streamManager, type StreamMode, type StreamState } from "@/lib/streamManager";
import { SessionRecordingModal } from "@/components/SessionRecordingModal";
import { QuadStreamArena } from "@/components/QuadStreamArena";
import { useToast } from "@/hooks/use-toast";

interface EmulatorPlayerProps {
  gameId: string;
  gameName: string;
  system: string;
  mode?: StreamMode;
  username?: string;
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

export function EmulatorPlayer({
  gameId,
  gameName,
  system,
  mode = 'SOLO',
  username = 'Player_One',
  onClose,
}: EmulatorPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [fps] = useState(60);
  const [emulatorReady, setEmulatorReady] = useState(false);
  const [crtEnabled, setCrtEnabled] = useState(true);

  // Video Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState('00:00');
  const [recordingResult, setRecordingResult] = useState<RecordingResult | null>(null);
  const [recordingModalOpen, setRecordingModalOpen] = useState(false);

  // Streaming State
  const [streamState, setStreamState] = useState<StreamState>(streamManager.getState());
  const [showQuadOverlay, setShowQuadOverlay] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { toast } = useToast();

  // 1. Initialize Streaming if in STREAMING mode
  useEffect(() => {
    if (mode === 'STREAMING') {
      streamManager.joinQueue(username, gameName, system);
    } else {
      streamManager.setMode('SOLO');
    }

    const unsub = streamManager.subscribe((state) => {
      setStreamState(state);
    });

    return () => {
      unsub();
      if (mode === 'STREAMING') {
        streamManager.leaveQueue();
      }
    };
  }, [mode, username, gameName, system]);

  // 2. Video Recorder listener
  useEffect(() => {
    const unsub = videoRecorder.onStateChange((state, elapsed) => {
      setIsRecording(state === 'recording');
      setRecordingElapsed(videoRecorder.formatDuration(elapsed));
    });

    return () => {
      unsub();
    };
  }, []);

  // 3. Load EmulatorJS dynamically
  useEffect(() => {
    const loadEmulatorJS = () => {
      const core = SYSTEM_CORES[system] || 'nes';

      (window as any).EJS_player = '#emulator-container';
      (window as any).EJS_core = core;
      (window as any).EJS_gameName = gameName;
      (window as any).EJS_color = '#00f0ff';
      (window as any).EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
      (window as any).EJS_gameUrl = `/api/roms/${gameId}`;
      (window as any).EJS_startOnLoaded = true;
      (window as any).EJS_volume = isMuted ? 0 : 0.75;

      if ((window as any).EJS_emulator) {
        setEmulatorReady(true);
        pollCanvas();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.emulatorjs.org/stable/data/loader.js';
      script.async = true;
      script.onload = () => {
        setEmulatorReady(true);
        pollCanvas();
      };
      script.onerror = (error) => {
        console.error('Failed to load EmulatorJS:', error);
      };
      document.body.appendChild(script);
    };

    const pollCanvas = () => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const canvas = document.querySelector('#emulator-container canvas') as HTMLCanvasElement;
        if (canvas) {
          canvasRef.current = canvas;
          streamManager.attachCanvas(canvas);
          clearInterval(interval);
        } else if (attempts > 30) {
          clearInterval(interval);
        }
      }, 500);
    };

    loadEmulatorJS();
  }, [gameId, gameName, system, isMuted]);

  // Handle Recording Toggle
  const toggleRecording = async () => {
    if (isRecording) {
      const result = await videoRecorder.stopRecording(gameName);
      if (result) {
        setRecordingResult(result);
        setRecordingModalOpen(true);
        toast({
          title: "Session Video Ready",
          description: `Captured ${result.durationFormatted} of gameplay (${result.sizeFormatted}).`,
        });
      }
    } else {
      // Find canvas element
      const canvas = canvasRef.current || (document.querySelector('#emulator-container canvas') as HTMLCanvasElement);
      if (!canvas) {
        toast({
          variant: "destructive",
          title: "Emulator Canvas Loading",
          description: "Please wait a moment for the emulator canvas to initialize before recording.",
        });
        return;
      }

      const started = videoRecorder.startRecording(canvas, gameName);
      if (started) {
        toast({
          title: "Recording Started",
          description: "Capturing 60 FPS gameplay session to WebM.",
        });
      }
    }
  };

  const handleExit = async () => {
    if (isRecording) {
      const result = await videoRecorder.stopRecording(gameName);
      if (result) {
        setRecordingResult(result);
        setRecordingModalOpen(true);
        return;
      }
    }
    if (onClose) onClose();
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
    <div className="w-full h-full flex flex-col max-w-6xl mx-auto space-y-3">
      {/* Top Stream Status Bar */}
      <div className="flex items-center justify-between bg-[#0a0f24] border border-[#00f0ff]/30 rounded-xl px-4 py-2.5 flex-wrap gap-2 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExit}
            className="text-cyan-300 hover:text-white hover:bg-cyan-900/30 font-mono text-xs gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Arcade Library
          </Button>

          <div className="h-4 w-px bg-[#00f0ff]/20 hidden sm:block" />

          {/* Broadcast Status Pill */}
          {mode === 'STREAMING' ? (
            streamState.queueState === 'QUAD' ? (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#ff007f]/20 text-[#ff00aa] border border-[#ff007f]/40 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#ff007f]" />
                ⚡ 4-PLAYER QUAD ARENA ({streamState.quadrant || 'ACTIVE'})
              </span>
            ) : streamState.queueState === 'LIVE' ? (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#ff007f]/20 text-[#ff00aa] border border-[#ff007f]/40 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#ff007f]" />
                🔴 LIVE ON TWITCH
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#ff7700]/20 text-[#ff7700] border border-[#ff7700]/40">
                <span className="w-2 h-2 rounded-full bg-[#ff7700]" />
                STANDBY QUEUE (#{streamState.position})
              </span>
            )
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#39ff14]/15 text-[#39ff14] border border-[#39ff14]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#39ff14]" />
              PRIVATE SOLO SESSION
            </span>
          )}
        </div>

        {/* Right Tools (Recording HUD + Quad Toggle) */}
        <div className="flex items-center gap-2">
          {mode === 'STREAMING' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQuadOverlay(!showQuadOverlay)}
              className="h-8 font-mono text-xs bg-[#0f1738] border-[#00f0ff]/40 text-cyan-300 hover:text-white gap-1.5"
            >
              <Grid2X2 className="h-3.5 w-3.5 text-[#00f0ff]" />
              {showQuadOverlay ? 'Single View' : 'Quad Arena'}
            </Button>
          )}

          {/* Recording HUD Button */}
          <Button
            size="sm"
            onClick={toggleRecording}
            className={`h-8 font-mono text-xs font-bold gap-1.5 transition-all ${
              isRecording
                ? 'bg-[#ff007f] hover:bg-[#e00070] text-white shadow-[0_0_15px_rgba(255,0,127,0.8)] animate-pulse'
                : 'bg-[#0e221d] hover:bg-[#15342c] text-[#39ff14] border border-[#39ff14]/50'
            }`}
          >
            {isRecording ? (
              <>
                <VideoOff className="h-3.5 w-3.5" />
                <span>REC {recordingElapsed}</span>
              </>
            ) : (
              <>
                <Video className="h-3.5 w-3.5" />
                <span>Record Session</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Cabinet Display or Quad Arena */}
      {showQuadOverlay && mode === 'STREAMING' ? (
        <QuadStreamArena
          peers={streamState.quadPeers}
          activeUserId={streamManager.getUserId()}
          activeCanvas={canvasRef.current}
          twitchChannel={streamState.twitchChannel}
        />
      ) : (
        <Card className="overflow-hidden border border-[#00f0ff]/30 bg-[#070914] shadow-[0_0_40px_rgba(0,0,0,0.8)]">
          {/* Emulator Screen */}
          <div
            ref={containerRef}
            id="emulator-container"
            className={`bg-black aspect-[4/3] min-h-[60vh] md:min-h-[65vh] relative flex items-center justify-center ${
              crtEnabled ? 'crt-overlay' : ''
            }`}
          >
            {!emulatorReady && (
              <div className="relative z-10 text-center space-y-4">
                <div className="text-4xl md:text-5xl font-display font-extrabold text-[#00f0ff] neon-glow-blue uppercase">
                  {gameName}
                </div>
                <div className="text-sm font-mono text-[#ff7700] tracking-widest uppercase">
                  INITIALIZING {system} CORE &bull; 60 FPS
                </div>
                <div className="w-16 h-1 mx-auto bg-gradient-to-r from-[#00f0ff] via-[#ff7700] to-[#ff007f] rounded-full animate-pulse" />
              </div>
            )}

            {/* In-game Recording Indicator */}
            {isRecording && (
              <div className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-[#ff007f]/50">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff007f] animate-ping" />
                <span className="text-xs font-mono font-bold text-white">REC {recordingElapsed}</span>
              </div>
            )}

            {/* Audio Mute in Screen Corner */}
            <div className="absolute top-4 right-4 z-50">
              <Button
                size="icon"
                variant="secondary"
                onClick={toggleMute}
                className="bg-black/70 border border-white/10 hover:bg-black/90 text-white"
              >
                {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-[#00f0ff]" />}
              </Button>
            </div>
          </div>

          {/* Bottom Arcade Control Bar */}
          <div className="p-3.5 bg-[#090d20] border-t border-[#00f0ff]/20">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Game Metadata */}
              <div className="flex items-center gap-3">
                <div className="text-sm font-mono">
                  <div className="font-bold text-white flex items-center gap-2">
                    {gameName}
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30">
                      {system}
                    </span>
                  </div>
                  <div className="text-xs text-cyan-200/60 font-mono">
                    Player: <strong className="text-white">{username}</strong>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* CRT Scanline Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCrtEnabled(!crtEnabled)}
                  className={`h-8 font-mono text-xs gap-1.5 ${
                    crtEnabled
                      ? 'bg-[#00f0ff]/10 border-[#00f0ff]/50 text-[#00f0ff]'
                      : 'bg-black/40 border-white/10 text-muted-foreground'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  CRT Scanlines: {crtEnabled ? 'ON' : 'OFF'}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-[#0a1024] border-white/10 hover:border-[#00f0ff]/50 text-white"
                  onClick={handleFullscreen}
                >
                  <Maximize2 className="h-3.5 w-3.5 text-cyan-300" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Session Recording Export Modal */}
      <SessionRecordingModal
        isOpen={recordingModalOpen}
        onClose={() => setRecordingModalOpen(false)}
        recording={recordingResult}
        gameTitle={gameName}
      />
    </div>
  );
}
