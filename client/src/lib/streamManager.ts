/**
 * Retro Arcade Stream Manager
 * Coordinates Twitch broadcasting, Cloudflare Stream WHIP sessions,
 * single-streamer queues, and 4-way Quad Split Arena
 */

import { whipClient } from './whipClient';
import { executeRecaptcha } from './recaptcha';

export type StreamMode = 'SOLO' | 'STREAMING';

export type QueueState = 'LIVE' | 'STANDBY' | 'QUAD' | 'OFFLINE';

export interface QuadPeer {
  id: string;
  username: string;
  gameTitle: string;
  system: string;
  quadrant?: 'TL' | 'TR' | 'BL' | 'BR';
  lastFrameDataUrl?: string;
}

export interface StreamState {
  mode: StreamMode;
  queueState: QueueState;
  position: number;
  totalInQueue: number;
  activeStreamerName: string;
  quadrant?: 'TL' | 'TR' | 'BL' | 'BR';
  quadPeers: QuadPeer[];
  twitchChannel: string;
  isSimulated: boolean;
  connected: boolean;
}

type Listener = (state: StreamState) => void;

class StreamManager {
  private socket: WebSocket | null = null;
  private userId: string;
  private username: string = 'RetroHero';
  private currentGameTitle: string = 'Classic Retro Arcade';
  private currentSystem: string = 'NES';
  private heartbeatInterval: any = null;
  private frameSyncInterval: any = null;
  private listeners: Listener[] = [];
  private attachedCanvas: HTMLCanvasElement | null = null;
  private isWhipActive: boolean = false;

  private state: StreamState = {
    mode: 'SOLO',
    queueState: 'OFFLINE',
    position: 0,
    totalInQueue: 0,
    activeStreamerName: '',
    quadPeers: [],
    twitchChannel: 'NeonArcadeLive',
    isSimulated: false,
    connected: false,
  };

  constructor() {
    this.userId = this.getOrCreateUserId();
  }

  private getOrCreateUserId(): string {
    let id = localStorage.getItem('retro_arcade_user_id');
    if (!id) {
      id = 'player_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('retro_arcade_user_id', id);
    }
    return id;
  }

  public getUserId(): string {
    return this.userId;
  }

  public getState(): StreamState {
    return { ...this.state };
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private updateState(partial: Partial<StreamState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((l) => l(this.getState()));
  }

  public setMode(mode: StreamMode) {
    this.updateState({ mode });
    if (mode === 'SOLO') {
      this.leaveQueue();
    }
  }

  public attachCanvas(canvas: HTMLCanvasElement | null) {
    this.attachedCanvas = canvas;
    if (canvas && this.state.queueState === 'LIVE' && !this.isWhipActive) {
      this.startLiveBroadcast();
    }
  }

  /**
   * Connect to Stream Coordinator and join the broadcast queue
   */
  public joinQueue(username: string, gameTitle: string, system: string) {
    this.username = username || 'RetroGamer_' + this.userId.slice(-4);
    this.currentGameTitle = gameTitle;
    this.currentSystem = system;
    this.updateState({ mode: 'STREAMING' });

    // If running on Vercel without a dedicated Cloudflare Worker WS endpoint configured,
    // seamlessly use the realistic arcade simulation engine to avoid browser WebSocket errors.
    const customWsUrl = (import.meta as any).env?.VITE_WORKER_WS_URL;
    const isVercelHost = window.location.host.includes('vercel.app') || window.location.host.includes('ceaseandquiet.com');

    if (!customWsUrl && isVercelHost) {
      this.activateSimulationFallback();
      return;
    }

    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = customWsUrl || `${protocol}//${window.location.host}/api/stream-room/ws`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.updateState({ connected: true, isSimulated: false });
        this.send({
          type: 'JOIN_QUEUE',
          userId: this.userId,
          username: this.username,
          gameTitle: this.currentGameTitle,
          system: this.currentSystem,
        });

        this.startHeartbeat();
        this.startFrameSync();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };

      this.socket.onclose = () => {
        this.stopIntervals();
        // If real connection closed and we are in STREAMING mode, activate realistic simulation
        if (this.state.mode === 'STREAMING') {
          this.activateSimulationFallback();
        } else {
          this.updateState({ connected: false, queueState: 'OFFLINE' });
        }
      };

      this.socket.onerror = () => {
        // Fallback to simulation mode for standalone client dev
        this.activateSimulationFallback();
      };
    } catch (err) {
      this.activateSimulationFallback();
    }
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'PROMOTED_TO_ACTIVE':
        this.updateState({
          queueState: 'LIVE',
          position: 1,
          totalInQueue: data.totalInQueue || 1,
          activeStreamerName: this.username,
        });
        this.startLiveBroadcast();
        break;

      case 'STANDBY_QUEUE':
        this.updateState({
          queueState: 'STANDBY',
          position: data.position,
          activeStreamerName: data.activeStreamerName,
        });
        this.stopLiveBroadcast();
        break;

      case 'QUAD_ASSIGNMENT':
        this.updateState({
          queueState: 'QUAD',
          quadrant: data.quadrant,
          quadPeers: data.peers || [],
        });
        break;

