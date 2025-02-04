'use client';

import React, { useEffect, useRef, useState } from 'react';

import {
  initWebGLApp,
  randomizeInputs,
  togglePlayPause,
  updateBackgroundColor,
} from '@/lib/webgl/particle-engine';
import { CONFIG } from '@/lib/config';

const ParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [bgColor, setBgColor] = useState(CONFIG.backgroundColor);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;
    initWebGLApp(canvasRef.current).catch((err) => {
      console.error('WebGL initialization failed:', err);
      alert(
        'WebGL initialization failed. Please check the console for details.'
      );
    });
  }, []);

  useEffect(() => {
    CONFIG.backgroundColor = bgColor;
    updateBackgroundColor();
  }, [bgColor]);

  const handleBgColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBgColor(e.target.value);
  };

  const handleTogglePlayPause = () => {
    setIsPlaying((prev) => !prev);

    togglePlayPause();
  };

  const handleRandomize = () => {
    randomizeInputs();
  };

  return (
    <div style={{ margin: '0 auto', height: '100vh', width: '100vw' }}>
      <canvas
        id='canvas'
        ref={canvasRef}
        style={{
          display: 'block',
          margin: '0 auto',
          height: '70vh',
          width: '100%',
        }}
      />
      <input type='file' id='imageInput' style={{ display: 'none' }} />

      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <label>
          Background Color:{' '}
          <input type='color' value={bgColor} onChange={handleBgColorChange} />
        </label>
        <button onClick={handleTogglePlayPause} style={{ marginLeft: '1rem' }}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button onClick={handleRandomize} style={{ marginLeft: '1rem' }}>
          Randomize
        </button>
      </div>
    </div>
  );
};

export default ParticleCanvas;
