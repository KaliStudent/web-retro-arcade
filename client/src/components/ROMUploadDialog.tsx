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
import { Upload, CheckCircle2, Loader2 } from "lucide-react";

interface ROMUploadDialogProps {
  onUploadComplete?: () => void;
}

const SYSTEMS = [
  { id: 'nes', name: 'NES', core: 'nes' },
  { id: 'snes', name: 'SNES', core: 'snes' },
  { id: 'gb', name: 'Game Boy', core: 'gb' },
  { id: 'gbc', name: 'Game Boy Color', core: 'gbc' },
  { id: 'gba', name: 'Game Boy Advance', core: 'gba' },
  { id: 'genesis', name: 'Genesis', core: 'genesis' },
  { id: 'n64', name: 'Nintendo 64', core: 'n64' },
  { id: 'psx', name: 'PlayStation', core: 'psx' },
];

export function ROMUploadDialog({ onUploadComplete }: ROMUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [system, setSystem] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill title from filename
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExt);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title || !system) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('rom', selectedFile);
      formData.append('title', title);
      formData.append('system', system);

      const response = await fetch('/api/games/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      setUploadSuccess(true);
      setTimeout(() => {
        onUploadComplete?.();
        // Reset form
        setSelectedFile(null);
        setTitle("");
        setSystem("");
        setUploadSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
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

      <Button
        onClick={handleUpload}
        disabled={!selectedFile || !title || !system || isUploading || uploadSuccess}
        className="w-full"
        data-testid="button-upload-submit"
      >
        {isUploading ? (
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
