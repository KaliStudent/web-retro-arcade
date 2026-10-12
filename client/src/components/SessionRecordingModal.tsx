import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Copy, Check, ExternalLink, Video, Clock, HardDrive, Gamepad2 } from "lucide-react";
import { useState } from "react";
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
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!recording) return null;

  const handleDownload = () => {
    videoRecorder.downloadResult(recording);
    toast({
      title: "Download Started",
      description: `Saved ${recording.filename} (${recording.sizeFormatted})`,
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Link Copied",
      description: "Arcade session link copied to clipboard!",
    });
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(
      `Check out my ${recording.durationFormatted} retro gameplay run of ${gameTitle} on Web Retro Arcade! 🎮🕹️`
    );
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareToReddit = () => {
    const title = encodeURIComponent(`Retro Arcade Gameplay: ${gameTitle} (${recording.durationFormatted})`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.reddit.com/submit?url=${url}&title=${title}`, '_blank');
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
            Your private gameplay session has been encoded and ready for playback or export.
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

          {/* Download & Social Sharing */}
          <div className="space-y-3">
            <Button
              onClick={handleDownload}
              className="w-full font-display font-bold uppercase tracking-wider text-black bg-[#39ff14] hover:bg-[#30e210] shadow-[0_0_25px_rgba(57,255,20,0.5)] gap-2 py-6 text-base"
            >
              <Download className="h-5 w-5" />
              Download Gameplay Video (.webm)
            </Button>

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={shareToTwitter}
                className="bg-[#0e142e] border-[#00f0ff]/30 text-cyan-200 hover:text-white hover:bg-[#00f0ff]/20 font-mono text-xs gap-1.5"
              >
                <Share2 className="h-3.5 w-3.5 text-[#00f0ff]" />
                Share on X
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={shareToReddit}
                className="bg-[#0e142e] border-[#ff7700]/30 text-orange-200 hover:text-white hover:bg-[#ff7700]/20 font-mono text-xs gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#ff7700]" />
                Share to Reddit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="bg-[#0e142e] border-[#ff007f]/30 text-pink-200 hover:text-white hover:bg-[#ff007f]/20 font-mono text-xs gap-1.5"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-[#ff007f]" />}
                {copied ? "Copied!" : "Copy Link"}
              </Button>
            </div>
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
