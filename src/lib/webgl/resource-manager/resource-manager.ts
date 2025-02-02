import { createAndSetupTexture, TextureOptions } from '../texture';
import { createBuffer, createProgram, createShader } from '../utils';

interface ResourceInfo {
  type: 'buffer' | 'texture' | 'framebuffer';
  data?: BufferSource | TexImageSource | null;
  usage?: number;
}

export class ResourceManager {
  public gl: WebGL2RenderingContext;
  public resources: Map<
    WebGLBuffer | WebGLTexture | WebGLFramebuffer,
    ResourceInfo
  >;
  public shaders: Map<string, WebGLShader>;
  public programs: Map<string, WebGLProgram>;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.resources = new Map();
    this.shaders = new Map();
    this.programs = new Map();
  }

  public async loadShader(name: string, type: number): Promise<WebGLShader> {
    try {
      const response = await fetch(`shaders/${name}`);
      if (!response.ok) {
        throw new Error(`Failed to load shader: ${name}`);
      }
      const source = await response.text();
      const shader = createShader(this.gl, type, source);
      if (!shader) {
        throw new Error(`Failed to compile shader: ${name}`);
      }
      this.shaders.set(name, shader);
      return shader;
    } catch (error) {
      console.error(`Error loading shader: ${name}`, error);
      throw error;
    }
  }

  public async createProgram(
    name: string,
    vertexShaderName: string,
    fragmentShaderName: string,
    transformFeedbackVaryings: string[] | null = null
  ): Promise<WebGLProgram> {
    try {
      const vertexShader = await this.loadShader(
        `${vertexShaderName}.vert`,
        this.gl.VERTEX_SHADER
      );
      const fragmentShader = await this.loadShader(
        `${fragmentShaderName}.frag`,
        this.gl.FRAGMENT_SHADER
      );

      const program = createProgram(
        this.gl,
        vertexShader,
        fragmentShader,
        transformFeedbackVaryings
      );

      if (!program) {
        throw new Error(`Failed to create program: ${name}`);
      }

      this.programs.set(name, program);
      return program;
    } catch (error) {
      console.error(`Error creating program: ${name}`, error);
      throw error;
    }
  }

  public createBuffer(
    data: BufferSource,
    usage: number = this.gl.DYNAMIC_COPY
  ): WebGLBuffer {
    const buffer = createBuffer(this.gl, data, usage);
    this.resources.set(buffer, { type: 'buffer', data, usage });
    return buffer;
  }

  public createTexture(options: TextureOptions = {}): WebGLTexture | null {
    const texture = createAndSetupTexture(this.gl, options);
    if (texture) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { type: _ignored, ...restOptions } = options;
      this.resources.set(texture, { type: 'texture', ...restOptions });
    }
    return texture;
  }

  public createFramebuffer(): WebGLFramebuffer | null {
    const framebuffer = this.gl.createFramebuffer();
    if (framebuffer) {
      this.resources.set(framebuffer, { type: 'framebuffer' });
    }
    return framebuffer;
  }

  public deleteResource(
    resource: WebGLBuffer | WebGLTexture | WebGLFramebuffer
  ): void {
    const resourceInfo = this.resources.get(resource);
    if (!resourceInfo) return;

    const gl = this.gl;
    switch (resourceInfo.type) {
      case 'texture':
        gl.deleteTexture(resource as WebGLTexture);
        break;
      case 'buffer':
        gl.deleteBuffer(resource as WebGLBuffer);
        break;
      case 'framebuffer':
        gl.deleteFramebuffer(resource as WebGLFramebuffer);
        break;
    }

    this.resources.delete(resource);
  }

  public dispose(): void {
    const gl = this.gl;

    this.resources.forEach((info, resource) => {
      this.deleteResource(resource);
    });

    this.shaders.forEach((shader) => {
      gl.deleteShader(shader);
    });
    this.shaders.clear();

    this.programs.forEach((program) => {
      gl.deleteProgram(program);
    });
    this.programs.clear();
  }

  public getProgram(name: string): WebGLProgram | undefined {
    return this.programs.get(name);
  }

  public hasProgram(name: string): boolean {
    return this.programs.has(name);
  }

  public getShader(name: string): WebGLShader | undefined {
    return this.shaders.get(name);
  }

  public hasShader(name: string): boolean {
    return this.shaders.has(name);
  }
}
