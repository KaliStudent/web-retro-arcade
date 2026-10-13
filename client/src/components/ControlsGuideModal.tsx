import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gamepad2, Keyboard, CheckCircle2, AlertCircle, X } from "lucide-react";

interface ControlsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  system: string;
  gamepadName: string | null;
}

export function ControlsGuideModal({
  isOpen,
  onClose,
  system,
  gamepadName,
}: ControlsGuideModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[#090d22] border border-[#00f0ff]/40 text-white shadow-[0_0_50px_rgba(0,240,255,0.25)] p-6">
        <DialogHeader className="border-b border-[#00f0ff]/20 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-display uppercase tracking-widest text-[#00f0ff] flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-[#00f0ff] animate-pulse" />
              Arcade Controls Guide &bull; {system}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Controller Status Banner */}
        <div className={`p-3 rounded-lg border flex items-center justify-between text-xs font-mono ${
          gamepadName
            ? 'bg-[#00f0ff]/10 border-[#00f0ff]/40 text-cyan-300'
            : 'bg-[#ff7700]/10 border-[#ff7700]/40 text-[#ffaa44]'
        }`}>
          <div className="flex items-center gap-2">
            {gamepadName ? (
              <CheckCircle2 className="h-4 w-4 text-[#39ff14]" />
            ) : (
              <AlertCircle className="h-4 w-4 text-[#ff7700]" />
            )}
            <span>
              {gamepadName ? (
                <>Controller Connected: <strong>{gamepadName}</strong> (Player 1)</>
              ) : (
                <>No Controller Detected &mdash; Plug in USB/Bluetooth Gamepad and press any button</>
              )}
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-black/50 border border-white/10 uppercase">
            {gamepadName ? 'Ready 60 FPS' : 'Keyboard Active'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {/* Keyboard Controls */}
          <div className="bg-[#050713] p-4 rounded-xl border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-sm font-mono font-bold text-[#00f0ff] border-b border-white/10 pb-2">
              <Keyboard className="h-4 w-4 text-[#00f0ff]" />
              Keyboard Inputs (Default)
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">D-Pad / Movement</span>
                <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded">Arrow Keys / WASD</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Button B (Primary)</span>
                <span className="font-bold text-[#39ff14] bg-[#39ff14]/10 border border-[#39ff14]/30 px-2 py-0.5 rounded">Z key or J</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Button A (Secondary)</span>
                <span className="font-bold text-[#00f0ff] bg-[#00f0ff]/10 border border-[#00f0ff]/30 px-2 py-0.5 rounded">X key or K</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Button Y / X (SNES)</span>
                <span className="font-bold text-[#ff7700] bg-[#ff7700]/10 border border-[#ff7700]/30 px-2 py-0.5 rounded">A / S keys</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Start Button</span>
                <span className="font-bold text-[#ff007f] bg-[#ff007f]/10 border border-[#ff007f]/30 px-2 py-0.5 rounded">Enter key</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Select / Coin</span>
                <span className="font-bold text-yellow-300 bg-yellow-400/10 border border-yellow-400/30 px-2 py-0.5 rounded">Shift / Space / V</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Shoulder L / R</span>
                <span className="font-bold text-purple-300 bg-purple-400/10 border border-purple-400/30 px-2 py-0.5 rounded">Q / E keys</span>
              </div>
            </div>
          </div>

          {/* Gamepad / Controller */}
          <div className="bg-[#050713] p-4 rounded-xl border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-sm font-mono font-bold text-[#39ff14] border-b border-white/10 pb-2">
              <Gamepad2 className="h-4 w-4 text-[#39ff14]" />
              Gamepad / Controller Inputs
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">D-Pad / Left Stick</span>
                <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded">Directional Pad</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Action Button A</span>
                <span className="font-bold text-[#00f0ff] bg-[#00f0ff]/10 border border-[#00f0ff]/30 px-2 py-0.5 rounded">A (Xbox) / ✕ (PS)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Action Button B</span>
                <span className="font-bold text-[#39ff14] bg-[#39ff14]/10 border border-[#39ff14]/30 px-2 py-0.5 rounded">B (Xbox) / ◯ (PS)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Action Button X / Y</span>
                <span className="font-bold text-[#ff7700] bg-[#ff7700]/10 border border-[#ff7700]/30 px-2 py-0.5 rounded">X / Y (Xbox) or □ / △</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Start / Pause</span>
                <span className="font-bold text-[#ff007f] bg-[#ff007f]/10 border border-[#ff007f]/30 px-2 py-0.5 rounded">Start / Options</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Select / Coin</span>
                <span className="font-bold text-yellow-300 bg-yellow-400/10 border border-yellow-400/30 px-2 py-0.5 rounded">Back / Share</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Bumpers / Triggers</span>
                <span className="font-bold text-purple-300 bg-purple-400/10 border border-purple-400/30 px-2 py-0.5 rounded">LB / RB (L1 / R1)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
          <div className="text-xs font-mono text-muted-foreground">
            💡 Tip: Click anywhere on the emulator screen if keyboard inputs stop responding.
          </div>
          <Button
            size="sm"
            onClick={onClose}
            className="bg-[#00f0ff] hover:bg-[#00c8d6] text-black font-mono font-bold text-xs"
          >
            Got It, Let's Play!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
