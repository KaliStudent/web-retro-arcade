import { GameCard } from '../GameCard';
import coverImage from '@assets/stock_images/vintage_video_game_c_416e4be6.jpg';

export default function GameCardExample() {
  return (
    <div className="p-8 bg-background">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-6xl">
        <GameCard
          id="game-1"
          title="Super Mario Bros"
          system="NES"
          coverImage={coverImage}
          lastPlayed="2h ago"
          isFavorite={true}
        />
        <GameCard
          id="game-2"
          title="The Legend of Zelda"
          system="NES"
          lastPlayed="1d ago"
        />
        <GameCard
          id="game-3"
          title="Pokemon Red"
          system="Game Boy"
          isFavorite={false}
        />
      </div>
    </div>
  );
}
