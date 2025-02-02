'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { getRandomValue, hexToRGB } from './utils';
import { PARTICLE_CONFIG } from './particle-system/config';
import { GLState } from './gl-state';
import { ResourceManager } from './resource-manager';
import { ParticleSystem } from './particle-system';

export interface Config {
  backgroundColor: string;
  palette: Record<string, [string, string]>;
  selectedPalette?: string;

  saveImage?: () => void;
  uploadImage?: () => void;
  saveVideo?: () => void;
}

export const CONFIG: Config = {
  backgroundColor: '#0f0d2e',
  palette: {
    noir: ['#000000', '#FFFFFF'],
    crimson: ['#300907', '#f49092'],
    sea: ['#2f5575', '#94f0dc'],
    cherry: ['#f1faee', '#e63946'],
    maroon: ['#360b1a', '#f6e3c7'],
    lakers: ['#2f0f5b', '#ffe35a'],
    copper: ['#2b1404', '#fec9b9'],
    foam: ['#780C28', '#EAFAEA'],
    retro: ['#feda62', '#8f1414'],
    galaxy: ['#0f0d2e', '#dda290'],
    ink: ['#441752', '#EFB6C8'],
    blackberry: ['#21062b', '#e78686'],
    emerald: ['#00261f', '#95e5bd'],
    slate: ['#ddc1a1', '#1c1c1c'],
    sakura: ['#FFB3A7', '#C93756'],
    indigo: ['#22117c', '#EAFAEA'],
  },
};

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
let gui: dat.GUI;

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

  initGUI();
  setupEventListeners();
  updateBackgroundColor();

  setTimeout(() => {}, 1000);
}

async function initGUI(): Promise<void> {
  if (typeof window === 'undefined') return;
  const { GUI } = await import('dat.gui');

  gui = new GUI({ autoPlace: false });
  gui.close();

  (window as any).guiControllers = {};

  chooseRandomPalette();

  (window as any).guiControllers.selectedPalette = gui
    .add(CONFIG, 'selectedPalette', Object.keys(CONFIG.palette))
    .name('Color Palette')
    .onChange((value: string) => {
      const [bg, particle] = CONFIG.palette[value];
      CONFIG.backgroundColor = bg;
      PARTICLE_CONFIG.particleColor = particle;
      updateConfig('backgroundColor', bg);
      updateConfig('particleColor', particle);

      (window as any).guiControllers.backgroundColor.updateDisplay();
      (window as any).guiControllers.particleColor.updateDisplay();
    });

  (window as any).guiControllers.backgroundColor = gui
    .addColor(CONFIG, 'backgroundColor')
    .name('Background')
    .onChange((v: string) => updateConfig('backgroundColor', v));
  (window as any).guiControllers.particleColor = gui
    .addColor(PARTICLE_CONFIG, 'particleColor')
    .name('Particles')
    .onChange((v: string) => updateConfig('particleColor', v));

  Object.entries(PARTICLE_CONFIG).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null && 'value' in value) {
      (window as any).guiControllers[key] = gui
        .add(value, 'value', value.min, value.max, value.step)
        .name(key.replace(/_/g, ' '))
        .onChange((v: number) => updateConfig(key, v));
    }
  });

  (window as any).guiControllers.noiseType = gui
    .add(PARTICLE_CONFIG, 'noiseType', ['2D', '3D'])
    .name('Noise Type')
    .onChange((value: string) => {
      updateConfig('noiseType', value);
    });

  gui.add({ togglePlayPause }, 'togglePlayPause').name('Pause/Play (space)');

  gui
    .add({ randomize: randomizeInputs }, 'randomize')
    .name('Randomize Inputs (r)');

  (CONFIG as any)['uploadImage'] = function () {
    const imageInput = document.getElementById('imageInput');
    if (imageInput) imageInput.click();
  };
  gui.add(CONFIG, 'uploadImage').name('Upload Image (u)');
  (CONFIG as any)['saveImage'] = function () {
    saveImage();
  };
  gui.add(CONFIG, 'saveImage').name('Save Image (s)');
  (CONFIG as any)['saveVideo'] = function () {
    toggleVideoRecord();
  };
  gui.add(CONFIG, 'saveVideo').name('Video Export (v)');

  const customContainer = document.getElementById('gui');
  if (customContainer) {
    customContainer.appendChild(gui.domElement);
  }
}

function chooseRandomPalette(): void {
  const paletteKeys = Object.keys(CONFIG.palette);
  const randomPaletteKey =
    paletteKeys[Math.floor(Math.random() * paletteKeys.length)];
  const [randomBg, randomParticle] = CONFIG.palette[randomPaletteKey];
  CONFIG.selectedPalette = randomPaletteKey;
  CONFIG.backgroundColor = randomBg;
  PARTICLE_CONFIG.particleColor = randomParticle;

  if ((window as any).guiControllers.selectedPalette) {
    (window as any).guiControllers.selectedPalette.setValue(randomPaletteKey);
  }
  if ((window as any).guiControllers.backgroundColor) {
    (window as any).guiControllers.backgroundColor.setValue(randomBg);
  }
  if ((window as any).guiControllers.particleColor) {
    (window as any).guiControllers.particleColor.setValue(randomParticle);
  }
  updateBackgroundColor();
}

