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

// --- UI ---
import ControlPanel from './control-panel';
import { Loader, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';

export default function ARView() {
    // --- Refs ---
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const modelRef = useRef<THREE.Group | null>(null);
    
    // Gestures
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const pinchDistanceRef = useRef<number | null>(null);
    const initialScaleRef = useRef<number>(1);
    const initialRotationRef = useRef<number>(0);

    // State
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
    const [modelLoaded, setModelLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [arSupported, setArSupported] = useState(false);

    const { toast } = useToast();
    const isInit = useRef(false);

    // --- 1. Resize Handler ---
    const onResize = useCallback(() => {
        if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
        
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height, false);
    }, []);

    // --- 2. Initialize Camera (Background Video) ---
    useEffect(() => {
        const startCamera = async () => {
            if (!videoRef.current) return;
            try {
                // Try environment (back) camera first
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                }).catch(() => {
                    // Fallback to any camera
                    return navigator.mediaDevices.getUserMedia({ video: true });
                });
                
                videoRef.current.srcObject = stream;
                // Wait for metadata to avoid black frame issues
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play().catch(e => console.warn("Autoplay blocked:", e));
                };
            } catch (err) {
                console.error("Camera init failed:", err);
                // Don't set error state immediately here, as WebXR might still work
                // But generally for pass-through AR, we need camera.
            }
        };
        startCamera();
        
        // Cleanup camera on unmount
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
            alpha: true, // Critical for seeing video behind canvas
            antialias: true,
            preserveDrawingBuffer: true 
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
        renderer.xr.enabled = true; // Enable WebXR
        
        // Shadow Setup
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Color Management (Fixes dark/washed out colors)
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        rendererRef.current = renderer;

        // LIGHTING
        // 1. Hemisphere light (Sky/Ground) - ensures model is never pitch black
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);

        // 2. Directional Light (Sun) - casts shadows
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(3, 10, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 20;
        scene.add(dirLight);

        // SHADOW PLANE (Invisible catcher)
        const shadowMat = new THREE.ShadowMaterial({ opacity: 0.4 });
        const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), shadowMat);
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = -0.5; // Sit slightly below default
        shadowPlane.receiveShadow = true;
        scene.add(shadowPlane);

        // AR BUTTON
        // We append it to our container so it's not hidden behind z-index layers
        const arButton = ARButton.createButton(renderer, { 
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: document.body } 
        });
        
        // Style fixes for AR Button
        arButton.style.position = 'absolute';
        arButton.style.bottom = '24px'; // Move up slightly
        arButton.style.left = '50%';
        arButton.style.transform = 'translateX(-50%)';
        arButton.style.zIndex = '50'; // Ensure it's on top of everything
        arButton.style.width = 'auto';
        arButton.style.padding = '10px 20px';
        arButton.style.backgroundColor = 'white';
        arButton.style.color = 'black';
        arButton.style.borderRadius = '20px';
        arButton.style.border = 'none';
        arButton.style.fontWeight = 'bold';
        
        containerRef.current.appendChild(arButton);
        
        // Check if AR is actually supported to show specific UI hints if needed
        if ('xr' in navigator) {
            (navigator as any).xr.isSessionSupported('immersive-ar').then((supported: boolean) => {
                setArSupported(supported);
            });
        }

        // ANIMATION LOOP
        // *IMPORTANT*: Use setAnimationLoop, NOT requestAnimationFrame
        renderer.setAnimationLoop(() => {
            renderer.render(scene, camera);
        });

        // Event Listeners
        window.addEventListener('resize', onResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', onResize);
            renderer.setAnimationLoop(null);
            if (arButton && arButton.parentNode) {
                arButton.parentNode.removeChild(arButton);
            }
            renderer.dispose();
            isInit.current = false;
        };
    }, [onResize]);

    // --- 4. Model Sync ---
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

    // --- 5. Touch Gestures ---
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
        // 1 Finger Rotate
        if (e.touches.length === 1 && touchStartRef.current) {
            const deltaX = e.touches[0].clientX - touchStartRef.current.x;
            const newY = initialRotationRef.current + (deltaX * 0.5); 
            setRotation(prev => ({ ...prev, y: newY }));
        } 
        // 2 Finger Pinch
        else if (e.touches.length === 2 && pinchDistanceRef.current) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const newDist = Math.sqrt(dx * dx + dy * dy);
            const scaleFactor = newDist / pinchDistanceRef.current;
            const newScale = Math.max(0.1, Math.min(5, initialScaleRef.current * scaleFactor));
            setScale(newScale);
        }
    };

    const handleTouchEnd = () => {
        touchStartRef.current = null;
        pinchDistanceRef.current = null;
    };

    // --- 6. File Loading (Fixed Normalization) ---
    const handleReset = () => {
        setScale(1);
        setRotation({ x: 0, y: 0, z: 0 });
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !sceneRef.current) return;
        setLoading(true); setError(null);

        // Remove old model safely
        if (modelRef.current) {
            sceneRef.current.remove(modelRef.current);
            // Deep dispose to free memory
            modelRef.current.traverse((obj) => {
                if ((obj as THREE.Mesh).isMesh) {
                    (obj as THREE.Mesh).geometry.dispose();
                    const mat = (obj as THREE.Mesh).material;
                    if (Array.isArray(mat)) mat.forEach(m => m.dispose());
                    else (mat as THREE.Material).dispose();
                }
            });
            modelRef.current = null;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const contents = e.target?.result;
            if (!contents) { setLoading(false); return; }

            // Helper to center and scale
            const processModel = (obj: THREE.Object3D) => {
                const box = new THREE.Box3().setFromObject(obj);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                // Center X/Z, Sit on Y=0
                obj.position.set(-center.x, -box.min.y, -center.z);
                
                // Shadows
                obj.traverse(c => {
                    if ((c as THREE.Mesh).isMesh) {
                        c.castShadow = true;
                        c.receiveShadow = true;
                        // Fix for dark models: ensure material interacts with light
                        const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
                        if(mat && mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
                    }
                });

                const group = new THREE.Group();
                group.add(obj);

                // Auto-scale to ~2 units
                const maxDim = Math.max(size.x, size.y, size.z);
                const scaleF = 2 / (maxDim || 1);
                group.scale.set(scaleF, scaleF, scaleF);

                sceneRef.current!.add(group);
                modelRef.current = group;
                
                setLoading(false);
                setModelLoaded(true);
                handleReset();
                toast({ title: "Success", description: "Model loaded successfully" });
            };

            const onError = () => { setLoading(false); setError("Failed to parse file"); };

            try {
                const buff = contents as ArrayBuffer;
                const name = file.name.toLowerCase();

                if (name.endsWith('.glb') || name.endsWith('.gltf')) {
                    new GLTFLoader().parse(buff, '', (gltf) => processModel(gltf.scene), onError);
                } else if (name.endsWith('.fbx')) {
                    const obj = new FBXLoader().parse(buff, '');
                    processModel(obj);
                } else if (name.endsWith('.obj')) {
                    const txt = new TextDecoder().decode(buff);
                    const obj = new OBJLoader().parse(txt);
                    processModel(obj);
                } else if (name.endsWith('.stl')) {
                    const geo = new STLLoader().parse(buff);
                    processModel(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x999999 })));
                } else if (name.endsWith('.ply')) {
                    const geo = new PLYLoader().parse(buff);
                    geo.computeVertexNormals();
                    processModel(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x999999 })));
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
        
        // Create composite
        const composite = document.createElement('canvas');
        composite.width = canvas.width;
        composite.height = canvas.height;
        const ctx = composite.getContext('2d');
        if (!ctx) return;

        // Draw video (Background)
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

        // Draw 3D (Foreground)
        ctx.drawImage(canvas, 0, 0);

        const link = document.createElement('a');
        link.download = `AR_Capture_${Date.now()}.png`;
        link.href = composite.toDataURL('image/png');
        link.click();
    };

    return (
        <div 
            ref={containerRef}
            className="relative h-full w-full bg-black overflow-hidden"
            style={{ touchAction: 'none' }} // Prevents browser scroll on drag
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Background Video */}
            <video 
                ref={videoRef} 
                className="absolute top-0 left-0 h-full w-full object-cover z-0 pointer-events-none" 
                playsInline muted autoPlay 
            />
            
            {/* Three.js Canvas */}
            <canvas 
                ref={canvasRef} 
                className="absolute top-0 left-0 h-full w-full z-10 pointer-events-none" 
            />

            {/* UI Overlays */}
            {loading && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2 bg-black/70 p-4 rounded-lg backdrop-blur">
                    <Loader className="animate-spin text-white" />
                    <span className="text-white text-sm">Loading...</span>
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

            {/* Hint Text */}
            {!modelLoaded && !loading && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 text-sm pointer-events-none z-0">
                    Import a model to start
                </div>
            )}

            {/* Control Panel - Z-Index 40 to stay above video but below AR Button overlay if needed */}
            <div className="relative z-40 pointer-events-auto">
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