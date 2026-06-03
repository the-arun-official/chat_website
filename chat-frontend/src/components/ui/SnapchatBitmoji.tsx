import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type AvatarState = 'idle' | 'typing' | 'recording' | 'thinking' | 'happy' | 'listening' | 'loading';

interface SnapchatBitmojiProps {
  state?: AvatarState;
  userColor?: string;
}

/**
 * Snapchat-Style Bitmoji Avatar
 * Single 3D character in top-left corner of message input
 * Communicates ONLY through reactions and animations
 * No text labels - pure visual feedback
 * 
 * Uses Three.js with procedural geometry for lightweight rendering
 */
export const SnapchatBitmoji: React.FC<SnapchatBitmojiProps> = ({
  state = 'idle',
  userColor = '#FFD700'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const characterRef = useRef<THREE.Group | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.Fog(0xffffff, 100, 1000);
    sceneRef.current = scene;

    // Camera - small and close
    const camera = new THREE.PerspectiveCamera(
      45,
      1, // Square aspect ratio
      0.1,
      1000
    );
    camera.position.z = 3;

    // Renderer - tiny size
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
      precision: 'lowp'
    });
    renderer.setSize(120, 120);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = false;
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting - minimal
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(3, 3, 2);
    scene.add(directionalLight);

    // Create character
    const character = createBitmoji(userColor);
    scene.add(character);
    characterRef.current = character;

    // Animation loop
    let startTime = Date.now();
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      const elapsed = (Date.now() - startTime) * 0.001;

      if (characterRef.current) {
        updateBitmojiAnimation(characterRef.current, state, elapsed);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, [userColor]);

  return (
    <div
      ref={containerRef}
      style={{
        width: 120,
        height: 120,
        position: 'absolute',
        top: -15,
        left: 8,
        borderRadius: '8px',
        overflow: 'hidden',
        pointerEvents: 'none'
      }}
      title={`Avatar - ${state}`}
    />
  );
};

// Create lightweight procedural 3D character
const createBitmoji = (color: string): THREE.Group => {
  const group = new THREE.Group();

  // Head
  const headGeometry = new THREE.SphereGeometry(0.35, 24, 24);
  const headMaterial = new THREE.MeshPhongMaterial({ color });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 0.4;
  head.scale.set(1.1, 1.15, 1.05); // Slightly oval head
  head.castShadow = false;
  group.add(head);

  // Eyes - Large expressive eyes (Bitmoji style)
  const eyeGeometry = new THREE.SphereGeometry(0.1, 16, 16);
  const eyeMaterial = new THREE.MeshPhongMaterial({ color: '#FFFFFF' });

  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.12, 0.55, 0.3);
  leftEye.scale.set(0.9, 1.1, 0.8); // Oval eyes
  group.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.12, 0.55, 0.3);
  rightEye.scale.set(0.9, 1.1, 0.8);
  group.add(rightEye);

  // Pupils
  const pupilGeometry = new THREE.SphereGeometry(0.06, 12, 12);
  const pupilMaterial = new THREE.MeshPhongMaterial({ color: '#000000' });

  const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
  leftPupil.position.set(-0.12, 0.55, 0.38);
  leftPupil.name = 'leftPupil';
  group.add(leftPupil);

  const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
  rightPupil.position.set(0.12, 0.55, 0.38);
  rightPupil.name = 'rightPupil';
  group.add(rightPupil);

  // Mouth
  const mouthGeometry = new THREE.TorusGeometry(0.08, 0.03, 16, 32, 0, Math.PI);
  const mouthMaterial = new THREE.MeshPhongMaterial({ color: '#FF6B9D' });
  const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
  mouth.position.set(0, 0.25, 0.3);
  mouth.rotation.z = Math.PI;
  mouth.name = 'mouth';
  group.add(mouth);

  // Body - Simple torso
  const bodyGeometry = new THREE.BoxGeometry(0.3, 0.4, 0.2);
  const bodyMaterial = new THREE.MeshPhongMaterial({ color: '#4A90E2' });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = -0.1;
  group.add(body);

  // Arms (for animation)
  const armGeometry = new THREE.BoxGeometry(0.08, 0.3, 0.08);
  const armMaterial = new THREE.MeshPhongMaterial({ color });

  const leftArm = new THREE.Mesh(armGeometry, armMaterial);
  leftArm.position.set(-0.2, 0.05, 0);
  leftArm.name = 'leftArm';
  leftArm.castShadow = false;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeometry, armMaterial);
  rightArm.position.set(0.2, 0.05, 0);
  rightArm.name = 'rightArm';
  rightArm.castShadow = false;
  group.add(rightArm);

  // Blush (for happy/excited states)
  const blushGeometry = new THREE.SphereGeometry(0.08, 16, 16);
  const blushMaterial = new THREE.MeshPhongMaterial({
    color: '#FF6B9D',
    transparent: true,
    opacity: 0
  });

  const leftBlush = new THREE.Mesh(blushGeometry, blushMaterial);
  leftBlush.position.set(-0.22, 0.4, 0.3);
  leftBlush.scale.set(0.8, 0.6, 0.5);
  leftBlush.name = 'leftBlush';
  group.add(leftBlush);

  const rightBlush = new THREE.Mesh(blushGeometry, blushMaterial);
  rightBlush.position.set(0.22, 0.4, 0.3);
  rightBlush.scale.set(0.8, 0.6, 0.5);
  rightBlush.name = 'rightBlush';
  group.add(rightBlush);

  return group;
};

