import { Play, Upload, Tv, Grid2X2, Sparkles, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroProps {
  onGetStarted?: () => void;
  onUpload?: () => void;
  onGoLive?: () => void;
  onOpenQuadArena?: () => void;
}

export function Hero({ onGetStarted, onUpload, onGoLive, onOpenQuadArena }: HeroProps) {
  return (
    <div className="relative w-full min-h-[580px] md:min-h-[620px] synthwave-background flex flex-col items-center justify-center text-center px-4 overflow-hidden border-b border-[#00f0ff]/30">
      {/* 80s Retro Neon Sun in Background */}
      <div className="absolute top-10 md:top-8 left-1/2 -translate-x-1/2 pointer-events-none opacity-90 z-0">
        <div className="synthwave-sun" />
      </div>

      {/* 3D Wireframe Perspective Grid Floor */}
      <div className="synthwave-grid-floor z-0" />

      {/* Foreground Content */}
      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
        {/* Retro System Badge Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0a1024]/80 backdrop-blur-md border border-[#00f0ff]/40 mb-6 shadow-[0_0_20px_rgba(0,240,255,0.25)]">
          <Gamepad2 className="h-4 w-4 text-[#00f0ff]" />
          <span className="font-mono text-xs uppercase tracking-widest text-[#00f0ff] font-bold">
            80s &bull; 90s RETRO ARCADE ARENA
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-ping" />
        </div>

        {/* Hero Title */}
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-wider mb-4 uppercase drop-shadow-[0_0_35px_rgba(0,240,255,0.7)]">
          <span className="text-[#00f0ff] neon-glow-blue">WEB</span>{' '}
          <span className="text-[#ff7700] neon-glow-orange">RETRO</span>{' '}
          <span className="text-[#ff007f] neon-glow-pink">ARCADE</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base md:text-xl text-cyan-100/90 font-sans max-w-2xl mb-8 leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
          Play classic NES, SNES, Genesis, and GBA games in 60 FPS arcade glory. Choose between{' '}
          <strong className="text-[#00f0ff]">live Twitch broadcast with auto-handoff &amp; 4-way Quad Arena</strong>, or{' '}
          <strong className="text-[#39ff14]">solo private play with instant session video recording</strong>.
        </p>

        {/* Feature Highlights Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8 font-mono text-xs">
          <span className="px-3 py-1 rounded bg-[#091024]/80 border border-[#00f0ff]/40 text-[#00f0ff]">
            NES &bull; SNES &bull; GBA &bull; GENESIS
          </span>
          <span className="px-3 py-1 rounded bg-[#091024]/80 border border-[#ff7700]/40 text-[#ff7700]">
            SINGLE-STREAMER BROADCAST LOCK
          </span>
          <span className="px-3 py-1 rounded bg-[#091024]/80 border border-[#39ff14]/40 text-[#39ff14]">
            60 FPS VIDEO RECORDING (.WEBM)
          </span>
          <span className="px-3 py-1 rounded bg-[#091024]/80 border border-[#ff007f]/40 text-[#ff00aa]">
            4-PLAYER QUAD ARENA
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3.5 justify-center z-20">
          <Button
            size="lg"
            onClick={onGetStarted}
            className="font-display font-bold uppercase tracking-wider text-black bg-[#00f0ff] hover:bg-[#00d0de] shadow-[0_0_30px_rgba(0,240,255,0.6)] px-7 py-6 text-sm gap-2"
          >
            <Play className="h-5 w-5 fill-current" />
            Play Arcade Games
          </Button>

          <Button
            size="lg"
            onClick={onGoLive}
            className="font-display font-bold uppercase tracking-wider text-white bg-[#ff007f] hover:bg-[#e00070] shadow-[0_0_30px_rgba(255,0,127,0.6)] px-6 py-6 text-sm gap-2 border border-[#ff007f]/60"
          >
            <Tv className="h-5 w-5" />
            Go Live on Twitch
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={onOpenQuadArena}
            className="font-mono text-xs uppercase tracking-wider bg-[#0a122c]/80 border-[#ff7700]/50 text-[#ff7700] hover:text-white hover:bg-[#ff7700]/20 px-5 py-6 gap-2"
          >
            <Grid2X2 className="h-4 w-4" />
            4-Way Quad Arena
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={onUpload}
            className="font-mono text-xs uppercase tracking-wider bg-[#0a122c]/80 border-[#39ff14]/50 text-[#39ff14] hover:text-white hover:bg-[#39ff14]/20 px-5 py-6 gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload ROM
          </Button>
        </div>
      </div>
    </div>
  );
}
