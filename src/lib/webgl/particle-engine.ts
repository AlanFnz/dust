'use client';

// TODO: modularize this file

/* eslint-disable @typescript-eslint/no-explicit-any */
import { hexToRGB, getRandomValue } from './utils';
import { PARTICLE_CONFIG } from './particle-system/config';
import { GLState } from './gl-state';
import { ResourceManager } from './resource-manager';
import { ParticleSystem } from './particle-system';
import { CONFIG } from '../config';

// variables
let gl: WebGL2RenderingContext;
let glState: GLState;
let resourceManager: ResourceManager;
let particleSystem: ParticleSystem | null = null;
let currentImage: HTMLImageElement | null = null;
let animationFrameId: number | null = null;
let isAnimating = false;
let isPlaying = false;
let lastTime = 0;
let isRestarting = false;

export async function initWebGL(canvas: HTMLCanvasElement): Promise<void> {
  gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
  if (!gl) {
    alert('WebGL 2 not supported');
    throw new Error('WebGL 2 not supported');
  }

  glState = new GLState(gl);
  resourceManager = new ResourceManager(gl);

  const ext = gl.getExtension('EXT_color_buffer_float');
  if (!ext) {
    console.log(
      'EXT_color_buffer_float not supported, falling back to alternative format'
    );
  }

  try {
    await resourceManager.createProgram('particle', 'particle', 'particle');
    await resourceManager.createProgram('update', 'update', 'update', [
      'vPosition',
      'vVelocity',
      'vTarget',
    ]);
    await resourceManager.createProgram('edge', 'edge', 'edge');
  } catch (error) {
    console.error('Failed to initialize WebGL programs:', error);
    alert('Failed to initialize WebGL. Check the console for details.');
    return;
  }

  setupEventListeners();
  updateBackgroundColor();
}

// event listeners
function setupEventListeners(): void {
  const imageInput = document.getElementById('imageInput');
  if (imageInput) imageInput.addEventListener('change', handleImageUpload);

  const restartBtn = document.getElementById('restartBtn');
  if (restartBtn)
    restartBtn.addEventListener('click', () => safeRestartAnimation());

  const randomizeColorBtn = document.getElementById('randomizeColorBtn');
  if (randomizeColorBtn)
    randomizeColorBtn.addEventListener('click', () => chooseRandomPalette());

  const randomizeBtn = document.getElementById('randomizeBtn');
  if (randomizeBtn)
    randomizeBtn.addEventListener('click', () => randomizeInputs());

  const exportVideoBtn = document.getElementById('exportVideoBtn');
  if (exportVideoBtn)
    exportVideoBtn.addEventListener('click', () => toggleVideoRecord());

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 's') {
      saveImage();
    } else if (event.key === 'v') {
      toggleVideoRecord();
    } else if (event.code === 'Space') {
      event.preventDefault();
      togglePlayPause();
    } else if (event.key === 'Enter') {
      safeRestartAnimation();
    } else if (event.key === 'r') {
      randomizeInputs();
    } else if (event.key === 'c') {
      chooseRandomPalette();
    }
  });

  window.addEventListener('unload', cleanup);
}

