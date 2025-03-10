'use client';

import React, { useEffect, useRef, useState } from 'react';

import { CONFIG } from '@/lib/config';
import {
  initWebGLApp,
  randomizeInputs,
  togglePlayPause,
  updateBackgroundColor,
} from '@/lib/webgl/particle-engine';

const ParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bgColor, setBgColor] = useState(CONFIG.backgroundColor);
  const [isPlaying, setIsPlaying] = useState(true);

  const handleUploadClick = () => fileInputRef.current?.click();

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
    <div
      style={{ margin: '5rem auto 0 auto', height: '100vh', width: '100vw' }}
    >
      <canvas
        id='canvas'
        ref={canvasRef}
        style={{
          display: 'block',
          margin: '0 auto',
          height: '70vh',
          width: 'auto',
        }}
      />
      <input
        type='file'
        id='imageInput'
        ref={fileInputRef}
        style={{ display: 'none' }}
      />

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
        <button onClick={handleUploadClick} style={{ marginLeft: '1rem' }}>
          Upload image
        </button>
      </div>
    </div>
  );
};

export default ParticleCanvas;
