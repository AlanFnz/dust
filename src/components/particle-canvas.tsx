'use client';

import React, { useEffect, useRef } from 'react';
import { initWebGL } from '@/lib/webgl/particle-engine';

const ParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    initWebGL(canvasRef.current).catch((err) => {
      console.error('WebGL initialization failed:', err);
      alert(
        'WebGL initialization failed. Please check the console foƒr details.'
      );
    });
  }, []);

  return (
    <div
      style={{
        margin: '0 auto',
        height: '100vh',
      }}
    >
      <canvas
        id='canvas'
        ref={canvasRef}
        style={{
          margin: '0 auto',
          height: '100%',
          width: '100%',
        }}
      />

      <input type='file' id='imageInput' style={{ display: 'none' }} />

      <div id='gui'></div>
    </div>
  );
};

export default ParticleCanvas;
