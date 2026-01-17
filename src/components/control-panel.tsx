"use client";

import React, { useRef, useState, useEffect } from 'react';
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
    <div className="absolute bottom-4 right-4 z-20 w-full max-w-[320px] transition-all duration-300 pb-safe">
      <Card className="bg-[#18181B]/90 backdrop-blur-md border-white/5 shadow-2xl text-white overflow-hidden">
        <CardContent className="p-0">
          <Accordion 
            type="single" 
            collapsible 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            {/* --- SECTION 1: File Actions --- */}
            <AccordionItem value="item-1" className="border-b-white/5 px-4">
              <AccordionTrigger className="hover:no-underline py-4 text-base font-medium text-white">
                File Actions
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-5 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onFileChange}
                  accept=".glb,.gltf,.fbx,.obj,.stl,.ply"
                  className="hidden"
                />
                
                {/* Primary Action: Import Model (Cyan) */}
                <Button 
                    onClick={handleImportClick} 
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-medium text-base rounded-md transition-all shadow-lg shadow-primary/20"
                >
                  <Upload className="mr-2 h-4 w-4" /> Import Model
                </Button>
                
                {/* Secondary Action: Capture Scene (Dark Gray) */}
                <Button 
                    onClick={onScreenshot} 
                    className="w-full h-12 bg-[#27272A] hover:bg-[#3F3F46] text-white border-0 font-medium text-base rounded-md transition-all"
                >
                  <Camera className="mr-2 h-4 w-4" /> Capture Scene
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* --- SECTION 2: Transform (Only visible if loaded) --- */}
            {modelLoaded && (
              <AccordionItem value="item-2" className="border-b-0 px-4">
                <AccordionTrigger className="hover:no-underline py-4 text-base font-medium text-white">
                    <span className="flex items-center gap-2">
                        Transform Model
                    </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-6 pb-5 pt-1">
                  
                  {/* Scale Control */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="scale" className="flex items-center text-xs text-gray-400 font-medium uppercase tracking-wider">
                          <Scaling className="mr-1.5 h-3 w-3" /> Scale
                        </Label>
                        <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{scale.toFixed(2)}x</span>
                    </div>
                    <Slider
                      id="scale"
                      min={0.1}
                      max={3}
                      step={0.05}
                      value={[scale]}
                      onValueChange={(value) => onScaleChange(value[0])}
                      className="cursor-pointer py-1"
                    />
                  </div>

                  {/* Rotation Controls */}
                  <div className="space-y-5">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Rotation</Label>
                    
                    {axisLabels.map((axis) => (
                        <div key={axis} className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor={`rotate-${axis}`} className="text-xs text-gray-400 uppercase font-medium">
                                    {axis}-Axis
                                </Label>
                                <span className="text-xs font-mono text-white/70">
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
                                className="cursor-pointer py-1"
                            />
                        </div>
                    ))}
                  </div>

                  {/* Reset Button */}
                  <Button 
                    onClick={onReset} 
                    variant="ghost" 
                    size="sm"
                    className="w-full h-10 text-xs text-gray-400 hover:text-white hover:bg-white/10 mt-2"
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