import { useEffect, useRef } from "react";
import { type QuadPeer } from "@/lib/streamManager";
import { Tv, Radio, Gamepad2, Sparkles, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuadStreamArenaProps {
  peers: QuadPeer[];
  activeUserId?: string;
  activeCanvas?: HTMLCanvasElement | null;
  twitchChannel?: string;
}

const QUAD_CONFIGS = [
  {
    slot: 'TL',
    label: 'QUADRANT 1 : TOP-LEFT',
    border: 'border-[#00f0ff]',
    glow: 'shadow-[0_0_20px_rgba(0,240,255,0.35)]',
    text: 'text-[#00f0ff]',
    badgeBg: 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/40',
  },
  {
    slot: 'TR',
    label: 'QUADRANT 2 : TOP-RIGHT',
    border: 'border-[#ff7700]',
    glow: 'shadow-[0_0_20px_rgba(255,119,0,0.35)]',
    text: 'text-[#ff7700]',
    badgeBg: 'bg-[#ff7700]/20 text-[#ff7700] border-[#ff7700]/40',
  },
  {
    slot: 'BL',
    label: 'QUADRANT 3 : BOTTOM-LEFT',
    border: 'border-[#39ff14]',
    glow: 'shadow-[0_0_20px_rgba(57,255,20,0.35)]',
    text: 'text-[#39ff14]',
    badgeBg: 'bg-[#39ff14]/20 text-[#39ff14] border-[#39ff14]/40',
  },
  {
    slot: 'BR',
    label: 'QUADRANT 4 : BOTTOM-RIGHT',
    border: 'border-[#ff007f]',
    glow: 'shadow-[0_0_20px_rgba(255,0,127,0.35)]',
    text: 'text-[#ff007f]',
    badgeBg: 'bg-[#ff007f]/20 text-[#ff00aa] border-[#ff007f]/40',
  },
];

export function QuadStreamArena({
  peers = [],
  activeUserId,
  activeCanvas,
  twitchChannel = 'NeonArcadeLive',
}: QuadStreamArenaProps) {
  const localContainerRef = useRef<HTMLDivElement>(null);

  // If local active canvas provided, render it in the matching slot
  useEffect(() => {
    if (activeCanvas && localContainerRef.current) {
      localContainerRef.current.innerHTML = '';
      const clone = activeCanvas.cloneNode(true) as HTMLCanvasElement;
      localContainerRef.current.appendChild(clone);
    }
  }, [activeCanvas]);

  return (
    <div className="w-full bg-[#070914] rounded-2xl border border-[#00f0ff]/30 p-4 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
      {/* Arena Banner */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#00f0ff]/20 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#ff007f]/20 text-[#ff00aa] border border-[#ff007f]/40 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#ff007f]" />
            TWITCH QUAD-SPLIT ARENA
          </span>
          <span className="text-xs font-mono text-cyan-300">
            Broadcasting 4 Players Simultaneously
          </span>
        </div>

        <a
          href={`https://twitch.tv/${twitchChannel}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs font-mono text-[#00f0ff] hover:underline"
        >
          <Tv className="h-3.5 w-3.5" />
          twitch.tv/{twitchChannel}
        </a>
      </div>

      {/* 4-Quadrant Grid (2x2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 aspect-video max-h-[75vh]">
        {QUAD_CONFIGS.map((config, index) => {
          const peer = peers[index] || {
            id: `empty_${index}`,
            username: `Awaiting Player ${index + 1}...`,
            gameTitle: 'Neon Arcade Ready',
            system: 'ARCADE',
            quadrant: config.slot as any,
          };

          const isLocalPlayer = peer.id === activeUserId;

          return (
            <div
              key={config.slot}
              className={`relative rounded-xl overflow-hidden border-2 ${config.border} ${config.glow} bg-[#0c1024] flex flex-col justify-between p-3`}
            >
              {/* Top HUD */}
              <div className="flex items-center justify-between z-10 mb-2">
                <span className={`text-[10px] font-mono font-bold tracking-wider ${config.text}`}>
                  {config.label}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${config.badgeBg}`}>
                  {peer.system}
                </span>
              </div>

              {/* Center Feed Area */}
              <div className="relative flex-1 flex items-center justify-center rounded-lg overflow-hidden bg-black/60 border border-white/5">
                {isLocalPlayer && activeCanvas ? (
                  <div
                    ref={localContainerRef}
                    className="w-full h-full flex items-center justify-center pointer-events-none"
                  />
                ) : peer.lastFrameDataUrl ? (
                  <img
                    src={peer.lastFrameDataUrl}
                    alt={peer.gameTitle}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    <Gamepad2 className={`h-10 w-10 mb-2 opacity-50 ${config.text}`} />
                    <span className="font-mono text-xs text-white/80 font-bold">
                      {peer.username}
                    </span>
                    <span className="text-[11px] text-cyan-200/60 font-mono">
                      {peer.gameTitle}
                    </span>
                  </div>
                )}

                {/* CRT Scanline Overlay */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/20 to-black/60" />
              </div>

              {/* Bottom Player Tag */}
              <div className="flex items-center justify-between z-10 mt-2 font-mono text-xs">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isLocalPlayer ? 'bg-[#39ff14] animate-ping' : 'bg-[#00f0ff]'}`} />
                  <span className="text-white font-bold">{peer.username}</span>
                  {isLocalPlayer && (
                    <span className="text-[10px] text-[#39ff14] font-bold">(YOU)</span>
                  )}
                </div>
                <span className="text-cyan-300/80 text-[11px] truncate max-w-[140px]">
                  {peer.gameTitle}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
