
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
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
    const requestRef = useRef<number>();

    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
    const [modelLoaded, setModelLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const { toast } = useToast();

    const onResize = useCallback(() => {
        if (cameraRef.current && rendererRef.current && videoRef.current) {
            const displayWidth = videoRef.current.clientWidth;
            const displayHeight = videoRef.current.clientHeight;

            rendererRef.current.setSize(displayWidth, displayHeight);
            cameraRef.current.aspect = displayWidth / displayHeight;
            cameraRef.current.updateProjectionMatrix();
        }
    }, []);

    useEffect(() => {
        const initCamera = async () => {
            try {
                let stream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                } catch (e) {
                    console.info("Could not get environment camera, trying default.", e);
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                }
                
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play();
                        setCameraReady(true);
                        onResize();
                    };
                }
            } catch (err) {
                console.error("Error accessing camera: ", err);
                setError("Could not access the camera. Please check permissions and try again. Ensure a camera is available.");
            }
        };
        initCamera();

        window.addEventListener('resize', onResize);
        
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
            window.removeEventListener('resize', onResize);
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [onResize]);
    
    useEffect(() => {
        if (cameraReady && canvasRef.current) {
            const scene = new THREE.Scene();
            sceneRef.current = scene;

            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 5;
            cameraRef.current = camera;
            
            const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            rendererRef.current = renderer;
            
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(0, 1, 1);
            scene.add(directionalLight);
            
            const animate = () => {
                if (rendererRef.current && sceneRef.current && cameraRef.current) {
                    rendererRef.current.render(sceneRef.current, cameraRef.current);
                }
                requestRef.current = requestAnimationFrame(animate);
            };
            animate();
            onResize();
        }
    }, [cameraReady, onResize]);

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
            modelRef.current.clear();
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
                const size = box.getSize(new THREE.Vector3()).length();
                const center = box.getCenter(new THREE.Vector3());
                
                model.position.sub(center);

                const scaleFactor = 3 / size;
                model.scale.set(scaleFactor, scaleFactor, scaleFactor);
                
                modelRef.current = model;
                sceneRef.current!.add(model);
                
                handleReset();
                setModelLoaded(true);
                setLoading(false);
                toast({
                    title: "Model Loaded",
                    description: `Successfully loaded ${file.name}.`,
                });
            };
            
            const onModelError = (err: any) => {
                console.error("Error loading model: ", err);
                setError("Failed to load 3D model. The file might be corrupted or in an unsupported format.");
                setLoading(false);
            };

            const fileName = file.name.toLowerCase();
            const fileBuffer = contents as ArrayBuffer;

            if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
                const loader = new GLTFLoader();
                loader.parse(fileBuffer, '', (gltf) => onModelLoad(gltf.scene), onModelError);
            } else if (fileName.endsWith('.fbx')) {
                const loader = new FBXLoader();
                try {
                    const model = loader.parse(fileBuffer, '');
                    onModelLoad(model);
                } catch (err) {
                    onModelError(err);
                }
            } else {
                setError("Unsupported file format. Please use .gltf, .glb, or .fbx");
                setLoading(false);
                return;
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
        tempCanvas.width = arCanvas.clientWidth;
        tempCanvas.height = arCanvas.clientHeight;
        
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
        ctx.drawImage(arCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
        
        const link = document.createElement('a');
        link.download = 'ARchitect_scene.png';
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="relative h-full w-full bg-black">
            <video ref={videoRef} className="absolute top-0 left-0 h-full w-full object-cover z-0" playsInline muted />
            <canvas ref={canvasRef} className="absolute top-0 left-0 h-full w-full z-1" />
            
            {loading && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center flex-col gap-2">
                    <Loader className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-foreground">Loading Model...</p>
                </div>
            )}

            {error && (
                 <div className="absolute top-4 left-4 right-4 z-30">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </div>
            )}

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
    );
}
