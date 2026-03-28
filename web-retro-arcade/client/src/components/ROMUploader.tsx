import { Card } from "@/components/ui/card";
import { Upload, FileUp, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ROMUploaderProps {
  onFilesSelected?: (files: File[]) => void;
}

export function ROMUploader({ onFilesSelected }: ROMUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; valid: boolean }[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const processFiles = (files: File[]) => {
    const validFormats = ['.nes', '.smc', '.sfc', '.gb', '.gbc', '.gba', '.bin', '.md', '.gen', '.z64', '.n64', '.iso'];
    const processed = files.map(file => {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      const isValid = validFormats.includes(ext);
      return {
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        valid: isValid,
      };
    });
    setUploadedFiles(processed);
    onFilesSelected?.(files);
    console.log('Files uploaded:', processed);
  };

  return (
    <div className="space-y-4">
      <Card
        className={`p-8 border-2 border-dashed cursor-pointer transition-all hover-elevate ${
          isDragging ? "border-primary bg-primary/5" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('rom-file-input')?.click()}
        data-testid="dropzone-rom-upload"
      >
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="p-4 rounded-full bg-primary/10">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">
              Drag ROMs or click to browse
            </h3>
            <p className="text-sm text-muted-foreground">
              Supported formats: .nes, .smc, .gb, .gba, .bin, .md, .z64, .iso
            </p>
          </div>
          <Button variant="outline" data-testid="button-browse-files">
            <FileUp className="h-4 w-4 mr-2" />
            Browse Files
          </Button>
        </div>
      </Card>

      <input
        id="rom-file-input"
        type="file"
        multiple
        accept=".nes,.smc,.sfc,.gb,.gbc,.gba,.bin,.md,.gen,.z64,.n64,.iso"
        onChange={handleFileInput}
        className="hidden"
        data-testid="input-file-rom"
      />

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {file.valid ? (
                    <CheckCircle2 className="h-5 w-5 text-chart-3" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.size}</p>
                  </div>
                </div>
                {file.valid ? (
                  <span className="text-xs text-chart-3 font-medium">Valid ROM</span>
                ) : (
                  <span className="text-xs text-destructive font-medium">Unsupported format</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
