
"use client";

import React, { useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Upload, Camera, Scaling, Rotate3d, RotateCw } from "lucide-react";

type ControlPanelProps = {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onScreenshot: () => void;
  onScaleChange: (value: number) => void;
  onRotationChange: (axis: 'x' | 'y' | 'z', value: number) => void;
  onReset: () => void;
  scale: number;
  rotation: { x: number; y: number; z: number };
  modelLoaded: boolean;
};

export default function ControlPanel({
  onFileChange,
  onScreenshot,
  onScaleChange,
  onRotationChange,
  onReset,
  scale,
  rotation,
  modelLoaded,
}: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="absolute bottom-4 right-4 z-10 w-full max-w-xs">
      <Card className="bg-card/80 backdrop-blur-sm border-primary/20 shadow-lg shadow-black/50">
        <CardContent className="p-2 sm:p-4">
          <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
            <AccordionItem value="item-1" className="border-b-0">
              <AccordionTrigger className="hover:no-underline">File Actions</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onFileChange}
                  accept=".glb,.gltf,.fbx"
                  className="hidden"
                />
                <Button onClick={handleImportClick} className="w-full">
                  <Upload className="mr-2 h-4 w-4" /> Import Model
                </Button>
                <Button onClick={onScreenshot} className="w-full" variant="secondary">
                  <Camera className="mr-2 h-4 w-4" /> Capture Scene
                </Button>
              </AccordionContent>
            </AccordionItem>
            {modelLoaded && (
              <AccordionItem value="item-2" className="border-b-0">
                <AccordionTrigger className="hover:no-underline">Transform</AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4">
                  <div className="space-y-3">
                    <Label htmlFor="scale" className="flex items-center text-sm font-medium">
                      <Scaling className="mr-2 h-4 w-4" /> Scale
                    </Label>
                    <Slider
                      id="scale"
                      min={0.1}
                      max={3}
                      step={0.05}
                      value={[scale]}
                      onValueChange={(value) => onScaleChange(value[0])}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="flex items-center text-sm font-medium mb-2">
                      <Rotate3d className="mr-2 h-4 w-4" /> Rotation
                    </Label>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="rotate-x" className="text-xs text-muted-foreground">Rotation X</Label>
                            <Slider
                                id="rotate-x"
                                min={0}
                                max={360}
                                step={1}
                                value={[rotation.x]}
                                onValueChange={(value) => onRotationChange('x', value[0])}
                            />
                        </div>
                        <div>
                             <Label htmlFor="rotate-y" className="text-xs text-muted-foreground">Rotation Y</Label>
                            <Slider
                                id="rotate-y"
                                min={0}
                                max={360}
                                step={1}
                                value={[rotation.y]}
                                onValueChange={(value) => onRotationChange('y', value[0])}
                            />
                        </div>
                        <div>
                             <Label htmlFor="rotate-z" className="text-xs text-muted-foreground">Rotation Z</Label>
                            <Slider
                                id="rotate-z"
                                min={0}
                                max={360}
                                step={1}
                                value={[rotation.z]}
                                onValueChange={(value) => onRotationChange('z', value[0])}
                            />
                        </div>
                    </div>
                  </div>
                  <Button onClick={onReset} variant="outline" className="w-full">
                    <RotateCw className="mr-2 h-4 w-4" /> Reset Transform
                  </Button>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
