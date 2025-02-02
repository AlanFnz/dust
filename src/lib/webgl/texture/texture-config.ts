import { TextureConfigOptions } from './interface';

export function getTextureConfig(
  gl: WebGL2RenderingContext
): TextureConfigOptions {
  const config: TextureConfigOptions = {
    internalFormat: gl.RGBA32F,
    format: gl.RGBA,
    type: gl.FLOAT,
    filterMode: gl.LINEAR,
  };

  const hasFloatLinear = gl.getExtension('OES_texture_float_linear');
  const hasHalfFloat = gl.getExtension('OES_texture_half_float') as {
    HALF_FLOAT_OES: number;
  } | null;
  const hasHalfFloatLinear = gl.getExtension('OES_texture_half_float_linear');
  const hasColorBufferFloat = gl.getExtension('EXT_color_buffer_float');

  if (!hasFloatLinear || !hasColorBufferFloat) {
    if (hasHalfFloat && hasHalfFloatLinear) {
      config.internalFormat = gl.RGBA16F;
      config.type = hasHalfFloat.HALF_FLOAT_OES || gl.HALF_FLOAT;
    } else {
      config.internalFormat = gl.RGBA;
      config.type = gl.UNSIGNED_BYTE;
    }
  }

  if (!hasFloatLinear && !hasHalfFloatLinear) {
    config.filterMode = gl.NEAREST;
  }

  return config;
}
