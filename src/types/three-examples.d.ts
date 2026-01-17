// src/types/three-examples.d.ts

declare module 'three/examples/jsm/loaders/GLTFLoader' {
    import { Loader, LoadingManager, Group, AnimationClip, Camera, Scene } from 'three';
    
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
      load(
        url: string, 
        onLoad: (gltf: GLTF) => void, 
        onProgress?: (event: ProgressEvent) => void, 
        onError?: (event: ErrorEvent) => void
      ): void;
    }
  }
  
  declare module 'three/examples/jsm/loaders/FBXLoader' {
    import { Loader, LoadingManager, Group } from 'three';
    
    export class FBXLoader extends Loader {
      constructor(manager?: LoadingManager);
      parse(data: ArrayBuffer | string, path: string): Group;
      load(
        url: string, 
        onLoad: (object: Group) => void, 
        onProgress?: (event: ProgressEvent) => void, 
        onError?: (event: ErrorEvent) => void
      ): void;
    }
  }