/**
 * Retro Video Recorder Engine
 * Captures emulator 60fps canvas + audio via MediaRecorder API
 * Provides live recording timer HUD, WebM video export, and download helpers
 */

export interface RecordingResult {
  blob: Blob;
  url: string;
  durationSeconds: number;
  durationFormatted: string;
  sizeFormatted: string;
  sizeBytes: number;
  filename: string;
  mimeType: string;
}

export type RecorderState = 'inactive' | 'recording' | 'paused';

export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: number = 0;
  private elapsedSeconds: number = 0;
  private timerInterval: any = null;
  private stream: MediaStream | null = null;
  private stateChangeListeners: ((state: RecorderState, elapsed: number) => void)[] = [];

  public getState(): RecorderState {
    if (!this.mediaRecorder) return 'inactive';
    return this.mediaRecorder.state as RecorderState;
  }

  public getElapsedSeconds(): number {
    return this.elapsedSeconds;
  }

  public onStateChange(listener: (state: RecorderState, elapsed: number) => void) {
    this.stateChangeListeners.push(listener);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter((l) => l !== listener);
    };
  }

  private notifyState(state: RecorderState) {
    this.stateChangeListeners.forEach((l) => l(state, this.elapsedSeconds));
  }

  /**
   * Starts recording from the canvas (and optional audio)
   */
  public startRecording(canvas: HTMLCanvasElement, gameTitle: string = 'retro_game'): boolean {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      console.warn('MediaRecorder is already active');
      return false;
    }

    try {
      // 1. Capture 60 FPS stream from canvas
      const canvasStream = canvas.captureStream(60);
      if (!canvasStream || canvasStream.getVideoTracks().length === 0) {
        console.error('Failed to capture stream from canvas');
        return false;
      }

      this.stream = canvasStream;
      this.recordedChunks = [];
      this.elapsedSeconds = 0;
      this.startTime = Date.now();

      // 2. Determine best supported WebM mimeType
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264',
        'video/webm',
      ];

      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      const options: MediaRecorderOptions = {
        videoBitsPerSecond: 5000000, // 5 Mbps for crisp pixel graphics
      };
      if (selectedMimeType) {
        options.mimeType = selectedMimeType;
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // 1-second chunks for reliability

      // Start elapsed timer
      this.timerInterval = setInterval(() => {
        this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
        this.notifyState('recording');
      }, 1000);

      this.notifyState('recording');
      return true;
    } catch (err) {
      console.error('Failed to initialize MediaRecorder:', err);
      return false;
    }
  }

  /**
   * Stops recording and returns the compiled RecordingResult
   */
  public stopRecording(gameTitle: string = 'retro_game'): Promise<RecordingResult | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanupTimer();
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        this.cleanupTimer();
        const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const durationSeconds = this.elapsedSeconds;
        const durationFormatted = this.formatDuration(durationSeconds);
        const sizeBytes = blob.size;
        const sizeFormatted = this.formatSize(sizeBytes);
        const cleanTitle = gameTitle.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
        const filename = `${cleanTitle}_session_${Date.now()}.webm`;

        const result: RecordingResult = {
          blob,
          url,
          durationSeconds,
          durationFormatted,
          sizeFormatted,
          sizeBytes,
          filename,
          mimeType,
        };

        this.notifyState('inactive');
        this.recordedChunks = [];
        this.mediaRecorder = null;
        resolve(result);
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanupTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public formatDuration(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  public formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  public downloadResult(result: RecordingResult) {
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

export const videoRecorder = new VideoRecorder();