export async function handleImageUpload(
  e: Event | React.MouseEvent
): Promise<void> {
  const target = e.target as HTMLInputElement;
  const file = target.files ? target.files[0] : null;
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('Please upload an image file');
    return;
  }
  try {
    const img = await loadImage(file);
    stopAnimation();
    glState.clear();
    currentImage = img;
    resizeCanvasToImage(img);
    await safeRestartAnimation();
  } catch (error) {
    console.error('Error processing image:', error);
    alert('Error processing image. Please try a different image.');
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      if (event.target && event.target.result) {
        img.src = event.target.result as string;
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// canvas resizing
function calculateDivisibleDimensions(
  width: number,
  height: number,
  maxSize: number
) {
  const scale = Math.min(maxSize / width, maxSize / height);
  let scaledWidth = Math.round(width * scale);
  let scaledHeight = Math.round(height * scale);

  scaledWidth = Math.floor(scaledWidth / 4) * 4;
  scaledHeight = Math.floor(scaledHeight / 4) * 4;

  const aspectRatio = width / height;
  if (scaledWidth / scaledHeight > aspectRatio) {
    scaledHeight = Math.floor(scaledHeight / 4) * 4;
    scaledWidth = Math.floor((scaledHeight * aspectRatio) / 4) * 4;
  } else {
    scaledWidth = Math.floor(scaledWidth / 4) * 4;
    scaledHeight = Math.floor(scaledWidth / aspectRatio / 4) * 4;
  }

  while (scaledWidth > maxSize || scaledHeight > maxSize) {
    if (scaledWidth > maxSize) {
      scaledWidth -= 4;
      scaledHeight = Math.floor(scaledWidth / aspectRatio / 4) * 4;
    }
    if (scaledHeight > maxSize) {
      scaledHeight -= 4;
      scaledWidth = Math.floor((scaledHeight * aspectRatio) / 4) * 4;
    }
  }

  return { width: scaledWidth, height: scaledHeight };
}

function resizeCanvasToImage(image: HTMLImageElement): {
  width: number;
  height: number;
} {
  console.log('Original image size: ' + image.width + ', ' + image.height);

  const maxSize = Math.min(window.innerWidth, window.innerHeight) - 40;
  const dimensions = calculateDivisibleDimensions(
    image.width,
    image.height,
    maxSize
  );

  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (canvas) {
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    glState.setViewport(0, 0, canvas.width, canvas.height);
  }

  console.log('New image size: ' + dimensions.width + ', ' + dimensions.height);
  return dimensions;
}

function cleanup(): void {
  stopAnimation();
  if (particleSystem) {
    try {
      particleSystem.dispose();
      particleSystem = null;
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
  if (resourceManager) {
    resourceManager.dispose();
  }
}

function stopAnimation(): void {
  isAnimating = false;
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

async function safeRestartAnimation(): Promise<void> {
  if (!currentImage || isRestarting) return;
  isRestarting = true;
  stopAnimation();
  if (particleSystem) {
    try {
      particleSystem.dispose();
    } catch (error) {
      console.error('Error disposing particle system:', error);
    }
    particleSystem = null;
  }
  glState.clear();
  setTimeout(() => {
    try {
      particleSystem = new ParticleSystem(
        gl,
        PARTICLE_CONFIG.particleCount.value,
        resourceManager,
        glState
      );
      particleSystem.processImage(currentImage as HTMLImageElement);
      isPlaying = true;
      isRestarting = false;
      startAnimation();
    } catch (error) {
      console.error('Error during restart:', error);
      isRestarting = false;
      alert('An error occurred. Please refresh the page.');
    }
  }, 25);
}

function startAnimation(): void {
  if (!isAnimating && !isRestarting && particleSystem) {
    isAnimating = true;
    lastTime = 0;
    animationFrameId = requestAnimationFrame(animate);
  }
}

function animate(currentTime: number): void {
  if (!particleSystem || isRestarting) {
    isAnimating = false;
    return;
  }
  const deltaTime = lastTime ? currentTime - lastTime : 0;
  lastTime = currentTime;
  try {
    glState.clear();
    particleSystem.update(deltaTime);
    particleSystem.render();
  } catch (error) {
    console.error('Animation error:', error);
    stopAnimation();
    safeRestartAnimation();
  }
  if (isAnimating && isPlaying) {
    animationFrameId = requestAnimationFrame(animate);
  }
}

export function togglePlayPause(): void {
  if (isRestarting) return;
  isPlaying = !isPlaying;
  if (isPlaying) {
    startAnimation();
  } else {
    stopAnimation();
  }
}

function toggleVideoRecord(): void {
  alert('Video recording not implemented yet.');
}

function saveImage(): void {
  alert('Image saving not implemented yet.');
}

export function randomizeInputs(): void {
  if (isRestarting) return;

  const paletteKeys = Object.keys(CONFIG.palette);
  const randomPaletteKey =
    paletteKeys[Math.floor(Math.random() * paletteKeys.length)];
  const [newBgColor, newParticleColor] = CONFIG.palette[randomPaletteKey];

  CONFIG.selectedPalette = randomPaletteKey;
  CONFIG.backgroundColor = newBgColor;
  PARTICLE_CONFIG.particleColor = newParticleColor;

  PARTICLE_CONFIG.noiseType = Math.random() < 0.5 ? '2D' : '3D';

  Object.entries(PARTICLE_CONFIG).forEach(([key, value]) => {
    if (
      typeof value === 'object' &&
      value !== null &&
      'min' in value &&
      'max' in value &&
      'step' in value &&
      key !== 'selectedPalette' &&
      key !== 'attractionStrength'
    ) {
      const newValue = getRandomValue(value.min, value.max, value.step);
      (PARTICLE_CONFIG as any)[key].value = newValue;
    }
  });

  const speedRatio =
    (PARTICLE_CONFIG as any)['particleSpeed'].value /
    (PARTICLE_CONFIG as any)['particleSpeed'].max;
  const ratioAdjustment = Math.random() * 0.7 - 0.3;
  const attractionStrengthValue =
    (PARTICLE_CONFIG as any)['attractionStrength'].max *
    Math.min(speedRatio + ratioAdjustment, 1);
  (PARTICLE_CONFIG as any)['attractionStrength'].value =
    attractionStrengthValue;

  updateBackgroundColor();
  if (currentImage) {
    safeRestartAnimation();
  }
}

export async function initWebGLApp(canvas: HTMLCanvasElement): Promise<void> {
  await initWebGL(canvas);
  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === ' ') {
      event.preventDefault();
      togglePlayPause();
    }
  });
}

function chooseRandomPalette(): void {
  const paletteKeys = Object.keys(CONFIG.palette);
  const randomPaletteKey =
    paletteKeys[Math.floor(Math.random() * paletteKeys.length)];
  const [randomBg, randomParticle] = CONFIG.palette[randomPaletteKey];
  CONFIG.selectedPalette = randomPaletteKey;
  CONFIG.backgroundColor = randomBg;
  PARTICLE_CONFIG.particleColor = randomParticle;

  updateBackgroundColor();
}

export function updateBackgroundColor(): void {
  const bgColor = CONFIG.backgroundColor;
  (
    document.getElementById('canvas') as HTMLCanvasElement
  ).style.backgroundColor = bgColor;
  const [r, g, b] = hexToRGB(bgColor);
  glState.setClearColor(r, g, b, 1.0);
  glState.clear();
}
