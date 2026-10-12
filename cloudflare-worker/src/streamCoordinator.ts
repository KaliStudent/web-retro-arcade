/**
 * StreamCoordinator Durable Object
 * Manages live streamer queue, handoff locks, heartbeat health, and 4-way Quad Split Arena
 */

export interface StreamParticipant {
  id: string;
  username: string;
  gameTitle: string;
  system: string;
  joinedAt: number;
  lastHeartbeat: number;
  isStreaming: boolean;
  quadrant?: 'TL' | 'TR' | 'BL' | 'BR';
}

export interface StreamRoomState {
  activeStreamer: StreamParticipant | null;
  queue: StreamParticipant[];
  isQuadMode: boolean;
  quadStreamers: StreamParticipant[];
  totalConnected: number;
  twitchChannel: string;
}

export class StreamCoordinator {
  private state: DurableObjectState;
  private env: any;
  private participants: Map<string, StreamParticipant> = new Map();
  private queue: string[] = []; // User IDs in queue
  private sockets: Map<string, WebSocket> = new Map();

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade for real-time streaming state & coordination
    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      await this.handleWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    // HTTP Status endpoint
    if (url.pathname === '/state') {
      return new Response(JSON.stringify(this.getRoomState()), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleWebSocket(ws: WebSocket) {
    ws.accept();
    let currentUserId: string | null = null;

    ws.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data as string);

        switch (data.type) {
          case 'JOIN_QUEUE': {
            const { userId, username, gameTitle, system } = data;
            currentUserId = userId;
            this.sockets.set(userId, ws);

            const participant: StreamParticipant = {
              id: userId,
              username: username || 'RetroGamer_' + userId.slice(-4),
              gameTitle: gameTitle || 'Classic Retro Arcade',
              system: system || 'NES',
              joinedAt: Date.now(),
              lastHeartbeat: Date.now(),
              isStreaming: true,
            };

            this.participants.set(userId, participant);

            if (!this.queue.includes(userId)) {
              this.queue.push(userId);
            }

            this.recalculateStreamState();
            this.broadcastRoomState();
            break;
          }

          case 'LEAVE_QUEUE': {
            if (data.userId) {
              this.removeParticipant(data.userId);
              this.recalculateStreamState();
              this.broadcastRoomState();
            }
            break;
          }

          case 'HEARTBEAT': {
            if (data.userId && this.participants.has(data.userId)) {
              const p = this.participants.get(data.userId)!;
              p.lastHeartbeat = Date.now();
            }
            break;
          }

          case 'QUAD_FRAME_SYNC': {
            // Relay lightweight frame metadata or canvas snapshot in quad mode
            this.broadcastToOthers(data.userId, {
              type: 'QUAD_FRAME_UPDATE',
              senderId: data.userId,
              frame: data.frame,
              quadrant: data.quadrant,
            });
            break;
          }
        }
      } catch (err) {
        console.error('WS Message parsing error:', err);
      }
    });

    const cleanup = () => {
      if (currentUserId) {
        this.removeParticipant(currentUserId);
        this.sockets.delete(currentUserId);
        this.recalculateStreamState();
        this.broadcastRoomState();
      }
    };

    ws.addEventListener('close', cleanup);
    ws.addEventListener('error', cleanup);
  }

  private removeParticipant(userId: string) {
    this.participants.delete(userId);
    this.queue = this.queue.filter((id) => id !== userId);
    this.sockets.delete(userId);
  }

  private recalculateStreamState() {
    const activeParticipants = this.queue
      .map((id) => this.participants.get(id))
      .filter((p): p is StreamParticipant => !!p);

    const count = activeParticipants.length;

    // Rule: If 4 or more users simultaneously choose to stream: Quad Mode!
    if (count >= 4) {
      const quadStreamers = activeParticipants.slice(0, 4);
      const quadrants: ('TL' | 'TR' | 'BL' | 'BR')[] = ['TL', 'TR', 'BL', 'BR'];

      quadStreamers.forEach((p, index) => {
        p.quadrant = quadrants[index];
        const socket = this.sockets.get(p.id);
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: 'QUAD_ASSIGNMENT',
              quadrant: p.quadrant,
              slotIndex: index + 1,
              peers: quadStreamers.map((q) => ({
                id: q.id,
                username: q.username,
                gameTitle: q.gameTitle,
                system: q.system,
                quadrant: q.quadrant,
              })),
            })
          );
        }
      });
    } else {
      // 1 to 3 users: Single active streamer with sequential queue handoff!
      activeParticipants.forEach((p) => {
        delete p.quadrant;
      });

      if (activeParticipants.length > 0) {
        const active = activeParticipants[0];
        const activeSocket = this.sockets.get(active.id);
        if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
          activeSocket.send(
            JSON.stringify({
              type: 'PROMOTED_TO_ACTIVE',
              message: 'YOU ARE LIVE ON TWITCH!',
              slot: 1,
              totalInQueue: activeParticipants.length,
            })
          );
        }

        // Notify standby players
        for (let i = 1; i < activeParticipants.length; i++) {
          const waiting = activeParticipants[i];
          const waitingSocket = this.sockets.get(waiting.id);
          if (waitingSocket && waitingSocket.readyState === WebSocket.OPEN) {
            waitingSocket.send(
              JSON.stringify({
                type: 'STANDBY_QUEUE',
                position: i,
                activeStreamerName: active.username,
                message: `You are in line (#${i}). Your stream will automatically take over when ${active.username} stops playing.`,
              })
            );
          }
        }
      }
    }
  }

  public getRoomState(): StreamRoomState {
    const activeParticipants = this.queue
      .map((id) => this.participants.get(id))
      .filter((p): p is StreamParticipant => !!p);

    const isQuadMode = activeParticipants.length >= 4;

    return {
      activeStreamer: activeParticipants[0] || null,
      queue: activeParticipants.slice(isQuadMode ? 4 : 1),
      isQuadMode,
      quadStreamers: isQuadMode ? activeParticipants.slice(0, 4) : [],
      totalConnected: this.participants.size,
      twitchChannel: this.env.TWITCH_CHANNEL_NAME || 'NeonArcadeLive',
    };
  }

  private broadcastRoomState() {
    const state = this.getRoomState();
    const payload = JSON.stringify({ type: 'ROOM_STATE_UPDATE', state });

    for (const [_, socket] of this.sockets.entries()) {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(payload);
        } catch (e) {
          // ignore dead sockets
        }
      }
    }
  }

  private broadcastToOthers(senderId: string, message: any) {
    const payload = JSON.stringify(message);
    for (const [userId, socket] of this.sockets.entries()) {
      if (userId !== senderId && socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(payload);
        } catch (e) {}
      }
    }
  }
}
