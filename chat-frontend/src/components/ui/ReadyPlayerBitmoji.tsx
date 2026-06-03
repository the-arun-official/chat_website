import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { BASE_URL } from '../../services/api';

type AnimationState = 'idle' | 'typing' | 'happy' | 'thinking' | 'listening' | 'excited' | 'recording' | 'walking';

interface ReadyPlayerBitmojiProps {
  state?: AnimationState;
  modelUrl?: string;
}

/**
 * 3D Realistic Avatar using GLTF/GLB Models
 * Loads professional 3D character models and animates them
 * Animation mapping:
 * - idle/happy/listening/excited/recording: Random cycles through available Idle animations
 * - typing: Uses "Run" animation
 * - thinking: Uses "Walk" animation
 */
export const ReadyPlayerBitmoji: React.FC<ReadyPlayerBitmojiProps> = ({
  state = 'idle',
  modelUrl,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Map<string, THREE.AnimationAction>>(new Map());
  const stateRef = useRef(state);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const nextIdleTimeRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine model URL - use backend uploads if not provided
  const finalModelUrl = modelUrl || `${BASE_URL}/uploads/mini_simple.glb`;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Don't load if already loading or loaded
    if (rendererRef.current) {
      return;
    }

    let isUnmounted = false;
    let animateFrameId: number | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let mixer: THREE.AnimationMixer | null = null;

    const initScene = () => {
      // Scene setup
      scene = new THREE.Scene();
      scene.background = null;
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(75, 52 / 64, 0.1, 1000);
      camera.position.set(0, 0.05, 1.1);
      camera.lookAt(0, 0.0, 0);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(52, 64);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.left = '0';
      renderer.domElement.style.top = '0';
      renderer.domElement.style.pointerEvents = 'none';
      rendererRef.current = renderer;

      containerRef.current?.appendChild(renderer.domElement);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
      directionalLight.position.set(5, 8, 5);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      // Load model
      const loader = new GLTFLoader();

      loader.load(
        finalModelUrl,
        (gltf) => {
          if (isUnmounted) return;

          const model = gltf.scene;
          
          // Scale and position model to fit in small viewport
          model.scale.set(0.30, 0.30, 0.30);
          model.position.y = -0.75;
          
          scene!.add(model);

          // Setup animations
          if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            mixerRef.current = mixer;

            console.log('Available animations:', gltf.animations.map(a => a.name));

            // Clear previous actions
            actionsRef.current.clear();

            // Map animations by name
            gltf.animations.forEach((clip) => {
              const action = mixer!.clipAction(clip);
              action.clampWhenFinished = true;
              actionsRef.current.set(clip.name, action);
            });

            setIsLoading(false);

            // Animation loop
            const clock = new THREE.Clock();
            nextIdleTimeRef.current = Date.now() + 3000;

            const animate = () => {
              animateFrameId = requestAnimationFrame(animate);
              const delta = clock.getDelta();

              if (mixerRef.current) {
                mixerRef.current.update(delta);
              }

              // State-based animation switching
              const currentState = stateRef.current;
              const now = Date.now();
              let targetAction: THREE.AnimationAction | null = null;

              switch (currentState) {
                case 'typing':
                  targetAction = actionsRef.current.get('Run') || null;
                  break;

                case 'thinking':
                case 'walking':
                  targetAction = actionsRef.current.get('Walk') || null;
                  break;

                case 'idle':
                case 'happy':
                case 'listening':
                case 'excited':
                case 'recording':
                default:
                  if (now >= nextIdleTimeRef.current) {
                    const idleAnimations = Array.from(actionsRef.current.entries())
                      .filter(([name]) => name.includes('Idle') || name === 'Idle');

                    if (idleAnimations.length > 0) {
                      const randomIdle = idleAnimations[
                        Math.floor(Math.random() * idleAnimations.length)
                      ];
                      targetAction = randomIdle[1];
                      nextIdleTimeRef.current = now + (4000 + Math.random() * 2000);
                    }
                  } else if (currentActionRef.current) {
                    targetAction = currentActionRef.current;
                  }
                  break;
              }

              // Smooth animation transitions
              if (targetAction && targetAction !== currentActionRef.current) {
                if (currentActionRef.current) {
                  currentActionRef.current.fadeOut(0.3);
                }
                targetAction.reset();
                targetAction.fadeIn(0.3);
                targetAction.play();
                currentActionRef.current = targetAction;
              }

              renderer!.render(scene!, camera);
            };

            animate();
          } else {
            setError('No animations found in model');
            setIsLoading(false);
          }
        },
        undefined,
        (error: any) => {
          if (!isUnmounted) {
            console.error('Error loading model:', error);
            setError('Failed to load avatar model');
            setIsLoading(false);
          }
        }
      );
    };

    initScene();

    // Cleanup
    return () => {
      isUnmounted = true;
      
      if (animateFrameId !== null) {
        cancelAnimationFrame(animateFrameId);
      }

      // Dispose renderer
      if (renderer && containerRef.current) {
        try {
          const canvas = renderer.domElement;
          if (canvas.parentNode === containerRef.current) {
            containerRef.current.removeChild(canvas);
          }
        } catch (e) {
          // ignore
        }
        renderer.dispose();
      }

      // Clear scene
      if (scene) {
        scene.traverse((child) => {
          if ((child as any).geometry) (child as any).geometry.dispose();
          if ((child as any).material) {
            if (Array.isArray((child as any).material)) {
              (child as any).material.forEach((m: any) => m.dispose());
            } else {
              (child as any).material.dispose();
            }
          }
        });
        scene.clear();
      }

      actionsRef.current.clear();
      mixerRef.current = null;
      currentActionRef.current = null;
      rendererRef.current = null;
      sceneRef.current = null;
    };
  }, [finalModelUrl]);

  return (
    <div
      ref={containerRef}
      style={{
        width: 52,
        height: 64,
        position: 'relative',
        borderRadius: '4px',
        overflow: 'hidden',
        backgroundColor: 'transparent',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      title={`Avatar - ${state}`}
    >
      {isLoading && (
        <div style={{
          fontSize: '9px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          padding: '4px',
        }}>
          🔄
        </div>
      )}
      {error && (
        <div style={{
          fontSize: '9px',
          color: 'var(--danger)',
          textAlign: 'center',
          padding: '4px',
        }}>
          ⚠️
        </div>
      )}
    </div>
  );
};

export default ReadyPlayerBitmoji;
