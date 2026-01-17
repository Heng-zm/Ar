"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Upload, Camera, Scaling, Rotate3d, RotateCw, Settings2 } from "lucide-react";

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
  
  // State to control which accordion item is open
  const [activeTab, setActiveTab] = useState<string>("item-1");

  // Automatically switch to Transform tab when a model loads
  useEffect(() => {
    if (modelLoaded) {
      setActiveTab("item-2");
    }
  }, [modelLoaded]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const axisLabels = ['x', 'y', 'z'] as const;

  return (
    // Container: Positioned bottom-right, max width limited for mobile screens
    <div className="absolute bottom-4 right-4 z-20 w-full max-w-[320px] transition-all duration-300 pb-safe">
      <Card className="bg-black/70 backdrop-blur-md border-white/10 shadow-2xl text-white overflow-hidden">
        <CardContent className="p-0">
          <Accordion 
            type="single" 
            collapsible 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            {/* --- SECTION 1: File Actions --- */}
            <AccordionItem value="item-1" className="border-b-white/10 px-4">
              <AccordionTrigger className="hover:no-underline py-3 text-sm font-semibold">
                <span className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-primary" /> 
                    Menu & Actions
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onFileChange}
                  // Updated to support all implemented formats
                  accept=".glb,.gltf,.fbx,.obj,.stl,.ply"
                  className="hidden"
                />
                
                <Button 
                    onClick={handleImportClick} 
                    className="w-full bg-white/10 hover:bg-white/20 text-white border-0 transition-colors"
                    variant="outline"
                >
                  <Upload className="mr-2 h-4 w-4" /> Import Model
                </Button>
                
                <Button 
                    onClick={onScreenshot} 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-0 transition-colors"
                >
                  <Camera className="mr-2 h-4 w-4" /> Capture Scene
                </Button>

                <p className="text-[10px] text-center text-white/40 pt-1">
                  Supports: .glb, .gltf, .fbx, .obj, .stl, .ply
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* --- SECTION 2: Transform (Only visible if loaded) --- */}
            {modelLoaded && (
              <AccordionItem value="item-2" className="border-b-0 px-4">
                <AccordionTrigger className="hover:no-underline py-3 text-sm font-semibold">
                    <span className="flex items-center gap-2">
                        <Rotate3d className="h-4 w-4 text-green-400" /> 
                        Transform Model
                    </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-5 pb-4 pt-1">
                  
                  {/* Scale Control */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="scale" className="flex items-center text-xs text-gray-300 font-medium">
                        <Scaling className="mr-2 h-3 w-3" /> Scale
                        </Label>
                        <span className="text-xs font-mono text-primary">{scale.toFixed(2)}x</span>
                    </div>
                    <Slider
                      id="scale"
                      min={0.1}
                      max={3}
                      step={0.05}
                      value={[scale]}
                      onValueChange={(value) => onScaleChange(value[0])}
                      className="cursor-pointer"
                    />
                  </div>

                  {/* Rotation Controls (Loop for DRY code) */}
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rotation</Label>
                    
                    {axisLabels.map((axis) => (
                        <div key={axis} className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor={`rotate-${axis}`} className="text-xs text-gray-300 uppercase">
                                    {axis}-Axis
                                </Label>
                                <span className="text-xs font-mono text-green-300">
                                    {Math.round(rotation[axis])}°
                                </span>
                            </div>
                            <Slider
                                id={`rotate-${axis}`}
                                min={0}
                                max={360}
                                step={1}
                                value={[rotation[axis]]}
                                onValueChange={(value) => onRotationChange(axis, value[0])}
                                className="cursor-pointer"
                            />
                        </div>
                    ))}
                  </div>

                  {/* Reset Button */}
                  <Button 
                    onClick={onReset} 
                    variant="ghost" 
                    size="sm"
                    className="w-full text-xs text-gray-400 hover:text-white hover:bg-white/10 mt-2"
                  >
                    <RotateCw className="mr-2 h-3 w-3" /> Reset Position
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