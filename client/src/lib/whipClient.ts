/**
 * WebRTC WHIP (RFC draft-ietf-wish-whip) Publishing Client
 * Streams 60 FPS emulator canvas video and audio directly to Cloudflare Stream Live Ingest
 */

export class WhipClient {
  private pc: RTCPeerConnection | null = null;
  private endpointUrl: string | null = null;
  private resourceUrl: string | null = null;
  private stream: MediaStream | null = null;
  private isPublishing: boolean = false;

  public getIsPublishing(): boolean {
    return this.isPublishing;
  }

  /**
   * Start publishing canvas video to Cloudflare Stream WHIP endpoint
   */
  public async start(canvas: HTMLCanvasElement, whipUrl: string): Promise<boolean> {
    if (this.isPublishing) {
      console.warn('[WHIP] Already publishing live session');
      return true;
    }

    try {
      this.endpointUrl = whipUrl;

      // 1. Capture 60 FPS video stream from emulator canvas
      this.stream = canvas.captureStream(60);
      if (!this.stream || this.stream.getVideoTracks().length === 0) {
        console.warn('[WHIP] Canvas has no video tracks');
        return false;
      }

      // 2. Create WebRTC PeerConnection with standard STUN configuration
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.cloudflare.com:3478' },
          { urls: 'stun:stun.l.google.com:19302' },
        ],
        bundlePolicy: 'max-bundle',
      });

      // 3. Add video and audio tracks
      this.stream.getTracks().forEach((track) => {
        this.pc!.addTrack(track, this.stream!);
      });

      // 4. Generate WebRTC Offer SDP
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });
      await this.pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete or timeout
      await this.waitForIceGathering(this.pc);

      const localSdp = this.pc.localDescription?.sdp || offer.sdp;

      // 5. POST offer SDP to Cloudflare Stream WHIP ingest
      const res = await fetch(whipUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
        },
        body: localSdp,
      });

      if (!res.ok) {
        throw new Error(`WHIP handshake failed with status ${res.status}: ${await res.text()}`);
      }

      // Store resource URL for deletion on teardown (Location header)
      this.resourceUrl = res.headers.get('Location') || whipUrl;

      const answerSdp = await res.text();
      await this.pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

      this.isPublishing = true;
      console.log('[WHIP] Successfully established WebRTC live stream with Cloudflare Stream!');
      return true;
    } catch (err) {
      console.error('[WHIP] Failed to publish WHIP session:', err);
      this.stop();
      return false;
    }
  }

  private waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const checkState = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };

      pc.addEventListener('icegatheringstatechange', checkState);
      // Fallback timeout after 1.5 seconds if gathering takes too long
      setTimeout(() => {
        pc.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }, 1500);
    });
  }

  /**
   * Stop publishing and tear down WebRTC connection
   */
  public async stop(): Promise<void> {
    this.isPublishing = false;

    if (this.resourceUrl) {
      try {
        await fetch(this.resourceUrl, { method: 'DELETE' });
      } catch (e) {
        // ignore teardown errors
      }
      this.resourceUrl = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.endpointUrl = null;
    console.log('[WHIP] Closed WebRTC live stream session');
  }
}

export const whipClient = new WhipClient();
