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
    <div>
      <canvas
        id='canvas'
        ref={canvasRef}
        style={{ display: 'block', margin: '0 auto' }}
      />

      <input type='file' id='imageInput' style={{ display: 'none' }} />

      <div id='gui'></div>

      {/*       <button id='restartBtn'>Restart</button>
      <button id='randomizeBtn'>Randomize</button>
      <button id='randomizeColorBtn'>Randomize Color</button>
      <button id='exportVideoBtn'>Export Video</button> */}
    </div>
  );
};

export default ParticleCanvas;
