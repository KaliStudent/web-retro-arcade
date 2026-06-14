import { ROMUploader } from '../ROMUploader';

export default function ROMUploaderExample() {
  return (
    <div className="p-8 bg-background">
      <div className="max-w-2xl mx-auto">
        <ROMUploader onFilesSelected={(files) => console.log('Files:', files)} />
      </div>
    </div>
  );
}
