import { TextureOptions } from './interface';
import { getTextureConfig } from './texture-config';

export function createAndSetupTexture(
  gl: WebGL2RenderingContext,
  options: TextureOptions = {}
): WebGLTexture | null {
  const textureConfig = getTextureConfig(gl);

  const {
    width,
    height,
    internalFormat = textureConfig.internalFormat,
    format = textureConfig.format,
    type = textureConfig.type,
    minFilter = textureConfig.filterMode,
    magFilter = textureConfig.filterMode,
    wrap = gl.CLAMP_TO_EDGE,
    data = null,
  } = options;

  const texture = gl.createTexture();
  if (!texture) {
    console.error('Unable to create texture.');
    return null;
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);

  if (width && height) {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      width,
      height,
      0,
      format,
      type,
      data as ArrayBufferView | null
    );
  } else if (data) {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      format,
      type,
      data as TexImageSource
    );
  }

  const error = gl.getError();
  if (error !== gl.NO_ERROR) {
    console.warn('WebGL error when creating texture:', error);

    if (internalFormat !== gl.RGBA || type !== gl.UNSIGNED_BYTE) {
      console.log('Falling back to basic texture format');
      return createAndSetupTexture(gl, {
        ...options,
        internalFormat: gl.RGBA,
        format: gl.RGBA,
        type: gl.UNSIGNED_BYTE,
        minFilter: gl.LINEAR,
        magFilter: gl.LINEAR,
      });
    }
  }

  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
}

export function createFramebufferWithTexture(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  options: Partial<TextureOptions> = {}
): { framebuffer: WebGLFramebuffer; texture: WebGLTexture } {
  const textureConfig = getTextureConfig(gl);

  const texture = createAndSetupTexture(gl, {
    width,
    height,
    internalFormat: textureConfig.internalFormat,
    format: textureConfig.format,
    type: textureConfig.type,
    ...options,
  });
  if (!texture) {
    throw new Error('Failed to create texture for framebuffer');
  }
  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) {
    throw new Error('Unable to create framebuffer');
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0
  );

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    if (
      options.internalFormat !== gl.RGBA ||
      options.type !== gl.UNSIGNED_BYTE
    ) {
      gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(texture);
      return createFramebufferWithTexture(gl, width, height, {
        ...options,
        internalFormat: gl.RGBA,
        format: gl.RGBA,
        type: gl.UNSIGNED_BYTE,
      });
    }
    throw new Error('Framebuffer is not complete: ' + status);
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return { framebuffer, texture };
}

export async function loadTexture(
  gl: WebGL2RenderingContext,
  url: string
): Promise<WebGLTexture> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const texture = createAndSetupTexture(gl, { data: image });
      if (texture) {
        resolve(texture);
      } else {
        reject(new Error('Failed to create texture'));
      }
    };
    image.onerror = reject;
    image.src = url;
  });
}

export async function loadTextures(
  gl: WebGL2RenderingContext,
  urls: string[]
): Promise<WebGLTexture[]> {
  const promises = urls.map((url) => loadTexture(gl, url));
  return Promise.all(promises);
}

export function getMaxTextureSize(gl: WebGL2RenderingContext): number {
  return gl.getParameter(gl.MAX_TEXTURE_SIZE);
}
