export interface Config {
  particleSpeed: ConfigValue;
  attractionStrength: ConfigValue;
  particleOpacity: ConfigValue;
  particleSize: ConfigValue;
  particleCount: ConfigValue;
  edgeThreshold: ConfigValue;
  noiseType: '2D' | '3D';
  flowFieldScale: ConfigValue;
  selectedPalette: string;
  backgroundColor: string;
  particleColor: string;
  IS_PLAYING: boolean;
}

export interface ConfigValue {
  value: number;
  min: number;
  max: number;
  step: number;
}

export const PARTICLE_CONFIG: Config = {
  particleSpeed: { value: 12.0, min: 2.0, max: 80.0, step: 0.5 },
  attractionStrength: { value: 85.0, min: 1.0, max: 200.0, step: 1.0 },
  particleOpacity: { value: 0.2, min: 0.05, max: 1.0, step: 0.05 },
  particleSize: { value: 0.8, min: 0.3, max: 1.5, step: 0.1 },
  particleCount: { value: 300000, min: 200000, max: 600000, step: 1000 },
  edgeThreshold: { value: 0.4, min: 0.1, max: 1.5, step: 0.05 },
  noiseType: '2D',
  flowFieldScale: { value: 4.0, min: 1.0, max: 10.0, step: 1.0 },
  selectedPalette: 'galaxy',
  backgroundColor: '#0f0d2e',
  particleColor: '#dda290',
  IS_PLAYING: true,
};
