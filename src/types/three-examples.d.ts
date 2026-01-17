declare module 'three/examples/jsm/loaders/GLTFLoader' {
    import { Loader, LoadingManager, Group, AnimationClip, Camera } from 'three';
    
    export interface GLTF {
      scene: Group;
      scenes: Group[];
      cameras: Camera[];
      animations: AnimationClip[];
      asset: any;
      parser: any;
      userData: any;
    }
  
    export class GLTFLoader extends Loader {
      constructor(manager?: LoadingManager);
      parse(
        data: ArrayBuffer | string, 
        path: string, 
        onLoad: (gltf: GLTF) => void, 
        onError?: (event: ErrorEvent) => void
      ): void;
    }
  }
  
  declare module 'three/examples/jsm/loaders/FBXLoader' {
    import { Loader, LoadingManager, Group } from 'three';
    export class FBXLoader extends Loader {
      constructor(manager?: LoadingManager);
      parse(data: ArrayBuffer | string, path: string): Group;
    }
  }
  
  // --- NEW LOADERS ---
  
  declare module 'three/examples/jsm/loaders/OBJLoader' {
    import { Loader, LoadingManager, Group } from 'three';
    export class OBJLoader extends Loader {
      constructor(manager?: LoadingManager);
      parse(data: string): Group; // OBJLoader parses text, not ArrayBuffer
    }
  }
  
  declare module 'three/examples/jsm/loaders/STLLoader' {
    import { Loader, LoadingManager, BufferGeometry } from 'three';
    export class STLLoader extends Loader {
      constructor(manager?: LoadingManager);
      parse(data: ArrayBuffer): BufferGeometry;
    }
  }
  
  declare module 'three/examples/jsm/loaders/PLYLoader' {
    import { Loader, LoadingManager, BufferGeometry } from 'three';
    export class PLYLoader extends Loader {
      constructor(manager?: LoadingManager);
      parse(data: ArrayBuffer): BufferGeometry;
    }
  }
// src/types/three-examples.d.ts

// --- LOADERS (Keep these) ---

declare module 'three/examples/jsm/loaders/GLTFLoader' {
    import { Loader, LoadingManager, Group, AnimationClip, Camera } from 'three';
    
    export interface GLTF {
      scene: Group;
      scenes: Group[];
      cameras: Camera[];
      animations: AnimationClip[];
      asset: any;
      parser: any;
      userData: any;
    }
  
    export class GLTFLoader extends Loader {
      constructor(manager?: LoadingManager);
      parse(
        data: ArrayBuffer | string, 
        path: string, 
        onLoad: (gltf: GLTF) => void, 
        onError?: (event: ErrorEvent) => void
      ): void;
    }
  }
  
  declare module 'three/examples/jsm/loaders/FBXLoader' {
    import { Loader, LoadingManager, Group } from 'three';
    export class FBXLoader extends Loader {
      constructor(manager?: LoadingManager);
      parse(data: ArrayBuffer | string, path: string): Group;
    }
  }
  
  declare module 'three/examples/jsm/loaders/OBJLoader' {
    import { Loader, LoadingManager, Group } from 'three';
    export class OBJLoader extends Loader {
      constructor(manager?: LoadingManager);
      parse(data: string): Group;
    }
  }
  
  declare module 'three/examples/jsm/loaders/STLLoader' {
    import { Loader, LoadingManager, BufferGeometry } from 'three';
    export class STLLoader extends Loader {
      constructor(manager?: LoadingManager);
      parse(data: ArrayBuffer): BufferGeometry;
    }
  }
  
  declare module 'three/examples/jsm/loaders/PLYLoader' {
    import { Loader, LoadingManager, BufferGeometry } from 'three';
    export class PLYLoader extends Loader {
      constructor(manager?: LoadingManager);
      parse(data: ArrayBuffer): BufferGeometry;
    }
  }
  
  // --- NEW ADDITION: ARButton ---
  
  declare module 'three/examples/jsm/webxr/ARButton' {
    import { WebGLRenderer } from 'three';
    
    export interface ARButtonOptions {
      requiredFeatures?: string[];
      optionalFeatures?: string[];
      domOverlay?: { root: HTMLElement | null };
    }
  
    export class ARButton {
      static createButton(renderer: WebGLRenderer, sessionInit?: ARButtonOptions): HTMLElement;
    }
  }