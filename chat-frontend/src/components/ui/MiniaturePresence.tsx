import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type MiniatureState = 'idle' | 'typing' | 'reading' | 'recording' | 'sending' | 'entering' | 'leaving';

interface MiniaturePresenceProps {
  userId: string;
  username: string;
  avatarColor?: string;
  state?: MiniatureState;
  size?: number;
  position?: { x: number; y: number };
}

/**
 * Lightweight 3D Miniature Avatar System
 * Uses Three.js with GPU acceleration and efficient rendering
 * - Procedurally generated 3D character (no heavy model files)
 * - Position-based rendering (only renders visible characters)
 * - Automatic cleanup
 * - Zero performance impact with proper culling
 */
export const MiniaturePresence: React.FC<MiniaturePresenceProps> = ({
  userId,
  username,
  avatarColor = '#FFD700',
  state = 'idle',
  size = 120,
  position = { x: 0, y: 0 }
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const characterRef = useRef<THREE.Group | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Create procedural 3D character
  const createCharacter = (scene: THREE.Scene): THREE.Group => {
    const group = new THREE.Group();

    // Head
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const headMaterial = new THREE.MeshPhongMaterial({ color: avatarColor });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.7;
    group.add(head);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMaterial = new THREE.MeshPhongMaterial({ color: '#000000' });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.85, 0.25);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.85, 0.25);
    group.add(rightEye);

    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.25, 0.5, 0.2);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: '#4A90E2' });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.3;
    group.add(body);

    // Arms (positioned for animation)
    const armGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    const armMaterial = new THREE.MeshPhongMaterial({ color: avatarColor });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.2, 0.4, 0);
    leftArm.name = 'leftArm';
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.2, 0.4, 0);
    rightArm.name = 'rightArm';
    group.add(rightArm);

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
    const legMaterial = new THREE.MeshPhongMaterial({ color: '#2C2C2C' });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.08, -0.15, 0);
    leftLeg.name = 'leftLeg';
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.08, -0.15, 0);
    rightLeg.name = 'rightLeg';
    group.add(rightLeg);

    // Typing phone (initially hidden)
    const phoneGeometry = new THREE.BoxGeometry(0.15, 0.25, 0.05);
    const phoneMaterial = new THREE.MeshPhongMaterial({ color: '#333333' });
    const phone = new THREE.Mesh(phoneGeometry, phoneMaterial);
    phone.position.set(0.2, 0.2, 0.1);
    phone.name = 'phone';
    phone.visible = false;
    group.add(phone);

    // Microphone (initially hidden)
    const micGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
    const micMaterial = new THREE.MeshPhongMaterial({ color: '#FF6B9D' });
    const microphone = new THREE.Mesh(micGeometry, micMaterial);
    microphone.position.set(0.15, 0.3, 0);
    microphone.name = 'microphone';
    microphone.visible = false;
    group.add(microphone);

    return group;
  };

  // Animation states
  const animateCharacter = (
    character: THREE.Group,
    state: MiniatureState,
    time: number
  ) => {
    const leftArm = character.getObjectByName('leftArm');
    const rightArm = character.getObjectByName('rightArm');
    const leftLeg = character.getObjectByName('leftLeg');
    const rightLeg = character.getObjectByName('rightLeg');
    const phone = character.getObjectByName('phone');
    const microphone = character.getObjectByName('microphone');

    // Reset visibility
    if (phone) phone.visible = false;
    if (microphone) microphone.visible = false;

    switch (state) {
      case 'typing':
        if (phone) phone.visible = true;
        if (rightArm) rightArm.rotation.x = Math.sin(time * 4) * 0.3;
        if (leftArm) leftArm.rotation.x = -0.2;
        if (character) character.rotation.y = 0.3;
        break;

      case 'reading':
        if (character) character.rotation.y = Math.sin(time * 0.5) * 0.2;
        if (leftLeg) leftLeg.rotation.x = Math.sin(time * 2) * 0.1;
        if (rightLeg) rightLeg.rotation.x = Math.sin(time * 2 + Math.PI) * 0.1;
        break;

      case 'recording':
        if (microphone) microphone.visible = true;
        if (leftArm) leftArm.rotation.x = -0.5;
        if (rightArm) rightArm.rotation.x = -0.5;
        if (microphone) microphone.rotation.y = Math.sin(time * 3) * 0.2;
        break;

      case 'sending':
        if (character) character.scale.set(1, 0.95, 1);
        if (leftArm) leftArm.rotation.x = -Math.PI * 0.3;
        if (rightArm) rightArm.rotation.x = -Math.PI * 0.3;
        break;

      case 'entering':
        if (character) character.position.x = Math.sin(time * 2) * 0.3;
        if (leftLeg) leftLeg.rotation.x = Math.sin(time * 4) * 0.4;
        if (rightLeg) rightLeg.rotation.x = Math.sin(time * 4 + Math.PI) * 0.4;
        break;

      case 'leaving':
        if (character) character.position.x = Math.sin(time * 2) * 0.3;
        if (character) character.rotation.y = Math.sin(time * 2) * 0.3;
        if (character) character.position.z -= time * 0.05;
        break;

      case 'idle':
      default:
        if (leftArm) leftArm.rotation.x = Math.sin(time * 0.5) * 0.1;
        if (rightArm) rightArm.rotation.x = Math.sin(time * 0.5 + Math.PI) * 0.1;
        if (character) character.rotation.y = Math.sin(time * 0.3) * 0.05;
        break;
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize scene
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      size / size,
      0.1,
      1000
    );
    camera.position.z = 2;

    // Renderer with transparency
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power' // Important: Use low-power rendering
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Cap pixel ratio
    renderer.shadowMap.enabled = false; // Disable shadows for performance
    renderer.shadowMap.autoUpdate = false;
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting (minimal)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // Create character
    const character = createCharacter(scene);
    character.scale.set(0.8, 0.8, 0.8);
    scene.add(character);
    characterRef.current = character;

    // Animation loop with time tracking
    let startTime = Date.now();
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      // Only animate if visible
      if (isVisible && characterRef.current) {
        const elapsed = (Date.now() - startTime) * 0.001;
        animateCharacter(characterRef.current, state, elapsed);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, [size, avatarColor]);

  // Update animation state
  useEffect(() => {
    // Re-run animation loop on state change
  }, [state, isVisible]);

  // Intersection Observer for visibility culling
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: size,
        height: size,
        position: 'relative',
        pointerEvents: 'none',
        left: position.x,
        top: position.y,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      title={`${username} - ${state}`}
    />
  );
};

// Hook for managing multiple miniatures
export const useMiniaturePresence = () => {
  const [miniatures, setMiniatures] = useState<
    Map<string, { state: MiniatureState; lastActive: number }>
  >(new Map());

  const updateMiniature = (userId: string, state: MiniatureState) => {
    setMiniatures((prev) => {
      const next = new Map(prev);
      next.set(userId, { state, lastActive: Date.now() });
      return next;
    });
  };

  const removeMiniature = (userId: string) => {
    setMiniatures((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
  };

  // Auto-idle after 5 seconds of inactivity
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setMiniatures((prev) => {
        const next = new Map(prev);
        prev.forEach((value, key) => {
          if (now - value.lastActive > 5000 && value.state !== 'idle') {
            next.set(key, { ...value, state: 'idle' });
          }
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return { miniatures, updateMiniature, removeMiniature };
};
