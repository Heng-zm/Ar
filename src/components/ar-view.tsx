"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
// Import the loaders and the specific GLTF type for TypeScript
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import ControlPanel from './control-panel';
import { Loader, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';

export default function ARView() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const modelRef = useRef<THREE.Group | null>(null);
    
    // FIX: Initialize useRef with null to satisfy TypeScript strict mode
    const requestRef = useRef<number | null>(null);
    const isInit = useRef(false);

    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
    const [modelLoaded, setModelLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const { toast } = useToast();

    // Resize handler
    const onResize = useCallback(() => {
        if (cameraRef.current && rendererRef.current && videoRef.current) {
            const displayWidth = videoRef.current.clientWidth;
            const displayHeight = videoRef.current.clientHeight;

            if (canvasRef.current?.width !== displayWidth || canvasRef.current?.height !== displayHeight) {
                rendererRef.current.setSize(displayWidth, displayHeight, false);
                cameraRef.current.aspect = displayWidth / displayHeight;
                cameraRef.current.updateProjectionMatrix();
            }
        }
    }, []);

    // 1. Initialize Camera
    useEffect(() => {
        const initCamera = async () => {
            try {
                let stream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { facingMode: 'environment' } 
                    });
                } catch (e) {
                    console.info("Environment camera failed, trying user camera.", e);
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                }
                
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play().catch(e => console.error("Autoplay prevented", e));
                        setCameraReady(true);
                    };
                }
            } catch (err) {
                console.error("Error accessing camera: ", err);
                setError("Could not access the camera. Please check permissions.");
            }
        };

        initCamera();

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);
    
    // 2. Initialize Three.js Scene
    useEffect(() => {
        if (!cameraReady || !canvasRef.current || isInit.current) return;
        
        isInit.current = true;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const width = videoRef.current?.clientWidth || window.innerWidth;
        const height = videoRef.current?.clientHeight || window.innerHeight;

        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 5;
        cameraRef.current = camera;
        
        const renderer = new THREE.WebGLRenderer({ 
            canvas: canvasRef.current, 
            alpha: true, 
            antialias: true,
            preserveDrawingBuffer: true 
        });
        
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        rendererRef.current = renderer;
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 0, 1);
        camera.add(directionalLight);
        scene.add(camera);
        
        const animate = () => {
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
            requestRef.current = requestAnimationFrame(animate);
        };
        animate();
        onResize();

        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('resize', onResize);
            if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
            
            if (sceneRef.current) {
                sceneRef.current.traverse((object) => {
                    if (object instanceof THREE.Mesh) {
                        object.geometry.dispose();
                        if (object.material instanceof THREE.Material) {
                            object.material.dispose();
                        } else if (Array.isArray(object.material)) {
                            object.material.forEach((m: THREE.Material) => m.dispose());
                        }
                    }
                });
            }
            if (rendererRef.current) {
                rendererRef.current.dispose();
            }
            isInit.current = false;
        };
    }, [cameraReady, onResize]);

    // 3. Handle Model Transformations
    useEffect(() => {
        if (modelRef.current) {
            modelRef.current.scale.set(scale, scale, scale);
            modelRef.current.rotation.set(
                THREE.MathUtils.degToRad(rotation.x),
                THREE.MathUtils.degToRad(rotation.y),
                THREE.MathUtils.degToRad(rotation.z)
            );
        }
    }, [scale, rotation]);

    const handleReset = () => {
        setScale(1);
        setRotation({ x: 0, y: 0, z: 0 });
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !sceneRef.current) return;

        setLoading(true);
        setError(null);
        
        if (modelRef.current && sceneRef.current) {
            sceneRef.current.remove(modelRef.current);
            modelRef.current.traverse((child) => {
                 if (child instanceof THREE.Mesh) {
                     child.geometry.dispose();
                     if (Array.isArray(child.material)) (child.material as THREE.Material[]).forEach(m => m.dispose());
                     else (child.material as THREE.Material).dispose();
                 }
            });
            modelRef.current = null;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            const contents = e.target?.result;
            if (!contents) {
                setError("Failed to read file.");
                setLoading(false);
                return;
            }

            const onModelLoad = (object: THREE.Group) => {
                const model = object;
                
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                
                model.position.x = -center.x;
                model.position.y = -box.min.y;
                model.position.z = -center.z;
                
                const group = new THREE.Group();
                group.add(model);

                const maxDim = Math.max(size.x, size.y, size.z);
                const scaleFactor = 3 / maxDim;
                group.scale.set(scaleFactor, scaleFactor, scaleFactor);
                
                modelRef.current = group;
                sceneRef.current!.add(group);
                
                handleReset();
                setModelLoaded(true);
                setLoading(false);
                toast({
                    title: "Model Loaded",
                    description: `Successfully loaded ${file.name}.`,
                });
            };
            
            const onModelError = (err: unknown) => {
                console.error("Error loading model: ", err);
                setError("Failed to load 3D model. The file might be corrupted or in an unsupported format.");
                setLoading(false);
            };

            const fileName = file.name.toLowerCase();
            const fileBuffer = contents as ArrayBuffer;

            if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
                const loader = new GLTFLoader();
                // FIX: Explicitly type the result or use 'any' if types are stubborn
                loader.parse(fileBuffer, '', (gltf: GLTF) => onModelLoad(gltf.scene), onModelError);
            } else if (fileName.endsWith('.fbx')) {
                const loader = new FBXLoader();
                try {
                    // FBXLoader.parse returns a Group directly
                    const model = loader.parse(fileBuffer, '');
                    onModelLoad(model);
                } catch (err) {
                    onModelError(err);
                }
            } else {
                setError("Unsupported file format. Please use .gltf, .glb, or .fbx");
                setLoading(false);
            }
        };
        reader.onerror = () => {
             setError("Error reading file.");
             setLoading(false);
        }
        reader.readAsArrayBuffer(file);
    };

    const handleScreenshot = () => {
        if (!videoRef.current || !canvasRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;
        
        rendererRef.current.render(sceneRef.current, cameraRef.current);

        const video = videoRef.current;
        const arCanvas = canvasRef.current;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = arCanvas.width;
        tempCanvas.height = arCanvas.height;
        
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) {
            setError("Could not create image for capture.");
            return;
        }
        
        const videoAspectRatio = video.videoWidth / video.videoHeight;
        const canvasAspectRatio = tempCanvas.width / tempCanvas.height;
        let renderWidth, renderHeight, xStart, yStart;

        if (videoAspectRatio > canvasAspectRatio) {
            renderHeight = tempCanvas.height;
            renderWidth = renderHeight * videoAspectRatio;
            xStart = (tempCanvas.width - renderWidth) / 2;
            yStart = 0;
        } else {
            renderWidth = tempCanvas.width;
            renderHeight = renderWidth / videoAspectRatio;
            yStart = (tempCanvas.height - renderHeight) / 2;
            xStart = 0;
        }
        
        ctx.drawImage(video, xStart, yStart, renderWidth, renderHeight);
        ctx.drawImage(arCanvas, 0, 0);
        
        const link = document.createElement('a');
        link.download = `AR_Capture_${Date.now()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="relative h-full w-full bg-black overflow-hidden">
            <video 
                ref={videoRef} 
                className="absolute top-0 left-0 h-full w-full object-cover z-0" 
                playsInline 
                muted 
                autoPlay
            />
            <canvas 
                ref={canvasRef} 
                className="absolute top-0 left-0 h-full w-full z-10 pointer-events-none" 
            />
            
            {loading && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex items-center flex-col gap-2 bg-black/50 p-4 rounded-lg backdrop-blur-sm">
                    <Loader className="h-12 w-12 animate-spin text-white" />
                    <p className="text-white font-medium">Loading Model...</p>
                </div>
            )}

            {error && (
                 <div className="absolute top-4 left-4 right-4 z-50">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </div>
            )}

            <div className="relative z-40">
                <ControlPanel
                    onFileChange={handleFileChange}
                    onScreenshot={handleScreenshot}
                    onScaleChange={setScale}
                    onRotationChange={(axis, value) => setRotation(prev => ({ ...prev, [axis]: value }))}
                    onReset={handleReset}
                    scale={scale}
                    rotation={rotation}
                    modelLoaded={modelLoaded}
                />
            </div>
        </div>
    );
}