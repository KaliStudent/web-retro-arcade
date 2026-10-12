import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface SystemCardProps {
  name: string;
  icon: LucideIcon;
  romCount: number;
  formats: string[];
  isActive?: boolean;
  onClick?: () => void;
}

export function SystemCard({ name, icon: Icon, romCount, formats, isActive, onClick }: SystemCardProps) {
  return (
    <Card
      className={`p-4 cursor-pointer transition-all duration-200 rounded-xl bg-[#090d20] border ${
        isActive
          ? "border-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.4)] bg-[#0e1634]"
          : "border-[#00f0ff]/20 hover:border-[#00f0ff]/60 hover:bg-[#0c1228]"
      }`}
      onClick={onClick}
      data-testid={`card-system-${name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex flex-col items-center text-center gap-2.5">
        <div
          className={`p-3 rounded-lg transition-colors ${
            isActive
              ? "bg-[#00f0ff] text-black shadow-[0_0_15px_rgba(0,240,255,0.6)]"
              : "bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30"
          }`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-white font-mono">{name}</h3>
          <p className="text-xs text-cyan-200/60 mt-0.5 font-mono">
            {romCount} {romCount === 1 ? 'game' : 'games'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 justify-center">
          {formats.map((format) => (
            <span
              key={format}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-cyan-300/80 border border-white/5"
            >
              {format}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
