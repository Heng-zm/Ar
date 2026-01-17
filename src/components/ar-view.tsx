"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

// --- Loaders ---
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';

// --- WebXR ---
import { ARButton } from 'three/examples/jsm/webxr/ARButton';

// --- UI Components ---
import ControlPanel from './control-panel';
import { Loader, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';

export default function ARView() {
    // Refs for DOM and Three.js
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const modelRef = useRef<THREE.Group | null>(null);
    
    // Refs for Gestures
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const pinchDistanceRef = useRef<number | null>(null);
    const initialScaleRef = useRef<number>(1);
    const initialRotationRef = useRef<number>(0);
    const isInit = useRef(false);

    // State
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
    const [modelLoaded, setModelLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const { toast } = useToast();

    // --- 1. Resize Handler ---
    const onResize = useCallback(() => {
        if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
        
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height, false);
    }, []);

    // --- 2. Initialize Camera (Magic Window Mode) ---
    useEffect(() => {
        const startCamera = async () => {
            if (!videoRef.current) return;
            try {
                // Try environment (back) camera, fallback to user
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                }).catch(() => navigator.mediaDevices.getUserMedia({ video: true }));
                
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play().catch(e => console.warn("Autoplay blocked:", e));
                };
            } catch (err) {
                console.error("Camera init failed:", err);
                // We don't block the app here, because WebXR might still work
            }
        };
        startCamera();
        
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                tracks.forEach(t => t.stop());
            }
        };
    }, []);

    // --- 3. Initialize Three.js + WebXR ---
    useEffect(() => {
        if (!canvasRef.current || !containerRef.current || isInit.current) return;
        isInit.current = true;

        // SCENE
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // CAMERA
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 50);
        camera.position.z = 3; 
        cameraRef.current = camera;

        // RENDERER
        const renderer = new THREE.WebGLRenderer({ 
            canvas: canvasRef.current,
            alpha: true, // Important for video background
            antialias: true,
            preserveDrawingBuffer: true // Important for screenshots
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.xr.enabled = true; // Enable WebXR
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        rendererRef.current = renderer;

        // LIGHTING
        // Hemisphere: Soft general light (Sky/Ground)
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);

        // Directional: Sun light (Casts shadows)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(3, 10, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.bias = -0.0001;
        scene.add(dirLight);

        // SHADOW PLANE (Invisible catcher)
        const shadowMat = new THREE.ShadowMaterial({ opacity: 0.4 });
        const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), shadowMat);
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = -0.01;
        shadowPlane.receiveShadow = true;
        scene.add(shadowPlane);

        // AR BUTTON
        const arButton = ARButton.createButton(renderer, { 
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: document.body } 
        });
        
        // Manual styling to ensure AR Button doesn't overlap Control Panel
        arButton.style.position = 'absolute';
        arButton.style.bottom = '20px'; // Positioned at bottom center
        arButton.style.left = '50%';
        arButton.style.transform = 'translateX(-50%)';
        arButton.style.zIndex = '50';
        arButton.style.borderRadius = '20px';
        arButton.style.border = '1px solid white';
        arButton.style.opacity = '0.9';
        containerRef.current.appendChild(arButton);

        // ANIMATION LOOP
        renderer.setAnimationLoop(() => {
            renderer.render(scene, camera);
        });

        window.addEventListener('resize', onResize);

        // CLEANUP
        return () => {
            window.removeEventListener('resize', onResize);
            renderer.setAnimationLoop(null);
            if (arButton.parentNode) arButton.parentNode.removeChild(arButton);
            
            scene.traverse((object) => {
                if ((object as THREE.Mesh).isMesh) {
                    (object as THREE.Mesh).geometry.dispose();
                    const mat = (object as THREE.Mesh).material;
                    if (Array.isArray(mat)) mat.forEach(m => m.dispose());
                    else (mat as THREE.Material).dispose();
                }
            });
            renderer.dispose();
            isInit.current = false;
        };
    }, [onResize]);

    // --- 4. Sync Model Transforms ---
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

    // --- 5. Touch Gestures (Rotate & Pinch) ---
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            initialRotationRef.current = rotation.y;
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
            initialScaleRef.current = scale;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 1 && touchStartRef.current) {
            const deltaX = e.touches[0].clientX - touchStartRef.current.x;
            // 0.5 degrees per pixel drag
            setRotation(prev => ({ ...prev, y: initialRotationRef.current + (deltaX * 0.5) }));
        } else if (e.touches.length === 2 && pinchDistanceRef.current) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const newDist = Math.sqrt(dx * dx + dy * dy);
            const scaleFactor = newDist / pinchDistanceRef.current;
            // Clamp scale between 0.1 and 5
            setScale(Math.max(0.1, Math.min(5, initialScaleRef.current * scaleFactor)));
        }
    };

    const handleTouchEnd = () => {
        touchStartRef.current = null;
        pinchDistanceRef.current = null;
    };

    // --- 6. File Loading Logic ---
    const handleReset = () => {
        setScale(1);
        setRotation({ x: 0, y: 0, z: 0 });
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !sceneRef.current) return;

        setLoading(true);
        setError(null);

        // Remove old model
        if (modelRef.current) {
            sceneRef.current.remove(modelRef.current);
            modelRef.current = null;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const contents = e.target?.result;
            if (!contents) { setLoading(false); return; }

            const processModel = (obj: THREE.Object3D) => {
                // Normalize Position (Center on Origin)
                const box = new THREE.Box3().setFromObject(obj);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                obj.position.set(-center.x, -box.min.y, -center.z);

                // Enable Shadows
                obj.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Create Parent Group
                const group = new THREE.Group();
                group.add(obj);

                // Normalize Scale (Fit to screen)
                const maxDim = Math.max(size.x, size.y, size.z);
                const scaleF = 2 / (maxDim || 1);
                group.scale.set(scaleF, scaleF, scaleF);

                sceneRef.current!.add(group);
                modelRef.current = group;

                setLoading(false);
                setModelLoaded(true);
                handleReset();
                toast({ title: "Model Loaded", description: `Displayed ${file.name}` });
            };

            const onError = () => {
                setError("Failed to parse file.");
                setLoading(false);
            };

            // Loader Switching
            const buffer = contents as ArrayBuffer;
            const name = file.name.toLowerCase();

            try {
                if (name.endsWith('.glb') || name.endsWith('.gltf')) {
                    new GLTFLoader().parse(buffer, '', (g) => processModel(g.scene), onError);
                } else if (name.endsWith('.fbx')) {
                    const obj = new FBXLoader().parse(buffer, '');
                    processModel(obj);
                } else if (name.endsWith('.obj')) {
                    const txt = new TextDecoder().decode(buffer);
                    const obj = new OBJLoader().parse(txt);
                    processModel(obj);
                } else if (name.endsWith('.stl')) {
                    const geo = new STLLoader().parse(buffer);
                    processModel(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xcccccc })));
                } else if (name.endsWith('.ply')) {
                    const geo = new PLYLoader().parse(buffer);
                    geo.computeVertexNormals();
                    processModel(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xcccccc })));
                } else {
                    setError("Unsupported format");
                    setLoading(false);
                }
            } catch (err) { onError(); }
        };
        reader.readAsArrayBuffer(file);
    };

    // --- 7. Screenshot ---
    const handleScreenshot = () => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
        
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        const canvas = canvasRef.current!;
        
        // Create high-res composite
        const composite = document.createElement('canvas');
        composite.width = canvas.width;
        composite.height = canvas.height;
        const ctx = composite.getContext('2d');
        if (!ctx) return;

        // Draw Video Background (Crop to Cover)
        if (videoRef.current) {
            const v = videoRef.current;
            const vRatio = v.videoWidth / v.videoHeight;
            const cRatio = canvas.width / canvas.height;
            let dw, dh, dx, dy;

            if (vRatio > cRatio) {
                dh = canvas.height; dw = dh * vRatio; dx = (canvas.width - dw) / 2; dy = 0;
            } else {
                dw = canvas.width; dh = dw / vRatio; dy = (canvas.height - dh) / 2; dx = 0;
            }
            ctx.drawImage(v, dx, dy, dw, dh);
        }

        // Draw 3D Content
        ctx.drawImage(canvas, 0, 0);

        const link = document.createElement('a');
        link.download = `AR_Capture_${Date.now()}.png`;
        link.href = composite.toDataURL('image/png');
        link.click();
    };

    return (
        <div 
            ref={containerRef}
            className="relative w-full h-[100dvh] bg-black overflow-hidden"
            style={{ touchAction: 'none' }} // Prevents browser scrolling
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Background Video (Pass-through) */}
            <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" 
                playsInline muted autoPlay 
            />
            
            {/* 3D Canvas */}
            <canvas 
                ref={canvasRef} 
                className="absolute inset-0 w-full h-full z-10 pointer-events-none" 
            />

            {/* Overlays */}
            {loading && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2 bg-black/60 p-6 rounded-xl backdrop-blur-md">
                    <Loader className="h-8 w-8 animate-spin text-white" />
                    <span className="text-white text-sm font-medium">Loading Model...</span>
                </div>
            )}

            {error && (
                <div className="absolute top-4 left-4 right-4 z-50">
                    <Alert variant="destructive" className="bg-red-950/80 border-red-500/50 text-red-100">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </div>
            )}

            {!modelLoaded && !loading && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 text-sm z-0 pointer-events-none select-none text-center w-full">
                    No Model Loaded<br/>Tap "Menu" to Import
                </div>
            )}

            {/* Controls Layer */}
            {/* pointer-events-none on wrapper lets touches pass to canvas */}
            {/* The ControlPanel itself has pointer-events-auto */}
            <div className="absolute inset-0 z-40 pointer-events-none">
                <ControlPanel
                    onFileChange={handleFileChange}
                    onScreenshot={handleScreenshot}
                    onScaleChange={setScale}
                    onRotationChange={(axis, val) => setRotation(prev => ({...prev, [axis]: val}))}
                    onReset={handleReset}
                    scale={scale}
                    rotation={rotation}
                    modelLoaded={modelLoaded}
                />
            </div>
        </div>
    );
}