function setupEventListeners(): void {
  const imageInput = document.getElementById('imageInput');
  if (imageInput) {
    imageInput.addEventListener('change', handleImageUpload);
  }
  const restartBtn = document.getElementById('restartBtn');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => safeRestartAnimation());
  }
  const randomizeColorBtn = document.getElementById('randomizeColorBtn');
  if (randomizeColorBtn) {
    randomizeColorBtn.addEventListener('click', () => chooseRandomPalette());
  }
  const randomizeBtn = document.getElementById('randomizeBtn');
  if (randomizeBtn) {
    randomizeBtn.addEventListener('click', () => randomizeInputs());
  }
  const exportVideoBtn = document.getElementById('exportVideoBtn');
  if (exportVideoBtn) {
    exportVideoBtn.addEventListener('click', () => toggleVideoRecord());
  }

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
    } else if (event.key === 'u') {
      const imageInput = document.getElementById('imageInput');
      if (imageInput) imageInput.click();
    } else if (event.key === 'c') {
      chooseRandomPalette();
    }
  });
  window.addEventListener('unload', cleanup);
}

async function handleImageUpload(e: Event): Promise<void> {
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

function updateBackgroundColor(): void {
  const bgColor = CONFIG.backgroundColor;
  (
    document.getElementById('canvas') as HTMLCanvasElement
  ).style.backgroundColor = bgColor;
  const [r, g, b] = hexToRGB(bgColor);
  glState.setClearColor(r, g, b, 1.0);
  glState.clear();
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

function togglePlayPause(): void {
  if (isRestarting) return;
  isPlaying = !isPlaying;
  if (isPlaying) {
    startAnimation();
  } else {
    stopAnimation();
  }
}

function randomizeInputs(): void {
  if (isRestarting) return;

  const paletteKeys = Object.keys(CONFIG.palette);
  const randomPaletteKey =
    paletteKeys[Math.floor(Math.random() * paletteKeys.length)];
  const [newBgColor, newParticleColor] = CONFIG.palette[randomPaletteKey];

  CONFIG.selectedPalette = randomPaletteKey;
  CONFIG.backgroundColor = newBgColor;
  PARTICLE_CONFIG.particleColor = newParticleColor;

  PARTICLE_CONFIG.noiseType = Math.random() < 0.5 ? '2D' : '3D';
  if (
    (window as any).guiControllers &&
    (window as any).guiControllers.noiseType
  ) {
    (window as any).guiControllers.noiseType.setValue(
      PARTICLE_CONFIG.noiseType
    );
  }

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
      if (
        (window as any).guiControllers &&
        (window as any).guiControllers[key]
      ) {
        (window as any).guiControllers[key].setValue(newValue);
      }
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
  if (
    (window as any).guiControllers &&
    (window as any).guiControllers['attractionStrength']
  ) {
    (window as any).guiControllers['attractionStrength'].setValue(
      attractionStrengthValue
    );
  }

  if (
    (window as any).guiControllers &&
    (window as any).guiControllers.selectedPalette
  ) {
    CONFIG.selectedPalette = randomPaletteKey;
    (window as any).guiControllers.selectedPalette.updateDisplay();
  }
  if (
    (window as any).guiControllers &&
    (window as any).guiControllers.backgroundColor
  ) {
    (window as any).guiControllers.backgroundColor.setValue(newBgColor);
  }
  if (
    (window as any).guiControllers &&
    (window as any).guiControllers.particleColor
  ) {
    (window as any).guiControllers.particleColor.setValue(newParticleColor);
  }

  updateBackgroundColor();
  if (currentImage) {
    safeRestartAnimation();
  }
}

function updateConfig(key: string, value: any): void {
  if (isRestarting) return;

  const noRestartParams = [
    'particleOpacity',
    'particleSpeed',
    'attractionStrength',
    'particleSize',
    'particleColor',
    'backgroundColor',
    'IS_PLAYING',
  ];

  if (key.includes('Color')) {
    (CONFIG as any)[key] = value;
  } else if (
    typeof (CONFIG as any)[key] === 'object' &&
    (CONFIG as any)[key].hasOwnProperty('value')
  ) {
    (CONFIG as any)[key] = {
      ...(CONFIG as any)[key],
      value: typeof value === 'object' ? value.value : value,
    };
  } else {
    (CONFIG as any)[key] = value;
  }

  if (key === 'backgroundColor') {
    updateBackgroundColor();
    return;
  }

  if (!noRestartParams.includes(key) && currentImage) {
    safeRestartAnimation();
  }
}

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

function toggleVideoRecord(): void {
  alert('Video recording not implemented yet.');
}

function saveImage(): void {
  alert('Image saving not implemented yet.');
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
