interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GLStateType {
  program: WebGLProgram | null;
  vao: WebGLVertexArrayObject | null;
  activeTexture: number | null;
  boundTextures: (WebGLTexture | null)[];
  blendEnabled: boolean | null;
  framebuffer: WebGLFramebuffer | null;
  viewport: Viewport;
  clearColor: [number, number, number, number];
  depthTest: boolean | null;
  cullFace: boolean | null;
  frontFace: number | null;
}

export class GLState {
  private gl: WebGL2RenderingContext;
  private currentState: GLStateType;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    this.currentState = {
      program: null,
      vao: null,
      activeTexture: null,
      boundTextures: new Array(
        gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)
      ).fill(null),
      blendEnabled: null,
      framebuffer: null,
      viewport: { x: 0, y: 0, width: 0, height: 0 },
      clearColor: [0, 0, 0, 0],
      depthTest: null,
      cullFace: null,
      frontFace: null,
    };

    this.gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  }

  public useProgram(program: WebGLProgram | null): boolean {
    if (this.currentState.program !== program) {
      this.gl.useProgram(program);
      this.currentState.program = program;
      return true;
    }
    return false;
  }

  public bindVAO(vao: WebGLVertexArrayObject | null): boolean {
    if (this.currentState.vao !== vao) {
      this.gl.bindVertexArray(vao);
      this.currentState.vao = vao;
      return true;
    }
    return false;
  }

  public activeTexture(unit: number): boolean {
    if (this.currentState.activeTexture !== unit) {
      this.gl.activeTexture(this.gl.TEXTURE0 + unit);
      this.currentState.activeTexture = unit;
      return true;
    }
    return false;
  }

  public bindTexture(texture: WebGLTexture | null, unit: number = 0): boolean {
    this.activeTexture(unit);
    if (this.currentState.boundTextures[unit] !== texture) {
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.currentState.boundTextures[unit] = texture;
      return true;
    }
    return false;
  }

  public setBlending(enable: boolean): boolean {
    if (this.currentState.blendEnabled !== enable) {
      if (enable) {
        this.gl.enable(this.gl.BLEND);
      } else {
        this.gl.disable(this.gl.BLEND);
      }
      this.currentState.blendEnabled = enable;
      return true;
    }
    return false;
  }

  public setBlendFunc(src: number, dst: number): void {
    this.gl.blendFunc(src, dst);
  }

  public bindFramebuffer(framebuffer: WebGLFramebuffer | null): boolean {
    if (this.currentState.framebuffer !== framebuffer) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
      this.currentState.framebuffer = framebuffer;
      return true;
    }
    return false;
  }

  public setViewport(
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    const viewport: Viewport = { x, y, width, height };
    if (
      JSON.stringify(this.currentState.viewport) !== JSON.stringify(viewport)
    ) {
      this.gl.viewport(x, y, width, height);
      this.currentState.viewport = viewport;
      return true;
    }
    return false;
  }

  public setClearColor(
    r: number,
    g: number,
    b: number,
    a: number = 1.0
  ): boolean {
    const color: [number, number, number, number] = [r, g, b, a];
    if (
      JSON.stringify(this.currentState.clearColor) !== JSON.stringify(color)
    ) {
      this.gl.clearColor(r, g, b, 1.0);
      this.currentState.clearColor = color;
      return true;
    }
    return false;
  }

  public setDepthTest(enable: boolean): boolean {
    if (this.currentState.depthTest !== enable) {
      if (enable) {
        this.gl.enable(this.gl.DEPTH_TEST);
      } else {
        this.gl.disable(this.gl.DEPTH_TEST);
      }
      this.currentState.depthTest = enable;
      return true;
    }
    return false;
  }

  public setCullFace(enable: boolean): boolean {
    if (this.currentState.cullFace !== enable) {
      if (enable) {
        this.gl.enable(this.gl.CULL_FACE);
      } else {
        this.gl.disable(this.gl.CULL_FACE);
      }
      this.currentState.cullFace = enable;
      return true;
    }
    return false;
  }

  public setFrontFace(mode: number): boolean {
    if (this.currentState.frontFace !== mode) {
      this.gl.frontFace(mode);
      this.currentState.frontFace = mode;
      return true;
    }
    return false;
  }

  public clear(mask: number = this.gl.COLOR_BUFFER_BIT): void {
    const currentColor = this.currentState.clearColor;
    this.gl.clearColor(currentColor[0], currentColor[1], currentColor[2], 1.0);

    this.gl.clear(mask);

    const viewport = this.currentState.viewport;
    this.gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
  }

  public reset(): void {
    this.currentState = {
      program: null,
      vao: null,
      activeTexture: null,
      boundTextures: new Array(
        this.gl.getParameter(this.gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)
      ).fill(null),
      blendEnabled: null,
      framebuffer: null,
      viewport: { x: 0, y: 0, width: 0, height: 0 },
      clearColor: [0, 0, 0, 0],
      depthTest: null,
      cullFace: null,
      frontFace: null,
    };
  }

  public saveState(): GLStateType {
    return { ...this.currentState };
  }

  public restoreState(savedState: GLStateType): void {
    if (savedState.program !== this.currentState.program) {
      this.useProgram(savedState.program);
    }
    if (savedState.vao !== this.currentState.vao) {
      this.bindVAO(savedState.vao);
    }
    if (savedState.blendEnabled !== this.currentState.blendEnabled) {
      this.setBlending(savedState.blendEnabled as boolean);
    }
    if (savedState.framebuffer !== this.currentState.framebuffer) {
      this.bindFramebuffer(savedState.framebuffer);
    }
    if (
      JSON.stringify(savedState.viewport) !==
      JSON.stringify(this.currentState.viewport)
    ) {
      this.setViewport(
        savedState.viewport.x,
        savedState.viewport.y,
        savedState.viewport.width,
        savedState.viewport.height
      );
    }
  }
}
