import { StreamCoordinator } from './streamCoordinator';

export { StreamCoordinator };

export interface Env {
  STREAM_COORDINATOR: DurableObjectNamespace;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_STREAM_API_TOKEN?: string;
  TWITCH_STREAM_KEY?: string;
  TWITCH_CHANNEL_NAME?: string;
  SIMULATION_MODE?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // 1. WebSocket & Room State routed to StreamCoordinator Durable Object
    if (url.pathname.startsWith('/api/stream-room')) {
      const coordinatorId = env.STREAM_COORDINATOR.idFromName('global-arcade-arena');
      const coordinator = env.STREAM_COORDINATOR.get(coordinatorId);

      // Rewrite URL for Durable Object
      const newPath = url.pathname.replace('/api/stream-room', '') || '/state';
      const doUrl = new URL(request.url);
      doUrl.pathname = newPath;

      const subRequest = new Request(doUrl.toString(), request);
      const response = await coordinator.fetch(subRequest);

      // Add CORS headers to response
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
        webSocket: response.webSocket,
      });
    }

    // 2. Cloudflare Stream Live Ingest / WHIP Provisioning Endpoint
    if (url.pathname === '/api/stream/whip-session' && request.method === 'POST') {
      try {
        const body = (await request.json().catch(() => ({}))) as any;
        const { userId, username, gameTitle } = body;

        // Check if real Cloudflare credentials are configured
        if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_STREAM_API_TOKEN) {
          const liveInput = await createOrGetCloudflareLiveInput(env);
          return new Response(
            JSON.stringify({
              success: true,
              mode: 'cloudflare_stream_live',
              whipUrl: liveInput.whipUrl,
              liveInputId: liveInput.id,
              twitchChannel: env.TWITCH_CHANNEL_NAME || 'NeonArcadeLive',
              message: 'Connected to Cloudflare Stream Live with Twitch RTMP egress',
            }),
            {
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        }

        // Automatic Simulation / Arena Fallback Mode
        return new Response(
          JSON.stringify({
            success: true,
            mode: 'arcade_mesh_simulated',
            whipUrl: `${url.origin}/api/stream/simulated-whip`,
            twitchChannel: env.TWITCH_CHANNEL_NAME || 'NeonArcadeLive',
            message: 'Running in Arcade Arena Mode with client canvas relay and queue management',
            isSimulation: true,
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err.message,
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    }

    // Health check endpoint
    if (url.pathname === '/health' || url.pathname === '/') {
      return new Response(
        JSON.stringify({
          status: 'online',
          service: 'Neon Retro Arcade Stream Coordinator',
          twitchChannel: env.TWITCH_CHANNEL_NAME || 'NeonArcadeLive',
          cloudflareStreamLiveReady: !!(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_STREAM_API_TOKEN),
          timestamp: new Date().toISOString(),
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    return new Response('Not Found', { status: 404 });
  },
};

/**
 * Creates or fetches an active Cloudflare Stream Live Input with Twitch RTMP output
 */
async function createOrGetCloudflareLiveInput(env: Env) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_STREAM_API_TOKEN;

  // 1. Create a Live Input with WebRTC WHIP mode
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      meta: { name: 'Neon Retro Arcade Twitch Live' },
      recording: { mode: 'off' },
    }),
  });

  const data = (await response.json()) as any;
  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || 'Failed to create Cloudflare Live Input');
  }

  const liveInput = data.result;
  const inputId = liveInput.uid;
  const whipUrl = liveInput.webRTC?.url;

  // 2. Configure Twitch RTMP output if stream key provided
  if (env.TWITCH_STREAM_KEY) {
    await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs/${inputId}/outputs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'rtmp://live.twitch.tv/app',
        streamKey: env.TWITCH_STREAM_KEY,
      }),
    });
  }

  return {
    id: inputId,
    whipUrl,
  };
}
