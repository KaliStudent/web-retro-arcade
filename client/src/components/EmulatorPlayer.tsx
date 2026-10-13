import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Save,
  FolderOpen,
  Maximize2,
  Volume2,
  VolumeX,
  Tv,
  Video,
  VideoOff,
  Monitor,
  ArrowLeft,
  Users,
  Grid2X2,
  Gamepad2,
  Keyboard,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { videoRecorder, type RecordingResult } from "@/lib/videoRecorder";
import { streamManager, type StreamMode, type StreamState } from "@/lib/streamManager";
import { SessionRecordingModal } from "@/components/SessionRecordingModal";
import { QuadStreamArena } from "@/components/QuadStreamArena";
import { ControlsGuideModal } from "@/components/ControlsGuideModal";
import { useToast } from "@/hooks/use-toast";

interface EmulatorPlayerProps {
  gameId: string;
  gameName: string;
  system: string;
  gameUrl?: string;
  mode?: StreamMode;
  username?: string;
  onClose?: () => void;
}

const SYSTEM_CORES: Record<string, string> = {
  'NES': 'nes',
  'SNES': 'snes',
  'Game Boy': 'gb',
  'Game Boy Color': 'gb',
  'Game Boy Advance': 'gba',
  'Genesis': 'segaMD',
  'Mega Drive': 'segaMD',
  'Nintendo 64': 'n64',
  'PlayStation': 'psx',
  'GBA': 'gba',
  'N64': 'n64',
};

// Install runtime safety patches for EmulatorJS, GamepadHandler, and PointerLock
function installEmulatorPatches() {
  if (typeof window === 'undefined') return;

  // 1. Pointer Lock Safety (silences browser SecurityError when clicking canvas after lock exit)
  if (typeof HTMLCanvasElement !== 'undefined' && HTMLCanvasElement.prototype.requestPointerLock) {
    const origRequestPointerLock = HTMLCanvasElement.prototype.requestPointerLock;
    if (!(origRequestPointerLock as any)._patched) {
      const patched = function (this: HTMLCanvasElement, ...args: any[]) {
        try {
          const res = (origRequestPointerLock as any).apply(this, args);
          if (res && typeof (res as any).catch === 'function') {
            (res as any).catch(() => {
              // Suppress PointerLock SecurityError gracefully
            });
          }
          return res;
        } catch (e) {
          // Ignore synchronous pointer lock errors
        }
      };
      (patched as any)._patched = true;
      HTMLCanvasElement.prototype.requestPointerLock = patched as any;
    }
  }

  // 2. Patch EmulatorJS.prototype.gamepadEvent
  const patchEmulatorJSPrototype = (cls: any) => {
    if (!cls || !cls.prototype || cls.prototype._gamepadPatched) return;
    cls.prototype._gamepadPatched = true;
    const origGamepadEvent = cls.prototype.gamepadEvent;

    cls.prototype.gamepadEvent = function (t: any) {
      if (!this.started || !t) return;
      if (!this.gamepad) return;

      if (!Array.isArray(this.gamepad.gamepads)) {
        this.gamepad.gamepads = [];
      }

      // Safeguard against missing/undefined gamepad at t.gamepadIndex
      let gp = this.gamepad.gamepads[t.gamepadIndex];
      if (!gp || !gp.id) {
        gp = this.gamepad.gamepads.find((g: any) => g && g.index === t.gamepadIndex)
          || this.gamepad.gamepads[0];
      }

      // If still missing from EmulatorJS internal array, pull from navigator.getGamepads()
      if (!gp || !gp.id) {
        const raw = navigator.getGamepads ? navigator.getGamepads() : [];
        gp = Array.from(raw).find((g: any) => g && g.connected && g.index === t.gamepadIndex)
          || Array.from(raw).find((g: any) => g && g.connected);
        if (gp) {
          this.gamepad.gamepads.push(gp);
        }
      }

      // If no gamepad at all, return safely without throwing TypeError: Cannot read properties of undefined (reading 'id')
      if (!gp || !gp.id) return;

      // Ensure slot at t.gamepadIndex is defined so original code will not throw
      if (!this.gamepad.gamepads[t.gamepadIndex]) {
        this.gamepad.gamepads[t.gamepadIndex] = gp;
      }

      // Automatically assign this gamepad to Player 1 if not assigned
      const gpKey = `${gp.id}_${gp.index}`;
      if (Array.isArray(this.gamepadSelection)) {
        if (!this.gamepadSelection.includes(gpKey)) {
          if (!this.gamepadSelection[0] || this.gamepadSelection[0] === "") {
            this.gamepadSelection[0] = gpKey;
          }
        }
      }

      try {
        return origGamepadEvent.call(this, t);
      } catch (err) {
        // Suppress any internal EmulatorJS gamepad errors
      }
    };
  };

  // 3. Patch GamepadHandler.prototype.dispatchEvent
  const patchGamepadHandlerPrototype = (cls: any) => {
    if (!cls || !cls.prototype || cls.prototype._dispatchPatched) return;
    cls.prototype._dispatchPatched = true;
    const origDispatch = cls.prototype.dispatchEvent;

    cls.prototype.dispatchEvent = function (name: string, arg: any) {
      try {
        return origDispatch.call(this, name, arg);
      } catch (err) {
        // Prevent unhandled dispatch error from interrupting setTimeout loop
      }
    };
  };

  if ((window as any).EmulatorJS) {
    patchEmulatorJSPrototype((window as any).EmulatorJS);
  } else {
    let _emu = (window as any).EmulatorJS;
    try {
      Object.defineProperty(window, 'EmulatorJS', {
        configurable: true,
        get() { return _emu; },
        set(val) {
          _emu = val;
          if (_emu) patchEmulatorJSPrototype(_emu);
        }
      });
    } catch (e) {
      // Ignore if cannot redefine
    }
  }

  if ((window as any).GamepadHandler) {
    patchGamepadHandlerPrototype((window as any).GamepadHandler);
  } else {
    let _gp = (window as any).GamepadHandler;
    try {
      Object.defineProperty(window, 'GamepadHandler', {
        configurable: true,
        get() { return _gp; },
        set(val) {
          _gp = val;
          if (_gp) patchGamepadHandlerPrototype(_gp);
        }
      });
    } catch (e) {
      // Ignore if cannot redefine
    }
  }
}

