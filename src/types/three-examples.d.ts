// src/types/three-examples.d.ts

// 1. GLTFLoader
declare module 'three/examples/jsm/loaders/GLTFLoader' {
    import { Loader, LoadingManager, Group, AnimationClip, Camera, Scene } from 'three';
  
    export interface GLTF {
      scene: Group;
      scenes: Group[];
      cameras: Camera[];
      animations: AnimationClip[];
      asset: {
        copyright?: string;
        generator?: string;
        version?: string;
        minVersion?: string;
        extensions?: any;
        extras?: any;
      };
      parser: any;
      userData: any;
    }
  
    export class GLTFLoader extends Loader {
      constructor(manager?: LoadingManager);
      load(
        url: string,
        onLoad: (gltf: GLTF) => void,
        onProgress?: (event: ProgressEvent) => void,
        onError?: (event: ErrorEvent) => void
      ): void;
      parse(
        data: ArrayBuffer | string,
        path: string,
        onLoad: (gltf: GLTF) => void,
        onError?: (event: ErrorEvent) => void
      ): void;
    }
  }
  
  // 2. FBXLoader
  declare module 'three/examples/jsm/loaders/FBXLoader' {
    import { Loader, LoadingManager, Group } from 'three';
  
    export class FBXLoader extends Loader {
      constructor(manager?: LoadingManager);
      load(
        url: string,
        onLoad: (object: Group) => void,
        onProgress?: (event: ProgressEvent) => void,
        onError?: (event: ErrorEvent) => void
      ): void;
      parse(data: ArrayBuffer | string, path: string): Group;
    }
  }
  
  // 3. OBJLoader
  declare module 'three/examples/jsm/loaders/OBJLoader' {
    import { Loader, LoadingManager, Group } from 'three';
  
    export class OBJLoader extends Loader {
      constructor(manager?: LoadingManager);
      load(
        url: string,
        onLoad: (group: Group) => void,
        onProgress?: (event: ProgressEvent) => void,
        onError?: (event: ErrorEvent) => void
      ): void;
      parse(data: string): Group;
    }
  }
  
  // 4. STLLoader
  declare module 'three/examples/jsm/loaders/STLLoader' {
    import { Loader, LoadingManager, BufferGeometry } from 'three';
  
    export class STLLoader extends Loader {
      constructor(manager?: LoadingManager);
      load(
        url: string,
        onLoad: (geometry: BufferGeometry) => void,
        onProgress?: (event: ProgressEvent) => void,
        onError?: (event: ErrorEvent) => void
      ): void;
      parse(data: ArrayBuffer): BufferGeometry;
    }
  }
  
  // 5. PLYLoader
  declare module 'three/examples/jsm/loaders/PLYLoader' {
    import { Loader, LoadingManager, BufferGeometry } from 'three';
  
    export class PLYLoader extends Loader {
      constructor(manager?: LoadingManager);
      load(
        url: string,
        onLoad: (geometry: BufferGeometry) => void,
        onProgress?: (event: ProgressEvent) => void,
        onError?: (event: ErrorEvent) => void
      ): void;
      parse(data: ArrayBuffer | string): BufferGeometry;
    }
  }
  
  // 6. ARButton
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