declare module 'three/examples/jsm/loaders/GLTFLoader' {
  import { Loader, LoadingManager, Object3D, AnimationClip, BufferGeometry, Material, Texture } from 'three';

  export interface GLTF {
    scene: Object3D;
    scenes: Object3D[];
    animations: AnimationClip[];
    asset: {
      copyright?: string;
      generator?: string;
      version?: string;
      minVersion?: string;
      extensions?: any;
      extras?: any;
    };
    parser?: any;
    userData?: any;
  }

  export class GLTFLoader extends Loader<GLTF> {
    constructor(manager?: LoadingManager);
    load(
      url: string,
      onLoad: (gltf: GLTF) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void
    ): XMLHttpRequest;
    loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<GLTF>;
    parse(data: ArrayBuffer | string, path: string, onLoad: (gltf: GLTF) => void, onError: (error: Error) => void): void;
    parseAsync(data: ArrayBuffer | string, path: string): Promise<GLTF>;
  }
}
