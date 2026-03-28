import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export function SettingsPanel() {
  const [volume, setVolume] = useState([75]);
  const [crtFilter, setCrtFilter] = useState(true);
  const [scanlines, setScanlines] = useState(false);

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-display font-bold mb-6">Settings</h2>
      
      <Tabs defaultValue="video">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="video" data-testid="tab-video">Video</TabsTrigger>
          <TabsTrigger value="audio" data-testid="tab-audio">Audio</TabsTrigger>
          <TabsTrigger value="controls" data-testid="tab-controls">Controls</TabsTrigger>
          <TabsTrigger value="advanced" data-testid="tab-advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="video" className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="resolution">Display Resolution</Label>
            <Select defaultValue="native">
              <SelectTrigger id="resolution" data-testid="select-resolution">
                <SelectValue placeholder="Select resolution" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="native">Native</SelectItem>
                <SelectItem value="720p">720p</SelectItem>
                <SelectItem value="1080p">1080p</SelectItem>
                <SelectItem value="1440p">1440p</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="crt-filter">CRT Filter</Label>
              <p className="text-sm text-muted-foreground">
                Apply authentic CRT monitor effect
              </p>
            </div>
            <Switch
              id="crt-filter"
              checked={crtFilter}
              onCheckedChange={setCrtFilter}
              data-testid="switch-crt-filter"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="scanlines">Scanlines</Label>
              <p className="text-sm text-muted-foreground">
                Add horizontal scanline overlay
              </p>
            </div>
            <Switch
              id="scanlines"
              checked={scanlines}
              onCheckedChange={setScanlines}
              data-testid="switch-scanlines"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aspect-ratio">Aspect Ratio</Label>
            <Select defaultValue="4:3">
              <SelectTrigger id="aspect-ratio" data-testid="select-aspect-ratio">
                <SelectValue placeholder="Select aspect ratio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4:3">4:3 (Original)</SelectItem>
                <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                <SelectItem value="stretch">Stretch to Fill</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="audio" className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="volume">
              Volume: {volume[0]}%
            </Label>
            <Slider
              id="volume"
              min={0}
              max={100}
              step={1}
              value={volume}
              onValueChange={setVolume}
              data-testid="slider-volume"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="audio-sync">Audio Sync</Label>
              <p className="text-sm text-muted-foreground">
                Synchronize audio with video
              </p>
            </div>
            <Switch id="audio-sync" defaultChecked data-testid="switch-audio-sync" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="audio-latency">Audio Latency</Label>
            <Select defaultValue="low">
              <SelectTrigger id="audio-latency" data-testid="select-audio-latency">
                <SelectValue placeholder="Select latency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ultra-low">Ultra Low (16ms)</SelectItem>
                <SelectItem value="low">Low (32ms)</SelectItem>
                <SelectItem value="normal">Normal (64ms)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="controls" className="space-y-6 mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <Label>A Button</Label>
                <p className="text-sm text-muted-foreground">Keyboard: Z</p>
              </div>
              <Button variant="outline" size="sm" data-testid="button-remap-a">
                Remap
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <Label>B Button</Label>
                <p className="text-sm text-muted-foreground">Keyboard: X</p>
              </div>
              <Button variant="outline" size="sm" data-testid="button-remap-b">
                Remap
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <Label>Start</Label>
                <p className="text-sm text-muted-foreground">Keyboard: Enter</p>
              </div>
              <Button variant="outline" size="sm" data-testid="button-remap-start">
                Remap
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <Label>Select</Label>
                <p className="text-sm text-muted-foreground">Keyboard: Shift</p>
              </div>
              <Button variant="outline" size="sm" data-testid="button-remap-select">
                Remap
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="gamepad">Gamepad Support</Label>
              <p className="text-sm text-muted-foreground">
                Auto-detect and map controllers
              </p>
            </div>
            <Switch id="gamepad" defaultChecked data-testid="switch-gamepad" />
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="save-location">Save State Directory</Label>
            <div className="flex gap-2">
              <input
                id="save-location"
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                defaultValue="/saves"
                readOnly
                data-testid="input-save-location"
              />
              <Button variant="outline" data-testid="button-change-location">
                Change
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-save">Auto-Save States</Label>
              <p className="text-sm text-muted-foreground">
                Automatically save on exit
              </p>
            </div>
            <Switch id="auto-save" defaultChecked data-testid="switch-auto-save" />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="fast-forward">Fast Forward Available</Label>
              <p className="text-sm text-muted-foreground">
                Enable fast forward mode (Space key)
              </p>
            </div>
            <Switch id="fast-forward" data-testid="switch-fast-forward" />
          </div>

          <Button variant="destructive" className="w-full" data-testid="button-reset-settings">
            Reset All Settings
          </Button>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
