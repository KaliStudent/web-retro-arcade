import { Game, Settings } from "@shared/schema";

export async function getAllGames(): Promise<Game[]> {
  const response = await fetch('/api/games');
  if (!response.ok) throw new Error('Failed to fetch games');
  return response.json();
}

export async function getGamesByFilter(filter: 'favorites' | 'recent' | { system: string }): Promise<Game[]> {
  let url = '/api/games?';
  if (filter === 'favorites') {
    url += 'favorites=true';
  } else if (filter === 'recent') {
    url += 'recent=true';
  } else {
    url += `system=${filter.system}`;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch games');
  return response.json();
}

// Get or create session ID
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('retroarcade_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('retroarcade_session_id', sessionId);
  }
  return sessionId;
}

export async function uploadGame(file: File, title: string, system: string): Promise<Game> {
  const formData = new FormData();
  formData.append('rom', file);
  formData.append('title', title);
  formData.append('system', system);
  formData.append('sessionId', getSessionId());

  const response = await fetch('/api/games/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Failed to upload game');
  return response.json();
}

export async function cleanupSession(): Promise<void> {
  const sessionId = sessionStorage.getItem('retroarcade_session_id');
  if (!sessionId) return;

  try {
    await fetch('/api/cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

export async function toggleFavorite(gameId: string): Promise<Game> {
  const response = await fetch(`/api/games/${gameId}/favorite`, {
    method: 'PATCH',
  });
  if (!response.ok) throw new Error('Failed to toggle favorite');
  return response.json();
}

export async function updateLastPlayed(gameId: string): Promise<Game> {
  const response = await fetch(`/api/games/${gameId}/play`, {
    method: 'PATCH',
  });
  if (!response.ok) throw new Error('Failed to update last played');
  return response.json();
}

export async function deleteGame(gameId: string): Promise<void> {
  const response = await fetch(`/api/games/${gameId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete game');
}

export async function getSettings(): Promise<Settings> {
  const response = await fetch('/api/settings');
  if (!response.ok) throw new Error('Failed to fetch settings');
  return response.json();
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  const response = await fetch('/api/settings', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update settings');
  return response.json();
}
