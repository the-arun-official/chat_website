import React, { useEffect, useRef } from 'react';

interface ChatBackgroundAnimationProps {
  isEnabled: boolean;
}

export const ChatBackgroundAnimation: React.FC<ChatBackgroundAnimationProps> = ({ isEnabled }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEnabled || !containerRef.current) return;

    // Create animated vector shapes (circles, lines, squares)
    const container = containerRef.current;
    container.innerHTML = ''; // Clear previous

    const shapes = [
      { type: 'circle', x: '10%', y: '20%', size: 30, duration: 8 },
      { type: 'square', x: '85%', y: '30%', size: 25, duration: 10 },
      { type: 'circle', x: '20%', y: '70%', size: 20, duration: 7 },
      { type: 'triangle', x: '75%', y: '60%', size: 35, duration: 9 },
      { type: 'square', x: '15%', y: '50%', size: 18, duration: 6 },
      { type: 'circle', x: '80%', y: '80%', size: 28, duration: 11 },
    ];

    shapes.forEach((shape, idx) => {
      const element = document.createElement('div');
      element.style.cssText = `
        position: absolute;
        left: ${shape.x};
        top: ${shape.y};
        width: ${shape.size}px;
        height: ${shape.size}px;
        border: 2px solid rgba(123, 108, 255, 0.15);
        opacity: 0.08;
        pointer-events: none;
        animation: float-${idx} ${shape.duration}s ease-in-out infinite;
        ${shape.type === 'circle' ? 'border-radius: 50%;' : ''}
        ${shape.type === 'triangle' ? 'clip-path: polygon(50% 0%, 0% 100%, 100% 100%);' : ''}
      `;

      // Add animation keyframes
      if (!document.getElementById(`float-${idx}-style`)) {
        const style = document.createElement('style');
        style.id = `float-${idx}-style`;
        style.innerHTML = `
          @keyframes float-${idx} {
            0%, 100% {
              transform: translateY(0px) rotate(0deg);
            }
            25% {
              transform: translateY(-15px) rotate(3deg);
            }
            50% {
              transform: translateY(-30px) rotate(6deg);
            }
            75% {
              transform: translateY(-15px) rotate(3deg);
            }
          }
        `;
        document.head.appendChild(style);
      }

      container.appendChild(element);
    });

    // Draw subtle gradient/mesh lines
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('style', `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      opacity: 0.05;
    `);
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');

    // Add subtle grid lines
    for (let i = 0; i < 100; i += 20) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(i));
      line.setAttribute('y1', '0');
      line.setAttribute('x2', String(i));
      line.setAttribute('y2', '100');
      line.setAttribute('stroke', 'rgba(123, 108, 255, 0.3)');
      line.setAttribute('stroke-width', '0.1');
      svg.appendChild(line);
    }

    container.appendChild(svg);

    return () => {
      // Cleanup animations
      const styleElements = document.querySelectorAll('[id^="float-"]');
      styleElements.forEach(el => el.remove());
    };
  }, [isEnabled]);

  if (!isEnabled) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    />
  );
};
