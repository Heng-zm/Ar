"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Upload, Camera, Scaling, Rotate3d, RotateCw, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

type ControlPanelProps = {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onScreenshot: () => void;
  onScaleChange: (value: number) => void;
  onRotationChange: (axis: 'x' | 'y' | 'z', value: number) => void;
  onReset: () => void;
  onToggleCompass: () => void;
  compassActive: boolean;
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
  onToggleCompass,
  compassActive,
  scale,
  rotation,
  modelLoaded,
}: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<string>("item-1");

  useEffect(() => {
    if (modelLoaded) setActiveTab("item-2");
  }, [modelLoaded]);

  const handleImportClick = () => fileInputRef.current?.click();
  const axisLabels = ['x', 'y', 'z'] as const;

  return (
    <div className="absolute bottom-6 right-4 w-full max-w-[320px] pointer-events-auto pb-safe transition-all duration-300">
      <Card className="bg-[#18181B]/95 backdrop-blur-xl border-white/10 shadow-2xl text-white overflow-hidden rounded-xl">
        <CardContent className="p-0">
          <Accordion type="single" collapsible value={activeTab} onValueChange={setActiveTab} className="w-full">
            
            {/* SECTION 1: Menu & Actions */}
            <AccordionItem value="item-1" className="border-b-white/10 px-4">
              <AccordionTrigger className="hover:no-underline py-4 text-sm font-medium text-white">
                Menu & Actions
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-5 pt-1">
                <input type="file" ref={fileInputRef} onChange={onFileChange} accept=".glb,.gltf,.fbx,.obj,.stl,.ply" className="hidden" />
                
                <Button onClick={handleImportClick} className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-medium rounded-lg shadow-lg shadow-primary/10">
                  <Upload className="mr-2 h-4 w-4" /> Import Model
                </Button>
                
                <Button onClick={onScreenshot} className="w-full h-11 bg-white/5 hover:bg-white/10 text-white border-0 font-medium rounded-lg">
                  <Camera className="mr-2 h-4 w-4" /> Capture Scene
                </Button>

                {/* Compass Toggle */}
                <Button 
                    onClick={onToggleCompass} 
                    variant={compassActive ? "default" : "outline"}
                    className={cn(
                        "w-full h-11 border-0 font-medium rounded-lg transition-all",
                        compassActive 
                            ? "bg-green-600 hover:bg-green-700 text-white" 
                            : "bg-white/5 hover:bg-white/10 text-white"
                    )}
                >
                  <Compass className={cn("mr-2 h-4 w-4", compassActive && "animate-pulse")} /> 
                  {compassActive ? "Compass Active" : "Enable Compass Mode"}
                </Button>

                <p className="text-[10px] text-center text-white/30 pt-1">Supports: .gltf, .glb, .fbx, .obj, .stl, .ply</p>
              </AccordionContent>
            </AccordionItem>

            {/* SECTION 2: Transforms */}
            {modelLoaded && (
              <AccordionItem value="item-2" className="border-b-0 px-4">
                <AccordionTrigger className="hover:no-underline py-4 text-sm font-medium text-white">
                    <span className="flex items-center gap-2">
                        <Rotate3d className="h-4 w-4 text-primary" /> Transform Model
                    </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-6 pb-5 pt-1">
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="scale" className="flex items-center text-xs text-gray-400 font-medium uppercase tracking-wider">
                          <Scaling className="mr-1.5 h-3 w-3" /> Scale
                        </Label>
                        <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{scale.toFixed(2)}x</span>
                    </div>
                    <Slider id="scale" min={0.1} max={3} step={0.05} value={[scale]} onValueChange={(v) => onScaleChange(v[0])} className="cursor-pointer py-1" />
                  </div>

                  <div className="space-y-4">
                    {axisLabels.map((axis) => (
                        <div key={axis} className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor={`rotate-${axis}`} className={cn("text-xs uppercase font-medium", axis === 'y' && compassActive ? "text-green-400" : "text-gray-400")}>
                                    {axis}-Axis {axis === 'y' && compassActive && "(Auto)"}
                                </Label>
                                <span className="text-xs font-mono text-white/60">{Math.round(rotation[axis])}°</span>
                            </div>
                            <Slider
                                id={`rotate-${axis}`}
                                min={0}
                                max={360}
                                step={1}
                                disabled={axis === 'y' && compassActive}
                                value={[rotation[axis]]}
                                onValueChange={(v) => onRotationChange(axis, v[0])}
                                className={cn("cursor-pointer py-1", axis === 'y' && compassActive && "opacity-50 cursor-not-allowed")}
                            />
                        </div>
                    ))}
                  </div>

                  <Button onClick={onReset} variant="ghost" size="sm" className="w-full h-9 text-xs text-gray-500 hover:text-white hover:bg-white/5 mt-2">
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