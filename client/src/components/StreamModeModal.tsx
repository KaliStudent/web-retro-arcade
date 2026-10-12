import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Radio, Tv, ShieldCheck, Video, Users, Sparkles, Gamepad2 } from "lucide-react";
import type { StreamMode } from "@/lib/streamManager";

interface StreamModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle: string;
  system: string;
  onConfirm: (mode: StreamMode, username: string) => void;
}

export function StreamModeModal({
  isOpen,
  onClose,
  gameTitle,
  system,
  onConfirm,
}: StreamModeModalProps) {
  const [selectedMode, setSelectedMode] = useState<StreamMode>('STREAMING');
  const [username, setUsername] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('retro_arcade_username');
    if (saved) {
      setUsername(saved);
    } else {
      const randomTag = 'Player_' + Math.floor(1000 + Math.random() * 9000);
      setUsername(randomTag);
    }
  }, []);

  const handleLaunch = () => {
    const finalName = username.trim() || 'Player_One';
    localStorage.setItem('retro_arcade_username', finalName);
    onConfirm(selectedMode, finalName);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[#090b17] border border-[#00f0ff]/40 text-foreground shadow-[0_0_50px_rgba(0,240,255,0.2)]">
        <DialogHeader className="text-center pb-2 border-b border-[#00f0ff]/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 text-xs font-mono font-bold uppercase rounded bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40">
              {system}
            </span>
            <span className="text-xs font-mono text-[#ff7700] uppercase tracking-wider font-semibold">
              Arcade Station
            </span>
          </div>
          <DialogTitle className="text-2xl md:text-3xl font-display font-extrabold text-white tracking-wide">
            {gameTitle}
          </DialogTitle>
          <DialogDescription className="text-sm text-cyan-200/70">
            Choose your broadcast mode before entering the arcade cabinet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-3">
          {/* Player Handle Input */}
          <div className="space-y-2">
            <Label htmlFor="player-username" className="text-xs uppercase font-mono tracking-wider text-cyan-300">
              Player Call-Sign / Handle
            </Label>
            <div className="relative">
              <Gamepad2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#00f0ff]" />
              <Input
                id="player-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter arcade handle..."
                className="pl-9 bg-[#0d1226] border-[#00f0ff]/30 text-white font-mono focus:border-[#00f0ff] focus:ring-[#00f0ff]/30"
              />
            </div>
          </div>

          {/* Mode Selector Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: Live Twitch Stream */}
            <div
              onClick={() => setSelectedMode('STREAMING')}
              className={`relative cursor-pointer rounded-xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                selectedMode === 'STREAMING'
                  ? 'bg-gradient-to-br from-[#0e1738] to-[#1a113a] border-[#00f0ff] shadow-[0_0_25px_rgba(0,240,255,0.35)] ring-1 ring-[#00f0ff]'
                  : 'bg-[#0d1124]/60 border-[#1c2445] hover:border-[#00f0ff]/50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff]">
                  <Tv className="h-6 w-6" />
                </div>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#ff007f]/20 text-[#ff00aa] border border-[#ff007f]/40 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff007f]" />
                  TWITCH LIVE
                </span>
              </div>

              <div>
                <h3 className="font-display text-lg font-bold text-white mb-1.5 flex items-center gap-1.5">
                  Stream Live on Twitch
                  <Sparkles className="h-4 w-4 text-[#ff7700]" />
                </h3>
                <p className="text-xs text-cyan-200/70 leading-relaxed mb-3">
                  Broadcast your run live to our official Twitch channel. Features automatic 1-streamer handoff lock &amp; 4-player quad-grid arena!
                </p>
                <div className="space-y-1 text-[11px] font-mono text-cyan-300/80">
                  <div className="flex items-center gap-1.5">
                    <Radio className="h-3 w-3 text-[#00f0ff]" />
                    <span>Single-streamer live broadcast lock</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3 w-3 text-[#ff7700]" />
                    <span>4+ players unlock 4-way Quad Arena</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Option 2: Play Solo */}
            <div
              onClick={() => setSelectedMode('SOLO')}
              className={`relative cursor-pointer rounded-xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                selectedMode === 'SOLO'
                  ? 'bg-gradient-to-br from-[#0e1e2d] to-[#12221b] border-[#39ff14] shadow-[0_0_25px_rgba(57,255,20,0.35)] ring-1 ring-[#39ff14]'
                  : 'bg-[#0d1124]/60 border-[#1c2445] hover:border-[#39ff14]/50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-[#39ff14]/10 border border-[#39ff14]/30 text-[#39ff14]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#39ff14]/20 text-[#39ff14] border border-[#39ff14]/40">
                  PRIVATE SESSION
                </span>
              </div>

              <div>
                <h3 className="font-display text-lg font-bold text-white mb-1.5">
                  Play Solo (Private Session)
                </h3>
                <p className="text-xs text-emerald-200/70 leading-relaxed mb-3">
                  Identical 60 FPS emulator experience with zero broadcast transmission. Includes in-browser session video recording to download &amp; share!
                </p>
                <div className="space-y-1 text-[11px] font-mono text-emerald-300/80">
                  <div className="flex items-center gap-1.5">
                    <Video className="h-3 w-3 text-[#39ff14]" />
                    <span>Record 60 FPS gameplay to WebM</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3 text-[#39ff14]" />
                    <span>100% private, zero stream bandwidth</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#00f0ff]/20">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-cyan-300 hover:text-white hover:bg-cyan-900/30 font-mono text-xs uppercase"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLaunch}
              className={`font-display font-bold uppercase tracking-wider px-6 text-black transition-all ${
                selectedMode === 'STREAMING'
                  ? 'bg-[#00f0ff] hover:bg-[#00c8d4] shadow-[0_0_20px_rgba(0,240,255,0.6)]'
                  : 'bg-[#39ff14] hover:bg-[#32e012] shadow-[0_0_20px_rgba(57,255,20,0.6)]'
              }`}
            >
              Launch Arcade Cabinet
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
