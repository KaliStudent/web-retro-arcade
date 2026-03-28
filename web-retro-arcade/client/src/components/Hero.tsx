import { Play, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@assets/stock_images/retro_gaming_arcade__6ad8b852.jpg";

interface HeroProps {
  onGetStarted?: () => void;
  onUpload?: () => void;
}

export function Hero({ onGetStarted, onUpload }: HeroProps) {
  return (
    <div className="relative w-full h-[70vh] min-h-[500px] overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-background/60 to-background/90" />
      
      <div className="relative h-full flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto">
        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6">
          RetroArch Web
        </h1>
        <p className="text-lg md:text-xl text-foreground/90 mb-8 max-w-2xl">
          Experience classic gaming in your browser. Play NES, SNES, Game Boy, Genesis, and more with save states, controller support, and authentic retro vibes.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Button
            size="lg"
            onClick={onGetStarted}
            data-testid="button-get-started"
            className="gap-2"
          >
            <Play className="h-5 w-5" />
            Start Playing
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onUpload}
            data-testid="button-upload-rom"
            className="gap-2 backdrop-blur-sm bg-background/20"
          >
            <Upload className="h-5 w-5" />
            Upload ROM
          </Button>
        </div>
      </div>
    </div>
  );
}
