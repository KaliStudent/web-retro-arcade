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
      className={`p-4 cursor-pointer transition-all hover-elevate active-elevate-2 ${
        isActive ? "border-primary" : ""
      }`}
      onClick={onClick}
      data-testid={`card-system-${name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex flex-col items-center text-center gap-3">
        <div className={`p-3 rounded-md ${isActive ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{name}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {romCount} {romCount === 1 ? 'game' : 'games'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 justify-center">
          {formats.map((format) => (
            <Badge key={format} variant="secondary" className="text-xs">
              {format}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}
