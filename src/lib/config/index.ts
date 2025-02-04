export interface Config {
  backgroundColor: string;
  palette: Record<string, [string, string]>;
  selectedPalette?: string;

  // TODO: implement in ui
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
