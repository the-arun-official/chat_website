import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type BitmojiGender = 'boy' | 'girl';
type AnimationState = 'idle' | 'typing' | 'happy' | 'thinking' | 'listening' | 'excited' | 'recording';

interface PerfectBitmojiProps {
  state?: AnimationState;
  gender?: BitmojiGender;
  skinTone?: string;
  hairColor?: string;
  outfitColor?: string;
}

/**
 * Professional 3D Bitmoji Avatar
 * Beautiful boy/girl character models
 * Sits perfectly above input box without interference
 * Uses procedural generation for lightweight rendering
 */
export const PerfectBitmoji: React.FC<PerfectBitmojiProps> = ({
  state = 'idle',
  gender = 'girl',
  skinTone = '#F4C2A0',
  hairColor = '#8B4513',
  outfitColor = '#FF6B9D'
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
    sceneRef.current = scene;

    // Camera positioned to show full character
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(0, 0.2, 2.5);
    camera.lookAt(0, 0.3, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(160, 220);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting - professional setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(3, 4, 2);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    // Create character
    const character = createRealisticBitmoji(gender, skinTone, hairColor, outfitColor);
    scene.add(character);
    characterRef.current = character;

    // Animation loop
    let startTime = Date.now();
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      const elapsed = (Date.now() - startTime) * 0.001;

      if (characterRef.current) {
        updateBitmojiAnimation(characterRef.current, state, elapsed, gender);
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
  }, [gender, skinTone, hairColor, outfitColor]);

  return (
    <div
      ref={containerRef}
      style={{
        width: 160,
        height: 220,
        position: 'absolute',
        top: -220,
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        borderRadius: '12px',
        overflow: 'hidden'
      }}
      title={`Bitmoji - ${state}`}
    />
  );
};

// Create realistic 3D character
const createRealisticBitmoji = (
  gender: BitmojiGender,
  skinTone: string,
  hairColor: string,
  outfitColor: string
): THREE.Group => {
  const group = new THREE.Group();

  // BODY
  const bodyGeometry = new THREE.BoxGeometry(0.28, 0.45, 0.15);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: outfitColor,
    roughness: 0.7,
    metalness: 0.1
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = -0.05;
  body.castShadow = true;
  group.add(body);

  // ARMS
  const armGeometry = new THREE.BoxGeometry(0.08, 0.35, 0.1);
  const armMaterial = new THREE.MeshStandardMaterial({
    color: skinTone,
    roughness: 0.6,
    metalness: 0.05
  });

  const leftArm = new THREE.Mesh(armGeometry, armMaterial);
  leftArm.position.set(-0.19, 0.05, 0);
  leftArm.castShadow = true;
  leftArm.name = 'leftArm';
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeometry, armMaterial);
  rightArm.position.set(0.19, 0.05, 0);
  rightArm.castShadow = true;
  rightArm.name = 'rightArm';
  group.add(rightArm);

  // NECK
  const neckGeometry = new THREE.BoxGeometry(0.12, 0.1, 0.1);
  const neckMaterial = new THREE.MeshStandardMaterial({
    color: skinTone,
    roughness: 0.6,
    metalness: 0.05
  });
  const neck = new THREE.Mesh(neckGeometry, neckMaterial);
  neck.position.y = 0.27;
  neck.castShadow = true;
  group.add(neck);

  // HEAD
  let head: THREE.Mesh;
  if (gender === 'girl') {
    // Girl: rounder face
    const headGeometry = new THREE.SphereGeometry(0.22, 32, 32);
    head = new THREE.Mesh(
      headGeometry,
      new THREE.MeshStandardMaterial({
        color: skinTone,
        roughness: 0.5,
        metalness: 0
        // skin-like material
      })
    );
  } else {
    // Boy: slightly wider
    const headGeometry = new THREE.BoxGeometry(0.24, 0.27, 0.22);
    head = new THREE.Mesh(
      headGeometry,
      new THREE.MeshStandardMaterial({
        color: skinTone,
        roughness: 0.5,
        metalness: 0
      })
    );
    head.geometry.translate(0, 0, 0);
  }
  head.position.y = 0.47;
  head.castShadow = true;
  group.add(head);

  // HAIR - Gender-specific
  if (gender === 'girl') {
    // Girl: Long hair with volume
    const hairGeometry = new THREE.SphereGeometry(0.23, 32, 32);
    const hairMaterial = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.4,
      metalness: 0.05
    });
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.set(0, 0.52, -0.02);
    hair.scale.set(1, 1.2, 1); // Stretched for length
    hair.castShadow = true;
    group.add(hair);

    // Hair sides (girl)
    const sideHairGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const leftHair = new THREE.Mesh(sideHairGeometry, hairMaterial);
    leftHair.position.set(-0.16, 0.35, 0);
    leftHair.scale.set(0.8, 1.5, 0.7);
    leftHair.castShadow = true;
    group.add(leftHair);

    const rightHair = new THREE.Mesh(sideHairGeometry, hairMaterial);
    rightHair.position.set(0.16, 0.35, 0);
    rightHair.scale.set(0.8, 1.5, 0.7);
    rightHair.castShadow = true;
    group.add(rightHair);
  } else {
    // Boy: Spiky/messy hair
    const hairGeometry = new THREE.ConeGeometry(0.22, 0.15, 16);
    const hairMaterial = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.3,
      metalness: 0.1
    });
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.y = 0.62;
    hair.castShadow = true;
    group.add(hair);
  }

  // EYES - Large and expressive
  const eyeGeometry = new THREE.SphereGeometry(0.04, 16, 16);
  const whiteMaterial = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    roughness: 0.3,
    metalness: 0.1
  });

  const leftEyeWhite = new THREE.Mesh(eyeGeometry, whiteMaterial);
  leftEyeWhite.position.set(-0.08, 0.54, 0.18);
  leftEyeWhite.castShadow = true;
  group.add(leftEyeWhite);

  const rightEyeWhite = new THREE.Mesh(eyeGeometry, whiteMaterial);
  rightEyeWhite.position.set(0.08, 0.54, 0.18);
  rightEyeWhite.castShadow = true;
  group.add(rightEyeWhite);

  // PUPILS - Expressive
  const pupilGeometry = new THREE.SphereGeometry(0.022, 12, 12);
  const pupilMaterial = new THREE.MeshStandardMaterial({
    color: '#000000',
    roughness: 0.1,
    metalness: 0.3
  });

  const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
  leftPupil.position.set(-0.08, 0.54, 0.205);
  leftPupil.name = 'leftPupil';
  leftPupil.castShadow = true;
  group.add(leftPupil);

  const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
  rightPupil.position.set(0.08, 0.54, 0.205);
  rightPupil.name = 'rightPupil';
  rightPupil.castShadow = true;
  group.add(rightPupil);

  // MOUTH - Expressive
  const mouthGeometry = new THREE.TorusGeometry(0.06, 0.02, 8, 16, 0, Math.PI);
  const mouthMaterial = new THREE.MeshStandardMaterial({
    color: gender === 'girl' ? '#FF6B9D' : '#E74C3C',
    roughness: 0.4,
    metalness: 0.1
  });
  const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
  mouth.position.set(0, 0.35, 0.19);
  mouth.rotation.z = Math.PI;
  mouth.name = 'mouth';
  mouth.castShadow = true;
  group.add(mouth);

  // BLUSH - Makes it cute
  const blushGeometry = new THREE.SphereGeometry(0.035, 16, 16);
  const blushMaterial = new THREE.MeshStandardMaterial({
    color: gender === 'girl' ? '#FFB6D9' : '#F5A69F',
    roughness: 0.7,
    metalness: 0,
    transparent: true,
    opacity: 0.6
  });

  const leftBlush = new THREE.Mesh(blushGeometry, blushMaterial);
  leftBlush.position.set(-0.12, 0.45, 0.18);
  leftBlush.scale.set(0.8, 0.6, 0.4);
  leftBlush.name = 'leftBlush';
  group.add(leftBlush);

  const rightBlush = new THREE.Mesh(blushGeometry, blushMaterial);
  rightBlush.position.set(0.12, 0.45, 0.18);
  rightBlush.scale.set(0.8, 0.6, 0.4);
  rightBlush.name = 'rightBlush';
  group.add(rightBlush);

  // EYEBROWS - Expressive
  const browGeometry = new THREE.BoxGeometry(0.06, 0.012, 0.02);
  const browMaterial = new THREE.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.5
  });

  const leftBrow = new THREE.Mesh(browGeometry, browMaterial);
  leftBrow.position.set(-0.08, 0.62, 0.18);
  leftBrow.rotation.z = 0.2;
  leftBrow.name = 'leftBrow';
  group.add(leftBrow);

  const rightBrow = new THREE.Mesh(browGeometry, browMaterial);
  rightBrow.position.set(0.08, 0.62, 0.18);
  rightBrow.rotation.z = -0.2;
  rightBrow.name = 'rightBrow';
  group.add(rightBrow);

  // NOSE - Subtle
  const noseGeometry = new THREE.BoxGeometry(0.03, 0.05, 0.035);
  const noseMaterial = new THREE.MeshStandardMaterial({
    color: '#E8B4A0',
    roughness: 0.6
  });
  const nose = new THREE.Mesh(noseGeometry, noseMaterial);
  nose.position.set(0, 0.47, 0.195);
  nose.castShadow = true;
  group.add(nose);

  return group;
};