      case 'ROOM_STATE_UPDATE':
        if (data.state) {
          const { activeStreamer, queue, isQuadMode, quadStreamers, twitchChannel } = data.state;
          if (isQuadMode) {
            this.updateState({
              queueState: 'QUAD',
              quadPeers: quadStreamers,
              twitchChannel: twitchChannel || this.state.twitchChannel,
            });
          } else if (activeStreamer && activeStreamer.id === this.userId) {
            this.updateState({
              queueState: 'LIVE',
              position: 1,
              activeStreamerName: this.username,
              totalInQueue: 1 + (queue ? queue.length : 0),
            });
            this.startLiveBroadcast();
          } else if (activeStreamer) {
            const myIndex = queue ? queue.findIndex((p: any) => p.id === this.userId) : -1;
            this.updateState({
              queueState: 'STANDBY',
              position: myIndex >= 0 ? myIndex + 2 : 2,
              activeStreamerName: activeStreamer.username,
              totalInQueue: 1 + (queue ? queue.length : 0),
            });
            this.stopLiveBroadcast();
          }
        }
        break;

      case 'QUAD_FRAME_UPDATE':
        if (data.senderId && data.frame) {
          const peers = [...this.state.quadPeers];
          const peer = peers.find((p) => p.id === data.senderId);
          if (peer) {
            peer.lastFrameDataUrl = data.frame;
            this.updateState({ quadPeers: peers });
          }
        }
        break;
    }
  }

  /**
   * Starts live broadcast via Cloudflare Stream WHIP (guarded by reCAPTCHA v3)
   */
  private async startLiveBroadcast() {
    if (this.isWhipActive) return;
    this.isWhipActive = true;

    try {
      // 1. Obtain reCAPTCHA v3 token
      const { token } = await executeRecaptcha('stream_broadcast');

      // 2. Provision WHIP session from Cloudflare exterior pipeline
      const workerUrl = (import.meta as any).env?.VITE_WORKER_URL;
      const endpoint = workerUrl ? `${workerUrl.replace(/\/$/, '')}/api/stream/whip-session` : '/api/stream/whip-session';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          username: this.username,
          gameTitle: this.currentGameTitle,
          system: this.currentSystem,
          recaptchaToken: token,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.twitchChannel) {
          this.updateState({ twitchChannel: data.twitchChannel });
        }

        // 3. If real Cloudflare Stream WHIP URL is returned, establish WebRTC
        if (data.whipUrl && data.mode === 'cloudflare_stream_live' && this.attachedCanvas) {
          console.log('[StreamManager] Connecting 60 FPS WebRTC WHIP broadcast to Cloudflare Stream Live...');
          await whipClient.start(this.attachedCanvas, data.whipUrl);
        } else {
          console.log('[StreamManager] Live arcade broadcast active (Simulated / Mesh mode)');
        }
      }
    } catch (err) {
      console.warn('[StreamManager] Live broadcast provisioning notice:', err);
    }
  }

  private async stopLiveBroadcast() {
    this.isWhipActive = false;
    await whipClient.stop();
  }

  private send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  public leaveQueue() {
    this.stopIntervals();
    this.stopLiveBroadcast();
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.send({ type: 'LEAVE_QUEUE', userId: this.userId });
      this.socket.close();
    }
    this.socket = null;
    this.updateState({
      queueState: 'OFFLINE',
      position: 0,
      connected: false,
    });
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'HEARTBEAT', userId: this.userId });
    }, 15000);
  }

  private startFrameSync() {
    this.frameSyncInterval = setInterval(() => {
      if (this.state.queueState === 'QUAD' && this.attachedCanvas) {
        try {
          // Send downscaled frame snapshot for quad arena peers
          const dataUrl = this.attachedCanvas.toDataURL('image/jpeg', 0.5);
          this.send({
            type: 'QUAD_FRAME_SYNC',
            userId: this.userId,
            frame: dataUrl,
            quadrant: this.state.quadrant,
          });
        } catch (e) {
          // ignore canvas taint
        }
      }
    }, 500); // 2 FPS sync for lightweight peer previews
  }

  private stopIntervals() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.frameSyncInterval) clearInterval(this.frameSyncInterval);
    this.heartbeatInterval = null;
    this.frameSyncInterval = null;
  }

  /**
   * Simulation Fallback Mode
   * Provides realistic broadcast simulation and testing when running offline
   */
  private activateSimulationFallback() {
    console.log('[StreamManager] Activating Retro Arcade Simulation Engine');
    this.updateState({
      connected: true,
      isSimulated: true,
      queueState: 'LIVE',
      position: 1,
      totalInQueue: 1,
      activeStreamerName: this.username,
      twitchChannel: 'NeonArcadeLive',
    });
    this.startLiveBroadcast();
  }

  /**
   * Manually trigger Quad Mode Simulation for testing / demo
   */
  public simulateQuadMode(enabled: boolean) {
    if (!enabled) {
      this.updateState({
        queueState: 'LIVE',
        position: 1,
        quadPeers: [],
      });
      return;
    }

    const demoPeers: QuadPeer[] = [
      {
        id: this.userId,
        username: this.username,
        gameTitle: this.currentGameTitle,
        system: this.currentSystem,
        quadrant: 'TL',
      },
      {
        id: 'peer_cyber_ninja',
        username: 'CyberNinja_99',
        gameTitle: 'Space Invaders Deluxe',
        system: 'NES',
        quadrant: 'TR',
      },
      {
        id: 'peer_laser_fox',
        username: 'LaserFox_84',
        gameTitle: 'Astro Hawk 16-Bit',
        system: 'SNES',
        quadrant: 'BL',
      },
      {
        id: 'peer_neon_rider',
        username: 'NeonRider_2026',
        gameTitle: 'Barbarian Arcade Action',
        system: 'Genesis',
        quadrant: 'BR',
      },
    ];

    this.updateState({
      queueState: 'QUAD',
      quadrant: 'TL',
      quadPeers: demoPeers,
      isSimulated: true,
    });
  }
}

export const streamManager = new StreamManager();
