export interface TextureConfigOptions {
  internalFormat: number;
  format: number;
  type: number;
  filterMode: number;
}

export interface TextureOptions {
  width?: number;
  height?: number;
  internalFormat?: number;
  format?: number;
  type?: number;
  minFilter?: number;
  magFilter?: number;
  wrap?: number;
  data?: TexImageSource | ArrayBufferView | null;
}
