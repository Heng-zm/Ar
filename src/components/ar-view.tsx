"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

// --- Loaders ---
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';

// --- Components & UI ---
import ControlPanel from './control-panel';
import { Loader, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';

export default function ARView() {
    // --- Refs ---
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const modelRef = useRef<THREE.Group | null>(null);
    
    // Animation Loop Ref
    const requestRef = useRef<number | null>(null);
    // Strict Mode Guard
    const isInit = useRef(false);

    // --- State ---
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
    const [modelLoaded, setModelLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cameraReady, setCameraReady] = useState(false);
    
    const { toast } = useToast();

    // --- 1. Resize Handler ---
    const onResize = useCallback(() => {
        if (cameraRef.current && rendererRef.current && videoRef.current) {
            const displayWidth = videoRef.current.clientWidth;
            const displayHeight = videoRef.current.clientHeight;

            // Only resize if dimensions differ to save performance
            if (canvasRef.current?.width !== displayWidth || canvasRef.current?.height !== displayHeight) {
                rendererRef.current.setSize(displayWidth, displayHeight, false);
                cameraRef.current.aspect = displayWidth / displayHeight;
                cameraRef.current.updateProjectionMatrix();
            }
        }
    }, []);

    // --- 2. Initialize Camera ---
    useEffect(() => {
        const initCamera = async () => {
            try {
                let stream;
                // Try fetching the back camera (environment)
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { facingMode: 'environment' } 
                    });
                } catch (e) {
                    console.info("Environment camera failed, trying default user camera.", e);
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                }
                
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // wait for metadata to ensure video has dimensions
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play().catch(e => console.error("Autoplay prevented", e));
                        setCameraReady(true);
                    };
                }
            } catch (err) {
                console.error("Error accessing camera: ", err);
                setError("Could not access the camera. Please check browser permissions.");
            }
        };

        initCamera();

        // Clean up camera stream on unmount
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);
    
    // --- 3. Initialize Three.js Scene ---
    useEffect(() => {
        if (!cameraReady || !canvasRef.current || isInit.current) return;
        
        isInit.current = true; // Mark as initialized

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const width = videoRef.current?.clientWidth || window.innerWidth;
        const height = videoRef.current?.clientHeight || window.innerHeight;

        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 5;
        cameraRef.current = camera;
        
        const renderer = new THREE.WebGLRenderer({ 
            canvas: canvasRef.current, 
            alpha: true,           // Transparent background
            antialias: true, 
            preserveDrawingBuffer: true // Required for screenshots
        });
        
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        rendererRef.current = renderer;
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        
        // Directional light attached to camera (headlamp effect)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 0, 1);
        camera.add(directionalLight);
        scene.add(camera);
        
        // Animation Loop
        const animate = () => {
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
            requestRef.current = requestAnimationFrame(animate);
        };
        animate();
        onResize();

        window.addEventListener('resize', onResize);

        // CLEANUP: Dispose Three.js objects
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

    // --- 4. Handle User Transformations (Scale/Rotation) ---
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

    // --- 5. File Import Logic ---
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !sceneRef.current) return;

        setLoading(true);
        setError(null);
        
        // Clean up previous model
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

            // HELPER: Normalize size, center position, add to scene
            const processAndAddModel = (object: THREE.Object3D) => {
                const box = new THREE.Box3().setFromObject(object);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                
                // 1. Center the model on X/Z, make bottom touch Y=0
                object.position.x = -center.x;
                object.position.y = -box.min.y;
                object.position.z = -center.z;
                
                // 2. Wrap in a parent group for clean rotation
                const group = new THREE.Group();
                group.add(object);

                // 3. Scale to fit nicely in view (approx 3 units wide)
                const maxDim = Math.max(size.x, size.y, size.z);
                const scaleFactor = 3 / (maxDim || 1); 
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

            // HELPER: Create standard mesh for raw geometry formats (STL/PLY)
            const createMeshFromGeometry = (geometry: THREE.BufferGeometry) => {
                const material = new THREE.MeshStandardMaterial({ 
                    color: 0xcccccc, 
                    roughness: 0.5,
                    metalness: 0.5 
                });
                return new THREE.Mesh(geometry, material);
            };
            
            const onModelError = (err: unknown) => {
                console.error("Error loading model: ", err);
                setError("Failed to load 3D model. The file might be corrupted.");
                setLoading(false);
            };

            const fileName = file.name.toLowerCase();
            const fileBuffer = contents as ArrayBuffer;

            // --- LOADER SWITCH ---
            try {
                if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
                    const loader = new GLTFLoader();
                    loader.parse(fileBuffer, '', (gltf: GLTF) => processAndAddModel(gltf.scene), onModelError);
                
                } else if (fileName.endsWith('.fbx')) {
                    const loader = new FBXLoader();
                    // FBXLoader parses directly to Group
                    const model = loader.parse(fileBuffer, '');
                    processAndAddModel(model);
                
                } else if (fileName.endsWith('.obj')) {
                    // OBJ expects a string string, not ArrayBuffer
                    const text = new TextDecoder().decode(fileBuffer);
                    const loader = new OBJLoader();
                    const model = loader.parse(text);
                    processAndAddModel(model);

                } else if (fileName.endsWith('.stl')) {
                    const loader = new STLLoader();
                    const geometry = loader.parse(fileBuffer);
                    processAndAddModel(createMeshFromGeometry(geometry));

                } else if (fileName.endsWith('.ply')) {
                    const loader = new PLYLoader();
                    const geometry = loader.parse(fileBuffer);
                    geometry.computeVertexNormals(); // PLY often needs normals recalculating
                    processAndAddModel(createMeshFromGeometry(geometry));
                
                } else {
                    setError("Unsupported file format. Supported: .gltf, .glb, .fbx, .obj, .stl, .ply");
                    setLoading(false);
                }
            } catch (err) {
                onModelError(err);
            }
        };

        reader.onerror = () => {
             setError("Error reading file.");
             setLoading(false);
        }

        reader.readAsArrayBuffer(file);
    };

    // --- 6. Screenshot Logic ---
    const handleScreenshot = () => {
        if (!videoRef.current || !canvasRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;
        
        // Force one final render
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
        
        // Calculate "object-fit: cover" coordinates for the video frame
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
        
        // 1. Draw Video
        ctx.drawImage(video, xStart, yStart, renderWidth, renderHeight);
        // 2. Draw 3D Model
        ctx.drawImage(arCanvas, 0, 0);
        
        // 3. Download
        const link = document.createElement('a');
        link.download = `AR_Capture_${Date.now()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="relative h-full w-full bg-black overflow-hidden">
            {/* Camera Feed */}
            <video 
                ref={videoRef} 
                className="absolute top-0 left-0 h-full w-full object-cover z-0" 
                playsInline 
                muted 
                autoPlay 
            />
            {/* AR Canvas */}
            <canvas 
                ref={canvasRef} 
                className="absolute top-0 left-0 h-full w-full z-10 pointer-events-none" 
            />
            
            {/* Loading Indicator */}
            {loading && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex items-center flex-col gap-2 bg-black/60 p-6 rounded-xl backdrop-blur-md border border-white/10">
                    <Loader className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-white font-medium text-sm">Parsing 3D Model...</p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                 <div className="absolute top-4 left-4 right-4 z-50">
                    <Alert variant="destructive" className="border-red-500/50 bg-red-950/50 text-red-200 backdrop-blur-md">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </div>
            )}

            {/* UI Controls */}
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