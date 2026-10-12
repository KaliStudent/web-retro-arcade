import { useEffect, useState } from "react";
import { streamManager, type StreamState } from "@/lib/streamManager";
import { Tv, Radio, Users, Sparkles, Grid2X2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LiveTwitchBarProps {
  onOpenQuadArena?: () => void;
}

export function LiveTwitchBar({ onOpenQuadArena }: LiveTwitchBarProps) {
  const [streamState, setStreamState] = useState<StreamState>(streamManager.getState());

  useEffect(() => {
    return streamManager.subscribe((state) => {
      setStreamState(state);
    });
  }, []);

  const isLive = streamState.queueState === 'LIVE';
  const isQuad = streamState.queueState === 'QUAD';
  const isStandby = streamState.queueState === 'STANDBY';

  return (
    <div className="w-full bg-gradient-to-r from-[#060814] via-[#0d162f] to-[#060814] border-b border-[#00f0ff]/20 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap text-xs font-mono">
        {/* Left: Stream Status Indicator */}
        <div className="flex items-center gap-3">
          {isQuad ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ff007f]/20 text-[#ff00aa] border border-[#ff007f]/40 font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-[#ff007f]" />
              ⚡ 4-PLAYER QUAD ARENA ACTIVE
            </span>
          ) : isLive ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ff007f]/20 text-[#ff00aa] border border-[#ff007f]/40 font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-[#ff007f]" />
              🔴 LIVE ON TWITCH
            </span>
          ) : isStandby ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ff7700]/20 text-[#ff7700] border border-[#ff7700]/40 font-bold">
              <span className="w-2 h-2 rounded-full bg-[#ff7700]" />
              ⏳ QUEUE POSITION #{streamState.position}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00f0ff]/10 text-cyan-300 border border-[#00f0ff]/30">
              <span className="w-2 h-2 rounded-full bg-[#00f0ff]" />
              TWITCH BROADCAST READY
            </span>
          )}

          {/* Streamer Detail Message */}
          <div className="hidden sm:flex items-center gap-2 text-cyan-200/90">
            {isQuad ? (
              <span>4 players battling simultaneously across quadrants!</span>
            ) : isLive ? (
              <span>
                Active Streamer: <strong className="text-white">{streamState.activeStreamerName || 'You'}</strong>
              </span>
            ) : isStandby ? (
              <span>
                Active: <strong className="text-white">{streamState.activeStreamerName}</strong> (Your stream starts next)
              </span>
            ) : (
              <span>Single-streamer handoff lock &amp; 4-way Quad Arena enabled</span>
            )}
          </div>
        </div>

        {/* Right: Actions & Twitch Link */}
        <div className="flex items-center gap-2 ml-auto">
          {onOpenQuadArena && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenQuadArena}
              className="h-7 text-[11px] bg-[#0c142b] border-[#00f0ff]/30 text-cyan-300 hover:text-white hover:bg-[#00f0ff]/20 gap-1.5"
            >
              <Grid2X2 className="h-3 w-3 text-[#00f0ff]" />
              Quad Arena
            </Button>
          )}

          <a
            href={`https://twitch.tv/${streamState.twitchChannel}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#ff007f]/10 hover:bg-[#ff007f]/20 border border-[#ff007f]/30 text-[#ff00aa] hover:text-white transition-colors"
          >
            <Tv className="h-3.5 w-3.5" />
            <span>twitch.tv/{streamState.twitchChannel}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
