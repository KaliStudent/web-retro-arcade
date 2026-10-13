import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Video, Clock, HardDrive } from "lucide-react";
import { type RecordingResult, videoRecorder } from "@/lib/videoRecorder";
import { useToast } from "@/hooks/use-toast";

interface SessionRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  recording: RecordingResult | null;
  gameTitle: string;
}

export function SessionRecordingModal({
  isOpen,
  onClose,
  recording,
  gameTitle,
}: SessionRecordingModalProps) {
  const { toast } = useToast();

  if (!recording) return null;

  const handleDownload = () => {
    videoRecorder.downloadResult(recording);
    toast({
      title: "Download Started",
      description: `Saved ${recording.filename} (${recording.sizeFormatted})`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[#090b17] border border-[#ff007f]/40 text-foreground shadow-[0_0_50px_rgba(255,0,127,0.25)]">
        <DialogHeader className="text-center pb-2 border-b border-[#ff007f]/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 text-xs font-mono font-bold uppercase rounded bg-[#ff007f]/20 text-[#ff00aa] border border-[#ff007f]/40">
              Session Replay
            </span>
            <span className="text-xs font-mono text-[#00f0ff] uppercase tracking-wider font-semibold">
              60 FPS WebM Capture
            </span>
          </div>
          <DialogTitle className="text-2xl font-display font-extrabold text-white tracking-wide">
            {gameTitle} - Gameplay Recording
          </DialogTitle>
          <DialogDescription className="text-sm text-pink-200/70">
            Your private gameplay session has been encoded and is ready for playback or download.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          {/* Video Player Preview */}
          <div className="relative rounded-xl overflow-hidden border border-[#00f0ff]/30 bg-black aspect-video flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.8)]">
            <video
              src={recording.url}
              controls
              autoPlay
              loop
              className="w-full h-full object-contain"
            />
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-[#0d1226] border border-[#00f0ff]/20 text-center font-mono text-xs">
            <div className="flex flex-col items-center gap-1">
              <span className="text-cyan-400 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Duration
              </span>
              <span className="text-white font-bold text-sm">{recording.durationFormatted}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[#ff7700] flex items-center gap-1">
                <HardDrive className="h-3.5 w-3.5" /> File Size
              </span>
              <span className="text-white font-bold text-sm">{recording.sizeFormatted}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[#39ff14] flex items-center gap-1">
                <Video className="h-3.5 w-3.5" /> Format
              </span>
              <span className="text-white font-bold text-sm">60 FPS WebM</span>
            </div>
          </div>

          {/* Download Action */}
          <div className="space-y-2">
            <Button
              onClick={handleDownload}
              className="w-full font-display font-bold uppercase tracking-wider text-black bg-[#39ff14] hover:bg-[#30e210] shadow-[0_0_25px_rgba(57,255,20,0.5)] gap-2 py-6 text-base"
            >
              <Download className="h-5 w-5" />
              Download Gameplay Video (.webm)
            </Button>
            <p className="text-[11px] text-center font-mono text-cyan-200/50">
              Session capture is stored locally in browser memory. Download the .webm file directly to your device.
            </p>
          </div>

          {/* Footer close */}
          <div className="flex justify-end pt-2 border-t border-[#ff007f]/20">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-cyan-300 hover:text-white font-mono text-xs uppercase"
            >
              Close &amp; Keep Playing
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
