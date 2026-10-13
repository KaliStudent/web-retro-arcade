import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, CheckCircle2, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { localDB } from "@/lib/localStorageDB";
import { executeRecaptcha, verifyRecaptchaToken } from "@/lib/recaptcha";

interface ROMUploadDialogProps {
  onUploadComplete?: () => void;
}

const SYSTEMS = [
  { id: 'nes', name: 'NES', core: 'nes' },
  { id: 'snes', name: 'SNES', core: 'snes' },
  { id: 'gb', name: 'Game Boy', core: 'gb' },
  { id: 'gbc', name: 'Game Boy Color', core: 'gbc' },
  { id: 'gba', name: 'Game Boy Advance', core: 'gba' },
  { id: 'genesis', name: 'Genesis', core: 'segaMD' },
  { id: 'n64', name: 'Nintendo 64', core: 'n64' },
  { id: 'psx', name: 'PlayStation', core: 'psx' },
];

export function ROMUploadDialog({ onUploadComplete }: ROMUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [system, setSystem] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setErrorMessage(null);
      // Auto-fill title from filename
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExt);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title || !system) return;

    setIsUploading(true);
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      // 1. Obtain reCAPTCHA v3 token
      const { token } = await executeRecaptcha('upload_rom');

      // 2. Verify token on server
      const verifyResult = await verifyRecaptchaToken(token, 'upload_rom');
      if (!verifyResult.success) {
        throw new Error(verifyResult.error || 'reCAPTCHA verification failed. Bot detected.');
      }

      setIsVerifying(false);

      // 3. Save locally in browser IndexedDB (Guaranteed local play regardless of file size)
      const cleanTitle = title.trim();
      const localId = 'local_' + cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const arrayBuffer = await selectedFile.arrayBuffer();

      await localDB.addROM({
        id: localId,
        title: cleanTitle,
        system,
        fileName: selectedFile.name,
        fileData: arrayBuffer,
        fileSize: selectedFile.size,
        createdAt: new Date(),
        isFavorite: false,
      });

      // 4. Also attempt server sync if within Vercel's 4.5MB limit
      if (selectedFile.size <= 4.5 * 1024 * 1024) {
        try {
          const formData = new FormData();
          formData.append('rom', selectedFile);
          formData.append('title', title);
          formData.append('system', system);
          formData.append('recaptchaToken', token);

          const res = await fetch('/api/games/upload', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => null);
            if (res.status === 403) {
              throw new Error(errData?.error || 'reCAPTCHA verification rejected by server.');
            }
          }
        } catch (serverErr: any) {
          console.warn('Server upload sync notice (stored locally):', serverErr);
          if (serverErr.message && serverErr.message.includes('reCAPTCHA')) {
            throw serverErr;
          }
        }
      }

      setUploadSuccess(true);
      setTimeout(() => {
        onUploadComplete?.();
        // Reset form
        setSelectedFile(null);
        setTitle("");
        setSystem("");
        setUploadSuccess(false);
      }, 1000);
    } catch (error: any) {
      console.error('Upload error:', error);
      setErrorMessage(error.message || 'Failed to complete upload');
    } finally {
      setIsVerifying(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-md border border-red-500/40 bg-red-950/30 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="rom-file">ROM File</Label>
        <div className="flex gap-2">
          <Input
            id="rom-file"
            type="file"
            accept=".nes,.smc,.sfc,.gb,.gbc,.gba,.bin,.md,.gen,.z64,.n64,.iso"
            onChange={handleFileChange}
            data-testid="input-rom-file"
          />
        </div>
        {selectedFile && (
          <p className="text-sm text-muted-foreground">
            {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="game-title">Game Title</Label>
        <Input
          id="game-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter game title"
          data-testid="input-game-title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="system">System</Label>
        <Select value={system} onValueChange={setSystem}>
          <SelectTrigger id="system" data-testid="select-system">
            <SelectValue placeholder="Select system" />
          </SelectTrigger>
          <SelectContent>
            {SYSTEMS.map((sys) => (
              <SelectItem key={sys.id} value={sys.name}>
                {sys.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Google reCAPTCHA v3 Compliance Notice */}
      <div className="flex items-start gap-2 p-2.5 rounded-md border border-cyan-500/20 bg-cyan-950/20 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
        <div>
          <span className="text-cyan-300 font-medium">Protected by Google reCAPTCHA v3</span>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Automated bot submissions are blocked. By uploading, you agree to Google's{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Privacy Policy</a> and{" "}
            <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Terms of Service</a>.
          </p>
        </div>
      </div>

      <Button
        onClick={handleUpload}
        disabled={!selectedFile || !title || !system || isUploading || uploadSuccess}
        className="w-full"
        data-testid="button-upload-submit"
      >
        {isVerifying ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Verifying Security...
          </>
        ) : isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : uploadSuccess ? (
          <>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Uploaded!
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Upload Game
          </>
        )}
      </Button>
    </div>
  );
}
