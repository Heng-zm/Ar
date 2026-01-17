"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import ControlPanel from './control-panel';
import { Loader, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';

// Type extension for iOS Compass
interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
    webkitCompassHeading?: number;
    requestPermission?: () => Promise<'granted' | 'denied'>;
}

export default function ARView() {
    // Refs
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
    const isInit = useRef(false);

    // State
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
    const [modelLoaded, setModelLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [compassActive, setCompassActive] = useState(false);
    
    const { toast } = useToast();

    // 1. Resize Logic
    const onResize = useCallback(() => {
        if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height, false);
    }, []);

    // 2. Camera Logic (Background)
    useEffect(() => {
        const startCamera = async () => {
            if (!videoRef.current) return;
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                }).catch(() => navigator.mediaDevices.getUserMedia({ video: true }));
                
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => videoRef.current?.play().catch(() => {});
            } catch (err) { console.error("Camera init error", err); }
        };
        startCamera();
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    // 3. Three.js & WebXR Logic
    useEffect(() => {
        if (!canvasRef.current || !containerRef.current || isInit.current) return;
        isInit.current = true;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 50);
        camera.position.z = 3; 
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ 
            canvas: canvasRef.current, alpha: true, antialias: true, preserveDrawingBuffer: true 
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.xr.enabled = true;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        rendererRef.current = renderer;

        // Lighting
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(3, 10, 5);
        dirLight.castShadow = true;
        scene.add(dirLight);

        // Shadow Catcher
        const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.ShadowMaterial({ opacity: 0.4 }));
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = -0.01;
        shadowPlane.receiveShadow = true;
        scene.add(shadowPlane);

        // AR Button
        const arButton = ARButton.createButton(renderer, { requiredFeatures: ['hit-test'], domOverlay: { root: document.body } });
        // Style to prevent overlap with control panel
        arButton.style.position = 'absolute'; arButton.style.bottom = '20px'; arButton.style.left = '50%';
        arButton.style.transform = 'translateX(-50%)'; arButton.style.zIndex = '50'; arButton.style.borderRadius = '20px';
        containerRef.current.appendChild(arButton);

        renderer.setAnimationLoop(() => renderer.render(scene, camera));
        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('resize', onResize);
            renderer.setAnimationLoop(null);
            if (arButton.parentNode) arButton.parentNode.removeChild(arButton);
            renderer.dispose();
            isInit.current = false;
        };
    }, [onResize]);

    // 4. Model Transform Sync
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

    // 5. Compass Logic
    useEffect(() => {
        const handleOrientation = (e: DeviceOrientationEvent) => {
            if (!compassActive) return;
            let heading = 0;
            const iOS = e as DeviceOrientationEventiOS;
            
            if (typeof iOS.webkitCompassHeading === 'number') {
                heading = iOS.webkitCompassHeading;
            } else if (e.alpha !== null) {
                heading = Math.abs(e.alpha - 360);
            }
            // Negate heading to align model with world
            setRotation(prev => ({ ...prev, y: -heading }));
        };

        if (compassActive) window.addEventListener('deviceorientation', handleOrientation);
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, [compassActive]);

    const handleToggleCompass = async () => {
        if (!compassActive) {
            const DeviceEvent = DeviceOrientationEvent as unknown as DeviceOrientationEventiOS;
            if (typeof DeviceEvent.requestPermission === 'function') {
                try {
                    const permission = await DeviceEvent.requestPermission();
                    if (permission === 'granted') {
                        setCompassActive(true);
                        toast({ title: "Compass Enabled", description: "Rotate phone to orient model." });
                    } else {
                        toast({ variant: "destructive", title: "Denied", description: "Compass access required." });
                    }
                } catch { setCompassActive(true); } // Fallback for non-iOS
            } else {
                setCompassActive(true);
                toast({ title: "Compass Enabled", description: "Rotate phone to orient model." });
            }
        } else {
            setCompassActive(false);
        }
    };

    // 6. Touch Gestures
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
        // 1 Finger: Rotate (Blocked if Compass is ON)
        if (e.touches.length === 1 && touchStartRef.current && !compassActive) {
            const deltaX = e.touches[0].clientX - touchStartRef.current.x;
            setRotation(prev => ({ ...prev, y: initialRotationRef.current + (deltaX * 0.5) }));
        } 
        // 2 Fingers: Scale
        else if (e.touches.length === 2 && pinchDistanceRef.current) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const scaleFactor = Math.sqrt(dx * dx + dy * dy) / pinchDistanceRef.current;
            setScale(Math.max(0.1, Math.min(5, initialScaleRef.current * scaleFactor)));
        }
    };

    // 7. File Loading
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !sceneRef.current) return;
        setLoading(true); setError(null);

        if (modelRef.current) { sceneRef.current.remove(modelRef.current); modelRef.current = null; }

        const reader = new FileReader();
        reader.onload = (e) => {
            if (!e.target?.result) { setLoading(false); return; }
            
            const processModel = (obj: THREE.Object3D) => {
                const box = new THREE.Box3().setFromObject(obj);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                obj.position.set(-center.x, -box.min.y, -center.z);
                obj.traverse(c => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; } });
                
                const group = new THREE.Group(); group.add(obj);
                const scaleF = 2 / (Math.max(size.x, size.y, size.z) || 1);
                group.scale.set(scaleF, scaleF, scaleF);
                
                sceneRef.current!.add(group); modelRef.current = group;
                setLoading(false); setModelLoaded(true);
                if(!compassActive) setRotation({ x: 0, y: 0, z: 0 });
                setScale(1);
            };

            const buff = e.target.result as ArrayBuffer;
            const name = file.name.toLowerCase();
            try {
                if (name.endsWith('.glb') || name.endsWith('.gltf')) new GLTFLoader().parse(buff, '', (g) => processModel(g.scene), () => setError("Load Error"));
                else if (name.endsWith('.fbx')) processModel(new FBXLoader().parse(buff, ''));
                else if (name.endsWith('.obj')) processModel(new OBJLoader().parse(new TextDecoder().decode(buff)));
                else if (name.endsWith('.stl')) processModel(new THREE.Mesh(new STLLoader().parse(buff), new THREE.MeshStandardMaterial({color:0xcccccc})));
                else if (name.endsWith('.ply')) { const g = new PLYLoader().parse(buff); g.computeVertexNormals(); processModel(new THREE.Mesh(g, new THREE.MeshStandardMaterial({color:0xcccccc}))); }
            } catch { setError("Format Error"); setLoading(false); }
        };
        reader.readAsArrayBuffer(file);
    };

    // 8. Screenshot
    const handleScreenshot = () => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        const canvas = canvasRef.current!;
        const composite = document.createElement('canvas');
        composite.width = canvas.width; composite.height = canvas.height;
        const ctx = composite.getContext('2d');
        if (!ctx) return;

        if (videoRef.current) {
            const v = videoRef.current;
            const vRatio = v.videoWidth / v.videoHeight;
            const cRatio = canvas.width / canvas.height;
            let dw, dh, dx, dy;
            if (vRatio > cRatio) { dh = canvas.height; dw = dh * vRatio; dx = (canvas.width - dw) / 2; dy = 0; }
            else { dw = canvas.width; dh = dw / vRatio; dy = (canvas.height - dh) / 2; dx = 0; }
            ctx.drawImage(v, dx, dy, dw, dh);
        }
        ctx.drawImage(canvas, 0, 0);
        const link = document.createElement('a');
        link.download = `AR_Capture_${Date.now()}.png`;
        link.href = composite.toDataURL('image/png');
        link.click();
    };

    const handleReset = () => { setScale(1); setRotation({ x: 0, y: 0, z: 0 }); setCompassActive(false); };

    return (
        <div 
            ref={containerRef}
            className="relative w-full h-[100dvh] bg-black overflow-hidden"
            style={{ touchAction: 'none' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => { touchStartRef.current = null; pinchDistanceRef.current = null; }}
        >
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" playsInline muted autoPlay />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />
            
            {loading && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center bg-black/60 p-6 rounded-xl backdrop-blur-md"><Loader className="animate-spin text-white mb-2" /><span className="text-white text-xs">Loading...</span></div>}
            
            {!modelLoaded && !loading && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 text-sm pointer-events-none">No Model Loaded</div>}

            <div className="absolute inset-0 z-40 pointer-events-none">
                <ControlPanel
                    onFileChange={handleFileChange}
                    onScreenshot={handleScreenshot}
                    onScaleChange={setScale}
                    onRotationChange={(axis, val) => setRotation(prev => ({...prev, [axis]: val}))}
                    onReset={handleReset}
                    onToggleCompass={handleToggleCompass}
                    compassActive={compassActive}
                    scale={scale}
                    rotation={rotation}
                    modelLoaded={modelLoaded}
                />
            </div>
        </div>
    );
}