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
  const [activeTab, setActiveTab] = useState<string>("item-1");

  // Auto-expand transforms when loaded
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
    // Wrapper positioned at bottom-right
    // pointer-events-auto is CRITICAL here so buttons work
    // pb-safe handles iPhone Home Indicator area
    <div className="absolute bottom-6 right-4 w-full max-w-[320px] pointer-events-auto pb-safe transition-all duration-300">
      <Card className="bg-[#18181B]/95 backdrop-blur-xl border-white/10 shadow-2xl text-white overflow-hidden rounded-xl">
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
              <AccordionTrigger className="hover:no-underline py-4 text-sm font-medium text-white">
                Menu & Actions
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-5 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onFileChange}
                  accept=".glb,.gltf,.fbx,.obj,.stl,.ply"
                  className="hidden"
                />
                
                {/* Primary: Import */}
                <Button 
                    onClick={handleImportClick} 
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-medium rounded-lg shadow-lg shadow-primary/10"
                >
                  <Upload className="mr-2 h-4 w-4" /> Import Model
                </Button>
                
                {/* Secondary: Screenshot */}
                <Button 
                    onClick={onScreenshot} 
                    className="w-full h-11 bg-white/5 hover:bg-white/10 text-white border-0 font-medium rounded-lg"
                >
                  <Camera className="mr-2 h-4 w-4" /> Capture Scene
                </Button>
                
                <p className="text-[10px] text-center text-white/30 pt-1">
                  Supports: .gltf, .glb, .fbx, .obj, .stl, .ply
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* --- SECTION 2: Transforms (Visible when Loaded) --- */}
            {modelLoaded && (
              <AccordionItem value="item-2" className="border-b-0 px-4">
                <AccordionTrigger className="hover:no-underline py-4 text-sm font-medium text-white">
                    <span className="flex items-center gap-2">
                        <Rotate3d className="h-4 w-4 text-primary" /> 
                        Transform Model
                    </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-6 pb-5 pt-1">
                  
                  {/* Scale */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="scale" className="flex items-center text-xs text-gray-400 font-medium uppercase tracking-wider">
                          <Scaling className="mr-1.5 h-3 w-3" /> Scale
                        </Label>
                        <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{scale.toFixed(2)}x</span>
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

                  {/* Rotation */}
                  <div className="space-y-4">
                    {axisLabels.map((axis) => (
                        <div key={axis} className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor={`rotate-${axis}`} className="text-xs text-gray-400 uppercase font-medium">
                                    {axis}-Axis
                                </Label>
                                <span className="text-xs font-mono text-white/60">
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

                  {/* Reset */}
                  <Button 
                    onClick={onReset} 
                    variant="ghost" 
                    size="sm"
                    className="w-full h-9 text-xs text-gray-500 hover:text-white hover:bg-white/5 mt-2"
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