// Update animations
const updateBitmojiAnimation = (
  character: THREE.Group,
  state: AnimationState,
  time: number,
  gender: BitmojiGender
) => {
  const leftArm = character.getObjectByName('leftArm') as THREE.Mesh;
  const rightArm = character.getObjectByName('rightArm') as THREE.Mesh;
  const mouth = character.getObjectByName('mouth') as THREE.Mesh;
  const leftPupil = character.getObjectByName('leftPupil') as THREE.Mesh;
  const rightPupil = character.getObjectByName('rightPupil') as THREE.Mesh;
  const leftBlush = character.getObjectByName('leftBlush') as THREE.Mesh;
  const rightBlush = character.getObjectByName('rightBlush') as THREE.Mesh;
  const leftBrow = character.getObjectByName('leftBrow') as THREE.Mesh;
  const rightBrow = character.getObjectByName('rightBrow') as THREE.Mesh;

  // Reset blush
  if (leftBlush && rightBlush) {
    leftBlush.material.opacity = 0.3;
    rightBlush.material.opacity = 0.3;
  }

  switch (state) {
    case 'typing': {
      // Look down at keyboard
      if (leftPupil && rightPupil) {
        leftPupil.position.y = 0.52;
        rightPupil.position.y = 0.52;
      }
      // Focused mouth
      if (mouth) {
        mouth.scale.y = 0.4;
      }
      // Typing arms
      if (leftArm) {
        leftArm.rotation.z = Math.sin(time * 8) * 0.5;
        leftArm.position.y = 0.05 + Math.sin(time * 10) * 0.03;
      }
      if (rightArm) {
        rightArm.rotation.z = Math.sin(time * 8 + Math.PI) * 0.5;
        rightArm.position.y = 0.05 + Math.sin(time * 10 + Math.PI) * 0.03;
      }
      break;
    }

    case 'happy': {
      // Look forward with big smile
      if (leftPupil && rightPupil) {
        leftPupil.position.y = 0.54;
        rightPupil.position.y = 0.54;
      }
      // Big smile
      if (mouth) {
        mouth.scale.set(1.2, 0.8, 1);
      }
      // Blushing
      if (leftBlush && rightBlush) {
        leftBlush.material.opacity = Math.sin(time * 2) * 0.4 + 0.6;
        rightBlush.material.opacity = Math.sin(time * 2) * 0.4 + 0.6;
      }
      // Happy arm waves
      if (leftArm) {
        leftArm.rotation.z = Math.sin(time * 4) * 0.8;
        leftArm.position.y = 0.05 + Math.sin(time * 4) * 0.08;
      }
      if (rightArm) {
        rightArm.rotation.z = Math.sin(time * 4 + Math.PI) * 0.8;
        rightArm.position.y = 0.05 + Math.sin(time * 4 + Math.PI) * 0.08;
      }
      break;
    }

    case 'thinking': {
      // Look up
      if (leftPupil && rightPupil) {
        leftPupil.position.y = 0.56;
        rightPupil.position.y = 0.56;
      }
      // Tilted mouth
      if (mouth) {
        mouth.rotation.z = Math.PI + 0.3;
        mouth.scale.set(0.9, 0.5, 1);
      }
      // Thinking pose
      if (rightArm) {
        rightArm.position.set(0.05, 0.2, 0);
        rightArm.rotation.z = Math.PI * 0.3;
      }
      // Head tilt
      character.rotation.z = Math.sin(time * 1.5) * 0.15;
      break;
    }

    case 'listening': {
      // Eyes forward, attentive
      if (leftPupil && rightPupil) {
        leftPupil.position.y = 0.54;
        rightPupil.position.y = 0.54;
        leftPupil.scale.set(1.15, 1.15, 1);
        rightPupil.scale.set(1.15, 1.15, 1);
      }
      // Smile
      if (mouth) {
        mouth.scale.set(1, 0.6, 1);
      }
      // Relaxed posture
      if (leftArm) {
        leftArm.position.y = 0.05 + Math.sin(time * 1.5) * 0.04;
      }
      if (rightArm) {
        rightArm.position.y = 0.05 + Math.sin(time * 1.5) * 0.04;
      }
      // Gentle head movement
      character.rotation.z = Math.sin(time * 1) * 0.08;
      break;
    }

    case 'excited': {
      // Wide eyes
      if (leftPupil && rightPupil) {
        leftPupil.position.y = 0.54;
        rightPupil.position.y = 0.54;
        leftPupil.scale.set(1.3, 1.3, 1);
        rightPupil.scale.set(1.3, 1.3, 1);
      }
      // Open mouth
      if (mouth) {
        mouth.scale.set(1.3, 1, 1);
      }
      // Excited blushing
      if (leftBlush && rightBlush) {
        leftBlush.material.opacity = 0.8;
        rightBlush.material.opacity = 0.8;
      }
      // Jump animation
      if (leftArm) {
        leftArm.position.y = 0.05 + Math.sin(time * 5) * 0.15;
        leftArm.rotation.z = Math.sin(time * 5) * 1;
      }
      if (rightArm) {
        rightArm.position.y = 0.05 + Math.sin(time * 5) * 0.15;
        rightArm.rotation.z = Math.sin(time * 5 + Math.PI) * 1;
      }
      character.position.y = Math.sin(time * 5) * 0.1;
      break;
    }

    case 'recording': {
      // Confident forward look
      if (leftPupil && rightPupil) {
        leftPupil.position.y = 0.54;
        rightPupil.position.y = 0.54;
      }
      // Open mouth (speaking)
      if (mouth) {
        mouth.scale.set(1.1, 0.9, 1);
      }
      // Hand to mouth (microphone pose)
      if (rightArm) {
        rightArm.position.set(0.08, 0.25, 0.05);
        rightArm.rotation.z = Math.sin(time * 3) * 0.2;
      }
      break;
    }

    case 'idle':
    default: {
      // Normal eyes
      if (leftPupil && rightPupil) {
        leftPupil.position.y = 0.54 + Math.sin(time * 0.5) * 0.01;
        rightPupil.position.y = 0.54 + Math.sin(time * 0.5) * 0.01;
        leftPupil.scale.set(1, 1, 1);
        rightPupil.scale.set(1, 1, 1);
      }
      // Neutral smile
      if (mouth) {
        mouth.scale.set(1, 0.5, 1);
      }
      // Subtle arm movement
      if (leftArm) {
        leftArm.rotation.z = Math.sin(time * 1.5) * 0.15;
        leftArm.position.y = 0.05 + Math.sin(time * 2) * 0.03;
      }
      if (rightArm) {
        rightArm.rotation.z = Math.sin(time * 1.5 + Math.PI) * 0.15;
        rightArm.position.y = 0.05 + Math.sin(time * 2 + Math.PI) * 0.03;
      }
      // Gentle character sway
      character.rotation.z = Math.sin(time * 0.8) * 0.05;
      break;
    }
  }
};

export default PerfectBitmoji;
