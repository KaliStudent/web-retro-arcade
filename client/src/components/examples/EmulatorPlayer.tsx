import { EmulatorPlayer } from '../EmulatorPlayer';

export default function EmulatorPlayerExample() {
  return (
    <div className="p-8 bg-background">
      <EmulatorPlayer
        gameId="nes-smb"
        gameName="Super Mario Bros"
        system="NES"
        onClose={() => console.log('Close emulator')}
      />
    </div>
  );
}
