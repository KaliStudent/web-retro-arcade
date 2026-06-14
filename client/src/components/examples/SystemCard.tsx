import { SystemCard } from '../SystemCard';
import { Gamepad2 } from 'lucide-react';

export default function SystemCardExample() {
  return (
    <div className="p-8 bg-background">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-w-4xl">
        <SystemCard
          name="NES"
          icon={Gamepad2}
          romCount={12}
          formats={['.nes']}
          isActive={true}
        />
        <SystemCard
          name="SNES"
          icon={Gamepad2}
          romCount={8}
          formats={['.smc', '.sfc']}
        />
        <SystemCard
          name="Game Boy"
          icon={Gamepad2}
          romCount={15}
          formats={['.gb', '.gbc']}
        />
      </div>
    </div>
  );
}