// Update animations based on state - ONLY through visual reactions
const updateBitmojiAnimation = (
  character: THREE.Group,
  state: AvatarState,
  time: number
) => {
  const leftArm = character.getObjectByName('leftArm') as THREE.Mesh;
  const rightArm = character.getObjectByName('rightArm') as THREE.Mesh;
  const mouth = character.getObjectByName('mouth') as THREE.Mesh;
  const leftPupil = character.getObjectByName('leftPupil') as THREE.Mesh;
  const rightPupil = character.getObjectByName('rightPupil') as THREE.Mesh;
  const leftBlush = character.getObjectByName('leftBlush') as THREE.Mesh;
  const rightBlush = character.getObjectByName('rightBlush') as THREE.Mesh;

  // Reset
  if (leftBlush && rightBlush) {
    leftBlush.material.opacity = 0;
    rightBlush.material.opacity = 0;
  }

  switch (state) {
    // ✍️ TYPING - Concentrated expression, looking down
    case 'typing': {
      // Look down
      if (leftPupil && rightPupil) {
        leftPupil.position.y = 0.50; // Look down
        rightPupil.position.y = 0.50;
      }
      // Focused mouth (straight line)
      if (mouth) {
        mouth.scale.y = 0.3;
      }
      // Arms in typing position
      if (leftArm) {
        leftArm.rotation.z = Math.sin(time * 6) * 0.4; // Rapid twitching
        leftArm.position.y = 0.05 + Math.sin(time * 8) * 0.02;
      }
      if (rightArm) {
        rightArm.rotation.z = Math.sin(time * 6 + Math.PI) * 0.4;
        rightArm.position.y = 0.05 + Math.sin(time * 8 + Math.PI) * 0.02;
      }
      break;
    }

    // 🎙️ RECORDING - Excited, eyes wide, open mouth
    case 'recording': {
      // Look forward - wide eyes
      if (leftPupil && rightPupil) {
        leftPupil.position.y = 0.55; // Look forward
        rightPupil.position.y = 0.55;
      }
      // Open mouth (O shape)
      if (mouth) {
        mouth.scale.set(1.2, 0.6, 1);
      }
      // Arms raised in excitement
      if (leftArm) {
        leftArm.position.y = 0.25 + Math.sin(time * 3) * 0.1;
        leftArm.rotation.z = -0.6;
      }
      if (rightArm) {
        rightArm.position.y = 0.25 + Math.sin(time * 3) * 0.1;
        rightArm.rotation.z = 0.6;
      }
      break;
    }

    // 💭 THINKING - Looking up, confused mouth, hand on chin
    case 'thinking': {
      // Look up and away
      if (leftPupil && rightPupil) {
        leftPupil.position.y = 0.60; // Look up
        rightPupil.position.y = 0.60;
      }
      // Confused mouth (tilted)
      if (mouth) {
        mouth.rotation.z = Math.PI + 0.3; // Tilted
        mouth.scale.set(0.8, 0.4, 1);
      }
      // Hand on chin pose
      if (rightArm) {
        rightArm.position.set(0.05, 0.25, 0);
        rightArm.rotation.z = Math.PI * 0.3;
      }
      break;
    }

    // 😊 HAPPY - Big smile, eyes closed/happy, blushing
    case 'happy': {
      // Eyes squinting (happy)
      if (leftPupil && rightPupil) {
        leftPupil.position.y = 0.58; // Slightly down (squinting)
        rightPupil.position.y = 0.58;
        leftPupil.scale.set(0.6, 0.4, 1); // Squinted
        rightPupil.scale.set(0.6, 0.4, 1);
      }
      // Big smile
      if (mouth) {
        mouth.scale.set(1.3, 0.8, 1);
      }
      // Blushing
      if (leftBlush && rightBlush) {
        leftBlush.material.opacity = Math.sin(time * 2) * 0.5 + 0.5; // Pulsing blush
        rightBlush.material.opacity = Math.sin(time * 2) * 0.5 + 0.5;
      }
      // Excited arm waves
      if (leftArm) {
        leftArm.rotation.z = Math.sin(time * 4) * 0.6;
      }
      if (rightArm) {
        rightArm.rotation.z = Math.sin(time * 4 + Math.PI) * 0.6;
      }
      break;
    }

    // 👂 LISTENING - Looking at you, attentive expression
    case 'listening': {
      // Look straight at you
      if (leftPupil && rightPupil) {
        leftPupil.position.y = 0.55;
        rightPupil.position.y = 0.55;
        // Eyes slightly wider (attentive)
        leftPupil.scale.set(1.1, 1.1, 1);
        rightPupil.scale.set(1.1, 1.1, 1);
      }
      // Slight smile (listening)
      if (mouth) {
        mouth.scale.set(1, 0.5, 1);
      }
      // Relaxed arms
      if (leftArm) {
        leftArm.position.y = 0.05 + Math.sin(time * 1.5) * 0.05; // Gentle sway
        leftArm.rotation.z = 0;
      }
      if (rightArm) {
        rightArm.position.y = 0.05 + Math.sin(time * 1.5) * 0.05;
        rightArm.rotation.z = 0;
      }
      break;
    }

    // ⏳ LOADING - Thinking expression, head tilt
    case 'loading': {
      // Look up slightly
      if (leftPupil && rightPupil) {
        leftPupil.position.y = 0.58;
        rightPupil.position.y = 0.58;
      }
      // Uncertain mouth
      if (mouth) {
        mouth.scale.set(0.8, 0.3, 1);
        mouth.rotation.z = Math.PI + 0.2;
      }
      // Head tilt
      character.rotation.z = Math.sin(time * 2) * 0.2;
      break;
    }

    // 😎 IDLE - Chill expression, subtle movements
    case 'idle':
    default: {
      // Normal eye position with subtle movement
      if (leftPupil && rightPupil) {
        leftPupil.position.y = 0.55 + Math.sin(time * 1) * 0.02;
        rightPupil.position.y = 0.55 + Math.sin(time * 1) * 0.02;
      }
      // Neutral smile
      if (mouth) {
        mouth.scale.set(1, 0.4, 1);
      }
      // Subtle arm movements
      if (leftArm) {
        leftArm.rotation.z = Math.sin(time * 1.5) * 0.1;
      }
      if (rightArm) {
        rightArm.rotation.z = Math.sin(time * 1.5 + Math.PI) * 0.1;
      }
      // Subtle head tilt
      character.rotation.z = Math.sin(time * 0.5) * 0.05;
      break;
    }
  }
};

export default SnapchatBitmoji;
