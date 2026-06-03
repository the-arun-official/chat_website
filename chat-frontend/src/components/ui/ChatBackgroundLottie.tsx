import React, { useEffect, useRef } from 'react';
import type lottie from 'lottie-web';

interface ChatBackgroundLottieProps {
  isEnabled: boolean;
}

export const ChatBackgroundLottie: React.FC<ChatBackgroundLottieProps> = ({ isEnabled }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<ReturnType<typeof lottie.loadAnimation> | null>(null);

  useEffect(() => {
    if (!isEnabled || !containerRef.current) {
      if (animationRef.current) {
        animationRef.current.destroy();
        animationRef.current = null;
      }
      return;
    }

    const loadLottie = async () => {
      try {
        const lottieModule = await import('lottie-web');
        const animationData = await import('./doggie-animation.json');

        if (!containerRef.current) return;

        // Clear any existing animation
        if (animationRef.current) {
          animationRef.current.destroy();
        }

        // Load the animation
        animationRef.current = lottieModule.default.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: animationData.default,
        });

        // Scale and center the animation
        if (containerRef.current.querySelector('svg')) {
          const svg = containerRef.current.querySelector('svg') as SVGElement;
          svg.style.transform = 'scale(0.6)';
          svg.style.transformOrigin = 'center center';
          svg.style.opacity = '0.75';
        }
      } catch (error) {
        console.error('Failed to load Lottie animation:', error);
      }
    };

    loadLottie();

    return () => {
      if (animationRef.current) {
        animationRef.current.destroy();
        animationRef.current = null;
      }
    };
  }, [isEnabled]);

  if (!isEnabled) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '400px',
        height: '400px',
        pointerEvents: 'none',
        zIndex: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    />
  );
};
