import { StreamCoordinator } from './streamCoordinator';

export { StreamCoordinator };

export interface Env {
  STREAM_COORDINATOR: DurableObjectNamespace;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_STREAM_API_TOKEN?: string;
  TWITCH_STREAM_KEY?: string;
  TWITCH_CHANNEL_NAME?: string;
  RECAPTCHA_SECRET_KEY?: string;
  RECAPTCHA_SITE_KEY?: string;
  RECAPTCHA_MIN_SCORE?: string;
  ROM_BUCKET?: R2Bucket;
  SIMULATION_MODE?: string;
}

// Google reCAPTCHA v3 verification helper for Cloudflare Worker
async function verifyRecaptcha(
  secretKey?: string,
  token?: string,
  remoteIp?: string,
  minScoreStr?: string
): Promise<{ success: boolean; score?: number; action?: string; error?: string; isDemo?: boolean; details?: any }> {
  // In demo/test mode or when secret is unconfigured, bypass gracefully
  if (!secretKey || secretKey === 'test' || secretKey === 'demo' || secretKey === 'mock') {
    return { success: true, score: 1.0, isDemo: true };
  }

  if (!token) {
    return { success: false, error: 'Missing reCAPTCHA token' };
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', secretKey);
    params.append('response', token);
    if (remoteIp) {
      params.append('remoteip', remoteIp);
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = (await response.json()) as any;
    if (!data.success) {
      return {
        success: false,
        error: 'reCAPTCHA verification failed',
        details: data['error-codes'] || [],
      };
    }

    const minScore = parseFloat(minScoreStr || '0.5');
    if (typeof data.score === 'number' && data.score < minScore) {
      return {
        success: false,
        score: data.score,
        error: `Bot score ${data.score} below threshold ${minScore}`,
      };
    }

    return { success: true, score: data.score, action: data.action };
  } catch (err: any) {
    console.error('reCAPTCHA siteverify error:', err);
    return { success: false, error: 'reCAPTCHA service communication error' };
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        },
      });
    }

    const jsonResponse = (data: any, status: number = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    };

    // 1. reCAPTCHA v3 site-key and standalone verification endpoints
    if (url.pathname === '/api/recaptcha/site-key') {
      const siteKey = env.RECAPTCHA_SITE_KEY || '';
      const isEnabled = Boolean(env.RECAPTCHA_SECRET_KEY && env.RECAPTCHA_SECRET_KEY !== 'test');
      return jsonResponse({ siteKey, isEnabled, isDemo: !isEnabled });
    }

    if (url.pathname === '/api/recaptcha/verify' && request.method === 'POST') {
      try {
        const body = (await request.json().catch(() => ({}))) as any;
        const clientIp = request.headers.get('CF-Connecting-IP') || undefined;
        const result = await verifyRecaptcha(env.RECAPTCHA_SECRET_KEY, body.token, clientIp, env.RECAPTCHA_MIN_SCORE);
        if (!result.success) {
          return jsonResponse(result, 403);
        }
        return jsonResponse(result);
      } catch (err: any) {
        return jsonResponse({ success: false, error: err.message }, 500);
      }
    }

    // 2. WebSocket & Room State routed to StreamCoordinator Durable Object
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

    // 3. Cloudflare Stream Live Ingest / WHIP Provisioning Endpoint (Guarded by reCAPTCHA v3)
    if (url.pathname === '/api/stream/whip-session' && request.method === 'POST') {
      try {
        const body = (await request.json().catch(() => ({}))) as any;
        const { userId, username, gameTitle, recaptchaToken } = body;

        // Verify reCAPTCHA token
        const clientIp = request.headers.get('CF-Connecting-IP') || undefined;
        const recaptchaResult = await verifyRecaptcha(
          env.RECAPTCHA_SECRET_KEY,
          recaptchaToken,
          clientIp,
          env.RECAPTCHA_MIN_SCORE
        );

        if (!recaptchaResult.success) {
          return jsonResponse(
            {
              success: false,
              error: 'reCAPTCHA verification failed. Bot detected.',
              details: recaptchaResult.details || recaptchaResult.error,
            },
            403
          );
        }

        // Check if real Cloudflare credentials are configured
        if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_STREAM_API_TOKEN) {
          const liveInput = await createOrGetCloudflareLiveInput(env);
          return jsonResponse({
            success: true,
            mode: 'cloudflare_stream_live',
            whipUrl: liveInput.whipUrl,
            liveInputId: liveInput.id,
            twitchChannel: env.TWITCH_CHANNEL_NAME || 'NeonArcadeLive',
            message: 'Connected to Cloudflare Stream Live with Twitch RTMP egress',
            recaptchaScore: recaptchaResult.score,
          });
        }

        // Automatic Simulation / Arena Fallback Mode
        return jsonResponse({
          success: true,
          mode: 'arcade_mesh_simulated',
          whipUrl: `${url.origin}/api/stream/simulated-whip`,
          twitchChannel: env.TWITCH_CHANNEL_NAME || 'NeonArcadeLive',
          message: 'Running in Arcade Arena Mode with client canvas relay and queue management',
          isSimulation: true,
          recaptchaScore: recaptchaResult.score,
        });
      } catch (err: any) {
        return jsonResponse(
          {
            success: false,
            error: err.message,
          },
          500
        );
      }
    }

    // 4. Exterior ROM Upload Pipeline (Guarded by reCAPTCHA v3 & R2 Support)
    if (url.pathname === '/api/pipeline/upload' && request.method === 'POST') {
      try {
        const contentType = request.headers.get('content-type') || '';
        let title = 'Uploaded ROM';
        let system = 'NES';
        let recaptchaToken = '';
        let fileBuffer: ArrayBuffer | null = null;
        let fileName = 'game.rom';

        if (contentType.includes('multipart/form-data')) {
          const formData = await request.formData();
          const file = formData.get('rom') as File | null;
          title = (formData.get('title') as string) || title;
          system = (formData.get('system') as string) || system;
          recaptchaToken = (formData.get('recaptchaToken') as string) || '';

          if (file) {
            fileName = file.name;
            fileBuffer = await file.arrayBuffer();
          }
        } else {
          const json = (await request.json().catch(() => ({}))) as any;
          title = json.title || title;
          system = json.system || system;
          recaptchaToken = json.recaptchaToken || '';
        }

        // Verify reCAPTCHA token against bot abuse
        const clientIp = request.headers.get('CF-Connecting-IP') || undefined;
        const recaptchaResult = await verifyRecaptcha(
          env.RECAPTCHA_SECRET_KEY,
          recaptchaToken,
          clientIp,
          env.RECAPTCHA_MIN_SCORE
        );

        if (!recaptchaResult.success) {
          return jsonResponse(
            {
              success: false,
              error: 'reCAPTCHA verification failed. Bot detected.',
              details: recaptchaResult.details || recaptchaResult.error,
            },
            403
          );
        }

        let downloadUrl = '';
        const uniqueId = `rom_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        // If Cloudflare R2 bucket is bound, write directly to R2
        if (env.ROM_BUCKET && fileBuffer) {
          const r2Key = `roms/${uniqueId}/${fileName}`;
          await env.ROM_BUCKET.put(r2Key, fileBuffer, {
            customMetadata: { title, system, uploadedAt: new Date().toISOString() },
          });
          downloadUrl = `/api/pipeline/roms/${r2Key}`;
        }

        return jsonResponse({
          success: true,
          id: uniqueId,
          title,
          system,
          fileName,
          fileSize: fileBuffer ? fileBuffer.byteLength : 0,
          downloadUrl,
          pipeline: env.ROM_BUCKET ? 'cloudflare_r2' : 'cloudflare_worker_verified',
          recaptchaScore: recaptchaResult.score,
        });
      } catch (err: any) {
        return jsonResponse({ success: false, error: err.message }, 500);
      }
    }

    // 5. Health check endpoint
    if (url.pathname === '/health' || url.pathname === '/') {
      return jsonResponse({
        status: 'online',
        service: 'Neon Retro Arcade Stream Coordinator & Cloudflare Pipeline',
        twitchChannel: env.TWITCH_CHANNEL_NAME || 'NeonArcadeLive',
        cloudflareStreamLiveReady: !!(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_STREAM_API_TOKEN),
        reCAPTCHAConfigured: !!(env.RECAPTCHA_SECRET_KEY && env.RECAPTCHA_SECRET_KEY !== 'test'),
        r2BucketConfigured: !!env.ROM_BUCKET,
        timestamp: new Date().toISOString(),
      });
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