// Run patches immediately on module execution
installEmulatorPatches();

export function EmulatorPlayer({
  gameId,
  gameName,
  system,
  gameUrl,
  mode = 'SOLO',
  username = 'Player_One',
  onClose,
}: EmulatorPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [fps] = useState(60);
  const [emulatorReady, setEmulatorReady] = useState(false);
  const [crtEnabled, setCrtEnabled] = useState(true);

  // Focus & Controls State
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [connectedGamepadName, setConnectedGamepadName] = useState<string | null>(null);
  const [controlsModalOpen, setControlsModalOpen] = useState(false);

  // Video Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState('00:00');
  const [recordingResult, setRecordingResult] = useState<RecordingResult | null>(null);
  const [recordingModalOpen, setRecordingModalOpen] = useState(false);

  // Streaming State
  const [streamState, setStreamState] = useState<StreamState>(streamManager.getState());
  const [showQuadOverlay, setShowQuadOverlay] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevButtonsRef = useRef<Record<number, boolean>>({});
  const prevAxesRef = useRef<Record<string, boolean>>({});
  const { toast } = useToast();

  // 1. Initialize Streaming if in STREAMING mode
  useEffect(() => {
    if (mode === 'STREAMING') {
      streamManager.joinQueue(username, gameName, system);
    } else {
      streamManager.setMode('SOLO');
    }

    const unsub = streamManager.subscribe((state) => {
      setStreamState(state);
    });

    return () => {
      unsub();
      if (mode === 'STREAMING') {
        streamManager.leaveQueue();
      }
    };
  }, [mode, username, gameName, system]);

  // 2. Video Recorder listener
  useEffect(() => {
    const unsub = videoRecorder.onStateChange((state, elapsed) => {
      setIsRecording(state === 'recording');
      setRecordingElapsed(videoRecorder.formatDuration(elapsed));
    });

    return () => {
      unsub();
    };
  }, []);

  // 3. Global Keyboard Listener (Forwarding to EmulatorJS & ensuring focus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if user is typing in form inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const emu = (window as any).EJS_emulator;
      const gameKeyCodes = [
        38, 40, 37, 39, // Arrows
        87, 83, 65, 68, // WASD
        90, 88, 65, 83, 81, 69, // Z, X, A, S, Q, E
        74, 75, 85, 73, // J, K, U, I
        13, 16, 32, 86, 8, 9, // Enter, Shift, Space, V, Backspace, Tab
      ];

      if (gameKeyCodes.includes(e.keyCode)) {
        // Prevent browser page scroll on arrow keys and space
        if ([38, 40, 37, 39, 32].includes(e.keyCode)) {
          e.preventDefault();
        }

        // Re-focus container if focus drifted
        if (containerRef.current && document.activeElement !== containerRef.current) {
          containerRef.current.focus();
          setIsScreenFocused(true);
        }

        if (emu) {
          // Alternative Select keys (Shift / Space / V):
          if (e.keyCode === 32 || e.keyCode === 16 || e.keyCode === 86) {
            emu.gameManager?.simulateInput(0, 2, 1);
          }
          // Alternative WASD D-Pad:
          if (e.keyCode === 87) emu.gameManager?.simulateInput(0, 4, 1); // W -> Up
          if (e.keyCode === 83) emu.gameManager?.simulateInput(0, 5, 1); // S -> Down
          if (e.keyCode === 65) emu.gameManager?.simulateInput(0, 6, 1); // A -> Left
          if (e.keyCode === 68) emu.gameManager?.simulateInput(0, 7, 1); // D -> Right
          // Alternative J / K:
          if (e.keyCode === 74) emu.gameManager?.simulateInput(0, 0, 1); // J -> B
          if (e.keyCode === 75) emu.gameManager?.simulateInput(0, 8, 1); // K -> A

          // Only forward to keyChange if the event did not hit container directly
          const isTargetingContainer =
            e.target === containerRef.current || containerRef.current?.contains(e.target as Node);
          if (!isTargetingContainer && typeof emu.keyChange === 'function') {
            emu.keyChange(e);
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const emu = (window as any).EJS_emulator;
      if (emu) {
        if (e.keyCode === 32 || e.keyCode === 16 || e.keyCode === 86) {
          emu.gameManager?.simulateInput(0, 2, 0);
        }
        if (e.keyCode === 87) emu.gameManager?.simulateInput(0, 4, 0);
        if (e.keyCode === 83) emu.gameManager?.simulateInput(0, 5, 0);
        if (e.keyCode === 65) emu.gameManager?.simulateInput(0, 6, 0);
        if (e.keyCode === 68) emu.gameManager?.simulateInput(0, 7, 0);
        if (e.keyCode === 74) emu.gameManager?.simulateInput(0, 0, 0);
        if (e.keyCode === 75) emu.gameManager?.simulateInput(0, 8, 0);

        const isTargetingContainer =
          e.target === containerRef.current || containerRef.current?.contains(e.target as Node);
        if (!isTargetingContainer && typeof emu.keyChange === 'function') {
          emu.keyChange(e);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, []);

  // 4. Dedicated 60 FPS Gamepad Engine
  useEffect(() => {
    let animId: number;

    const pollGamepads = () => {
      try {
        const rawGps = navigator.getGamepads ? navigator.getGamepads() : [];
        const activeGamepad = Array.from(rawGps).find((gp): gp is Gamepad => gp !== null && gp.connected);

        if (activeGamepad) {
          if (connectedGamepadName !== activeGamepad.id) {
            setConnectedGamepadName(activeGamepad.id);
          }

          const emu = (window as any).EJS_emulator;
          if (emu) {
            // Guarantee EmulatorJS internal gamepad array assignment
            if (Array.isArray(emu.gamepadSelection)) {
              const expectedKey = `${activeGamepad.id}_${activeGamepad.index}`;
              if (emu.gamepadSelection[0] !== expectedKey) {
                emu.gamepadSelection[0] = expectedKey;
              }
            }
            if (emu.gamepad && Array.isArray(emu.gamepad.gamepads)) {
              if (!emu.gamepad.gamepads.some((g: any) => g && g.index === activeGamepad.index)) {
                emu.gamepad.gamepads.push(activeGamepad);
              }
            }

            // Direct simulation for 100% responsiveness across all browsers & pads
            if (emu.gameManager && typeof emu.gameManager.simulateInput === 'function') {
              const btnMap: Record<number, number> = {
                0: 0,   // A (South) -> Button 0 (Retro A)
                1: 8,   // B (East) -> Button 8 (Retro B)
                2: 1,   // X (West) -> Button 1 (Retro X)
                3: 9,   // Y (North) -> Button 9 (Retro Y)
                4: 10,  // L1 -> Button 10 (L)
                5: 11,  // R1 -> Button 11 (R)
                8: 2,   // Select / Back / Share -> Button 2 (Select)
                9: 3,   // Start / Options -> Button 3 (Start)
                12: 4,  // D-Pad Up -> Button 4 (Up)
                13: 5,  // D-Pad Down -> Button 5 (Down)
                14: 6,  // D-Pad Left -> Button 6 (Left)
                15: 7,  // D-Pad Right -> Button 7 (Right)
              };

              activeGamepad.buttons.forEach((btn, idx) => {
                const retroBtn = btnMap[idx];
                if (retroBtn !== undefined) {
                  const isDown = btn.pressed || btn.value > 0.5;
                  const wasDown = !!prevButtonsRef.current[idx];
                  if (isDown !== wasDown) {
                    prevButtonsRef.current[idx] = isDown;
                    emu.gameManager.simulateInput(0, retroBtn, isDown ? 1 : 0);
                  }
                }
              });

              // Analog Left Stick (Deadzone 0.45)
              const axisX = activeGamepad.axes[0] || 0;
              const axisY = activeGamepad.axes[1] || 0;

              const stickLeft = axisX < -0.45;
              if (stickLeft !== !!prevAxesRef.current['left']) {
                prevAxesRef.current['left'] = stickLeft;
                emu.gameManager.simulateInput(0, 6, stickLeft ? 1 : 0);
              }

              const stickRight = axisX > 0.45;
              if (stickRight !== !!prevAxesRef.current['right']) {
                prevAxesRef.current['right'] = stickRight;
                emu.gameManager.simulateInput(0, 7, stickRight ? 1 : 0);
              }

              const stickUp = axisY < -0.45;
              if (stickUp !== !!prevAxesRef.current['up']) {
                prevAxesRef.current['up'] = stickUp;
                emu.gameManager.simulateInput(0, 4, stickUp ? 1 : 0);
              }

              const stickDown = axisY > 0.45;
              if (stickDown !== !!prevAxesRef.current['down']) {
                prevAxesRef.current['down'] = stickDown;
                emu.gameManager.simulateInput(0, 5, stickDown ? 1 : 0);
              }
            }
          }
        } else {
          if (connectedGamepadName !== null) {
            setConnectedGamepadName(null);
          }
        }
      } catch (e) {
        // Ignore polling cycles
      }

      animId = requestAnimationFrame(pollGamepads);
    };

    animId = requestAnimationFrame(pollGamepads);

    const onConnected = (e: GamepadEvent) => {
      toast({
        title: "🎮 Controller Connected",
        description: `${e.gamepad.id} assigned to Player 1!`,
      });
      setConnectedGamepadName(e.gamepad.id);
    };

    const onDisconnected = (e: GamepadEvent) => {
      toast({
        variant: "destructive",
        title: "Controller Disconnected",
        description: `${e.gamepad.id} disconnected.`,
      });
      setConnectedGamepadName(null);
    };

    window.addEventListener("gamepadconnected", onConnected);
    window.addEventListener("gamepaddisconnected", onDisconnected);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("gamepadconnected", onConnected);
      window.removeEventListener("gamepaddisconnected", onDisconnected);
    };
  }, [connectedGamepadName, toast]);

  // 5. Load EmulatorJS dynamically
  useEffect(() => {
    const loadEmulatorJS = () => {
      // Re-apply patches before loading or starting
      installEmulatorPatches();

      const core = SYSTEM_CORES[system] || 'nes';

      (window as any).EJS_player = '#emulator-container';
      (window as any).EJS_core = core;
      (window as any).EJS_gameName = gameName;
      (window as any).EJS_color = '#00f0ff';
      (window as any).EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
      (window as any).EJS_defaultControls = {
        0: {
          0: { value: 'x', value2: 'BUTTON_2' },
          1: { value: 'z', value2: 'BUTTON_1' },
          2: { value: 'Shift', value2: 'SELECT' },
          3: { value: 'Enter', value2: 'START' },
          4: { value: 'ArrowUp', value2: 'DPAD_UP' },
          5: { value: 'ArrowDown', value2: 'DPAD_DOWN' },
          6: { value: 'ArrowLeft', value2: 'DPAD_LEFT' },
          7: { value: 'ArrowRight', value2: 'DPAD_RIGHT' },
          8: { value: 's', value2: 'BUTTON_4' },
          9: { value: 'a', value2: 'BUTTON_3' },
          10: { value: 'q', value2: 'BUTTON_5' },
          11: { value: 'e', value2: 'BUTTON_6' },
        }
      };

      let resolvedUrl = gameUrl;
      if (!resolvedUrl) {
        resolvedUrl = `/api/roms/${gameId}`;
      } else if (resolvedUrl.startsWith('/') && !resolvedUrl.startsWith('/api/')) {
        resolvedUrl = window.location.origin + resolvedUrl;
      }

      (window as any).EJS_gameUrl = resolvedUrl;
      (window as any).EJS_startOnLoaded = true;
      (window as any).EJS_volume = isMuted ? 0 : 0.75;

      (window as any).EJS_onGameStart = () => {
        installEmulatorPatches();
        containerRef.current?.focus();
        setIsScreenFocused(true);
      };

      if ((window as any).EJS_emulator) {
        setEmulatorReady(true);
        pollCanvas();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.emulatorjs.org/stable/data/loader.js';
      script.async = true;
      script.onload = () => {
        installEmulatorPatches();
        setEmulatorReady(true);
        pollCanvas();
      };
      script.onerror = (error) => {
        console.error('Failed to load EmulatorJS:', error);
      };
      document.body.appendChild(script);
    };

    const pollCanvas = () => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const container = document.querySelector('#emulator-container') as HTMLDivElement;
        const canvas = document.querySelector('#emulator-container canvas') as HTMLCanvasElement;
        if (canvas) {
          canvasRef.current = canvas;
          streamManager.attachCanvas(canvas);
          container?.focus();
          setIsScreenFocused(true);

          canvas.addEventListener('click', () => {
            container?.focus();
            setIsScreenFocused(true);
          });

          clearInterval(interval);
        } else if (attempts > 40) {
          clearInterval(interval);
        }
      }, 300);
    };

    loadEmulatorJS();

    return () => {
      if ((window as any).EJS_emulator) {
        try {
          if (typeof (window as any).EJS_emulator.pause === 'function') {
            (window as any).EJS_emulator.pause();
          }
        } catch (e) {}
        (window as any).EJS_emulator = null;
      }
    };
  }, [gameId, gameName, system, isMuted]);

  // Handle Recording Toggle
  const toggleRecording = async () => {
    if (isRecording) {
      const result = await videoRecorder.stopRecording(gameName);
      if (result) {
        setRecordingResult(result);
        setRecordingModalOpen(true);
        toast({
          title: "Session Video Ready",
          description: `Captured ${result.durationFormatted} of gameplay (${result.sizeFormatted}).`,
        });
      }
    } else {
      const canvas = canvasRef.current || (document.querySelector('#emulator-container canvas') as HTMLCanvasElement);
      if (!canvas) {
        toast({
          variant: "destructive",
          title: "Emulator Canvas Loading",
          description: "Please wait a moment for the emulator canvas to initialize before recording.",
        });
        return;
      }

      const started = videoRecorder.startRecording(canvas, gameName);
      if (started) {
        toast({
          title: "Recording Started",
          description: "Capturing 60 FPS gameplay session to WebM.",
        });
      }
    }
  };

  const handleExit = async () => {
    if (isRecording) {
      const result = await videoRecorder.stopRecording(gameName);
      if (result) {
        setRecordingResult(result);
        setRecordingModalOpen(true);
        return;
      }
    }
    if ((window as any).EJS_emulator) {
      try {
        if (typeof (window as any).EJS_emulator.pause === 'function') {
          (window as any).EJS_emulator.pause();
        }
      } catch (e) {}
      (window as any).EJS_emulator = null;
    }
    if (onClose) onClose();
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if ((window as any).EJS_emulator) {
      (window as any).EJS_emulator.volume = isMuted ? 0.75 : 0;
    }
  };

  return (
    <div className="w-full h-full flex flex-col max-w-6xl mx-auto space-y-3">
      {/* Top Stream Status Bar */}
      <div className="flex items-center justify-between bg-[#0a0f24] border border-[#00f0ff]/30 rounded-xl px-4 py-2.5 flex-wrap gap-2 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExit}
            className="text-cyan-300 hover:text-white hover:bg-cyan-900/30 font-mono text-xs gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Arcade Library
          </Button>

          <div className="h-4 w-px bg-[#00f0ff]/20 hidden sm:block" />

          {/* Broadcast Status Pill */}
          {mode === 'STREAMING' ? (
            streamState.queueState === 'QUAD' ? (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#ff007f]/20 text-[#ff00aa] border border-[#ff007f]/40 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#ff007f]" />
                ⚡ 4-PLAYER QUAD ARENA ({streamState.quadrant || 'ACTIVE'})
              </span>
            ) : streamState.queueState === 'LIVE' ? (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#ff007f]/20 text-[#ff00aa] border border-[#ff007f]/40 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#ff007f]" />
                🔴 LIVE ON TWITCH
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#ff7700]/20 text-[#ff7700] border border-[#ff7700]/40">
                <span className="w-2 h-2 rounded-full bg-[#ff7700]" />
                STANDBY QUEUE (#{streamState.position})
              </span>
            )
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#39ff14]/15 text-[#39ff14] border border-[#39ff14]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#39ff14]" />
              PRIVATE SOLO SESSION
            </span>
          )}

          {/* Controller Status Indicator Pill */}
          {connectedGamepadName ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#39ff14]/15 text-[#39ff14] border border-[#39ff14]/40 animate-pulse">
              <Gamepad2 className="h-3.5 w-3.5" />
              🎮 {connectedGamepadName.length > 20 ? connectedGamepadName.slice(0, 20) + '...' : connectedGamepadName}
            </span>
          ) : (
            <button
              onClick={() => setControlsModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono text-cyan-300/70 border border-[#00f0ff]/20 hover:border-[#00f0ff]/50 hover:text-white transition-colors cursor-pointer"
            >
              <Keyboard className="h-3.5 w-3.5 text-[#00f0ff]" />
              <span className="hidden sm:inline">Keyboard Active</span>
            </button>
          )}
        </div>

        {/* Right Tools (Recording HUD + Quad Toggle) */}
        <div className="flex items-center gap-2">
          {mode === 'STREAMING' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQuadOverlay(!showQuadOverlay)}
              className="h-8 font-mono text-xs bg-[#0f1738] border-[#00f0ff]/40 text-cyan-300 hover:text-white gap-1.5"
            >
              <Grid2X2 className="h-3.5 w-3.5 text-[#00f0ff]" />
              {showQuadOverlay ? 'Single View' : 'Quad Arena'}
            </Button>
          )}

          {/* Recording HUD Button */}
          <Button
            size="sm"
            onClick={toggleRecording}
            className={`h-8 font-mono text-xs font-bold gap-1.5 transition-all ${
              isRecording
                ? 'bg-[#ff007f] hover:bg-[#e00070] text-white shadow-[0_0_15px_rgba(255,0,127,0.8)] animate-pulse'
                : 'bg-[#0e221d] hover:bg-[#15342c] text-[#39ff14] border border-[#39ff14]/50'
            }`}
          >
            {isRecording ? (
              <>
                <VideoOff className="h-3.5 w-3.5" />
                <span>REC {recordingElapsed}</span>
              </>
            ) : (
              <>
                <Video className="h-3.5 w-3.5" />
                <span>Record Session</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Cabinet Display or Quad Arena */}
      {showQuadOverlay && mode === 'STREAMING' ? (
        <QuadStreamArena
          peers={streamState.quadPeers}
          activeUserId={streamManager.getUserId()}
          activeCanvas={canvasRef.current}
          twitchChannel={streamState.twitchChannel}
        />
      ) : (
        <Card className="overflow-hidden border border-[#00f0ff]/30 bg-[#070914] shadow-[0_0_40px_rgba(0,0,0,0.8)]">
          {/* Screen Outer Wrapper */}
          <div
            className={`bg-black aspect-[4/3] min-h-[60vh] md:min-h-[65vh] relative flex items-center justify-center ${
              crtEnabled ? 'crt-overlay' : ''
            }`}
          >
            {/* Pure DOM Mount Point for EmulatorJS - Absolutely NO React children inside! */}
            <div
              ref={containerRef}
              id="emulator-container"
              tabIndex={0}
              onClick={() => {
                containerRef.current?.focus();
                setIsScreenFocused(true);
              }}
              onFocus={() => setIsScreenFocused(true)}
              onBlur={() => setIsScreenFocused(false)}
              className="absolute inset-0 w-full h-full outline-none focus:ring-1 focus:ring-[#00f0ff]/50 cursor-pointer"
            />

            {/* Sibling React Overlays - Fully isolated from EmulatorJS DOM tree */}
            {!emulatorReady && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 pointer-events-none space-y-4">
                <div className="text-4xl md:text-5xl font-display font-extrabold text-[#00f0ff] neon-glow-blue uppercase">
                  {gameName}
                </div>
                <div className="text-sm font-mono text-[#ff7700] tracking-widest uppercase">
                  INITIALIZING {system} CORE &bull; 60 FPS
                </div>
                <div className="w-16 h-1 mx-auto bg-gradient-to-r from-[#00f0ff] via-[#ff7700] to-[#ff007f] rounded-full animate-pulse" />
              </div>
            )}

            {/* Click to Focus Overlay Banner */}
            {!isScreenFocused && emulatorReady && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  containerRef.current?.focus();
                  setIsScreenFocused(true);
                }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 cursor-pointer bg-black/85 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#00f0ff]/60 text-xs font-mono text-[#00f0ff] animate-pulse flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.5)]"
              >
                <Keyboard className="h-3.5 w-3.5" />
                <span>Click screen to activate keyboard / gamepad controls</span>
              </div>
            )}

            {/* In-game Recording Indicator */}
            {isRecording && (
              <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-[#ff007f]/50">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff007f] animate-ping" />
                <span className="text-xs font-mono font-bold text-white">REC {recordingElapsed}</span>
              </div>
            )}

            {/* Audio Mute in Screen Corner */}
            <div className="absolute top-4 right-4 z-30">
              <Button
                size="icon"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="bg-black/70 border border-white/10 hover:bg-black/90 text-white"
              >
                {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-[#00f0ff]" />}
              </Button>
            </div>
          </div>

          {/* Bottom Arcade Control Bar */}
          <div className="p-3.5 bg-[#090d20] border-t border-[#00f0ff]/20">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Game Metadata */}
              <div className="flex items-center gap-3">
                <div className="text-sm font-mono">
                  <div className="font-bold text-white flex items-center gap-2">
                    {gameName}
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30">
                      {system}
                    </span>
                  </div>
                  <div className="text-xs text-cyan-200/60 font-mono">
                    Player: <strong className="text-white">{username}</strong>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Controls Guide Modal Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setControlsModalOpen(true)}
                  className="h-8 font-mono text-xs gap-1.5 bg-[#0f1738] border-[#00f0ff]/40 text-cyan-300 hover:text-white"
                >
                  <Gamepad2 className="h-3.5 w-3.5 text-[#00f0ff]" />
                  Controls Guide
                </Button>

                {/* CRT Scanline Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCrtEnabled(!crtEnabled)}
                  className={`h-8 font-mono text-xs gap-1.5 ${
                    crtEnabled
                      ? 'bg-[#00f0ff]/10 border-[#00f0ff]/50 text-[#00f0ff]'
                      : 'bg-black/40 border-white/10 text-muted-foreground'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  CRT Scanlines: {crtEnabled ? 'ON' : 'OFF'}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-[#0a1024] border-white/10 hover:border-[#00f0ff]/50 text-white"
                  onClick={handleFullscreen}
                >
                  <Maximize2 className="h-3.5 w-3.5 text-cyan-300" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Session Recording Export Modal */}
      <SessionRecordingModal
        isOpen={recordingModalOpen}
        onClose={() => setRecordingModalOpen(false)}
        recording={recordingResult}
        gameTitle={gameName}
      />

      {/* Interactive Controls Guide Modal */}
      <ControlsGuideModal
        isOpen={controlsModalOpen}
        onClose={() => setControlsModalOpen(false)}
        system={system}
        gamepadName={connectedGamepadName}
      />
    </div>
  );
}
