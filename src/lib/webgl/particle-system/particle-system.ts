import { PARTICLE_CONFIG } from './config';
import { GLState } from '../gl-state';
import { ResourceManager } from '../resource-manager';
import { hexToRGB } from '../utils';

interface UniformLocations {
  update: {
    deltaTime: WebGLUniformLocation | null;
    resolution: WebGLUniformLocation | null;
    edgeTexture: WebGLUniformLocation | null;
    particleSpeed: WebGLUniformLocation | null;
    attractionStrength: WebGLUniformLocation | null;
    time: WebGLUniformLocation | null;
    noiseSeed: WebGLUniformLocation | null;
    flowFieldScale: WebGLUniformLocation | null;
    use3DNoise: WebGLUniformLocation | null;
  };
  edge: {
    resolution: WebGLUniformLocation | null;
    image: WebGLUniformLocation | null;
    threshold: WebGLUniformLocation | null;
  };
  render: {
    particleColor: WebGLUniformLocation | null;
    particleOpacity: WebGLUniformLocation | null;
    particleSize: WebGLUniformLocation | null;
  };
}

export class ParticleSystem {
  private gl: WebGL2RenderingContext;
  private glState: GLState;
  private resourceManager: ResourceManager;
  private particleCount: number;
  private currentIndex: number = 0;
  private time: number = 0;
  private noiseSeed: number = Math.random() * 1000;

  private updateProgram: WebGLProgram;
  private renderProgram: WebGLProgram;
  private edgeProgram: WebGLProgram;
  private transformFeedback: WebGLTransformFeedback;
  private uniforms!: UniformLocations;

  private edgeFramebuffer!: WebGLFramebuffer;
  private edgeTexture!: WebGLTexture;

  private positionBuffers!: WebGLBuffer[];
  private velocityBuffers!: WebGLBuffer[];
  private targetBuffers!: WebGLBuffer[];
  private quadBuffer!: WebGLBuffer;
  private edgeVAO!: WebGLVertexArrayObject;
  private vaos!: WebGLVertexArrayObject[];

  constructor(
    gl: WebGL2RenderingContext,
    particleCount: number,
    resourceManager: ResourceManager,
    glState: GLState
  ) {
    this.gl = gl;
    this.glState = glState;
    this.resourceManager = resourceManager;
    this.particleCount = particleCount;

    const updateProg = this.resourceManager.programs.get('update');
    const renderProg = this.resourceManager.programs.get('particle');
    const edgeProg = this.resourceManager.programs.get('edge');
    if (!updateProg || !renderProg || !edgeProg) {
      throw new Error('Required programs not initialized');
    }
    this.updateProgram = updateProg;
    this.renderProgram = renderProg;
    this.edgeProgram = edgeProg;

    const tf = gl.createTransformFeedback();
    if (!tf) {
      throw new Error('Unable to create transform feedback');
    }
    this.transformFeedback = tf;

    this.initUniformLocations();
    this.initBuffers();
    this.setupEdgeDetection();
  }

  private initUniformLocations(): void {
    const gl = this.gl;
    this.uniforms = {
      update: {
        deltaTime: gl.getUniformLocation(this.updateProgram, 'deltaTime'),
        resolution: gl.getUniformLocation(this.updateProgram, 'resolution'),
        edgeTexture: gl.getUniformLocation(this.updateProgram, 'edgeTexture'),
        particleSpeed: gl.getUniformLocation(
          this.updateProgram,
          'particleSpeed'
        ),
        attractionStrength: gl.getUniformLocation(
          this.updateProgram,
          'attractionStrength'
        ),
        time: gl.getUniformLocation(this.updateProgram, 'time'),
        noiseSeed: gl.getUniformLocation(this.updateProgram, 'noiseSeed'),
        flowFieldScale: gl.getUniformLocation(
          this.updateProgram,
          'flowFieldScale'
        ),
        use3DNoise: gl.getUniformLocation(this.updateProgram, 'use3DNoise'),
      },
      edge: {
        resolution: gl.getUniformLocation(this.edgeProgram, 'uResolution'),
        image: gl.getUniformLocation(this.edgeProgram, 'uImage'),
        threshold: gl.getUniformLocation(this.edgeProgram, 'threshold'),
      },
      render: {
        particleColor: gl.getUniformLocation(
          this.renderProgram,
          'uParticleColor'
        ),
        particleOpacity: gl.getUniformLocation(
          this.renderProgram,
          'uParticleOpacity'
        ),
        particleSize: gl.getUniformLocation(this.renderProgram, 'particleSize'),
      },
    };
  }

  private setupEdgeDetection(): void {
    const gl = this.gl;

    const framebuffer = this.resourceManager.createFramebuffer();

    if (!framebuffer) throw new Error('Failed to create framebuffer');
    this.edgeFramebuffer = framebuffer;

    const texture = this.resourceManager.createTexture({
      width: gl.canvas.width,
      height: gl.canvas.height,
      internalFormat: gl.RGBA,
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrap: gl.CLAMP_TO_EDGE,
    });

    if (!texture) throw new Error('Failed to create texture');
    this.edgeTexture = texture;

    this.glState.bindFramebuffer(this.edgeFramebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.edgeTexture,
      0
    );
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('Framebuffer is not complete: ' + status);
    }
    this.glState.bindFramebuffer(null);
  }

  private initBuffers(): void {
    const count = this.particleCount;

    const positions = new Float32Array(count * 2);
    const velocities = new Float32Array(count * 2);
    const targets = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const i2 = i * 2;
      positions[i2] = Math.random();
      positions[i2 + 1] = Math.random();
      velocities[i2] = (Math.random() - 0.5) * 0.001;
      velocities[i2 + 1] = (Math.random() - 0.5) * 0.001;
      targets[i2] = -1;
      targets[i2 + 1] = -1;
    }

    this.positionBuffers = [
      this.resourceManager.createBuffer(positions),
      this.resourceManager.createBuffer(positions),
    ];
    this.velocityBuffers = [
      this.resourceManager.createBuffer(velocities),
      this.resourceManager.createBuffer(velocities),
    ];
    this.targetBuffers = [
      this.resourceManager.createBuffer(targets),
      this.resourceManager.createBuffer(targets),
    ];

    this.quadBuffer = this.resourceManager.createBuffer(
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])
    );

    this.edgeVAO = this.createEdgeVAO();
    this.vaos = [this.createParticleVAO(0), this.createParticleVAO(1)];
  }

  private createEdgeVAO(): WebGLVertexArrayObject {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('Unable to create VAO');
    this.glState.bindVAO(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    const positionLoc = gl.getAttribLocation(this.edgeProgram, 'aPosition');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    return vao;
  }

  private createParticleVAO(index: number): WebGLVertexArrayObject {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('Unable to create VAO');
    this.glState.bindVAO(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffers[index]);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.velocityBuffers[index]);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.targetBuffers[index]);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);

    return vao;
  }

  public processImage(image: HTMLImageElement): void {
    const gl = this.gl;

    const inputTexture = this.resourceManager.createTexture({
      width: image.width,
      height: image.height,
      internalFormat: gl.RGBA,
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrap: gl.CLAMP_TO_EDGE,
      data: image,
    });

    this.glState.bindFramebuffer(this.edgeFramebuffer);
    this.glState.setViewport(0, 0, gl.canvas.width, gl.canvas.height);
    this.glState.useProgram(this.edgeProgram);

    gl.uniform2f(
      this.uniforms.edge.resolution,
      gl.canvas.width,
      gl.canvas.height
    );
    gl.uniform1f(
      this.uniforms.edge.threshold,
      PARTICLE_CONFIG.edgeThreshold.value
    );

    this.glState.bindTexture(inputTexture, 0);
    gl.uniform1i(this.uniforms.edge.image, 0);

    this.glState.bindVAO(this.edgeVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (inputTexture) this.resourceManager.deleteResource(inputTexture);
    this.glState.bindFramebuffer(null);

    this.glState.useProgram(this.updateProgram);
    gl.uniform1i(this.uniforms.update.edgeTexture, 0);
    this.glState.bindTexture(this.edgeTexture, 0);
  }

  public update(deltaTime: number): void {
    const gl = this.gl;
    this.time += deltaTime * 0.001;

    this.glState.useProgram(this.updateProgram);
    gl.uniform1f(this.uniforms.update.deltaTime, deltaTime * 0.001);
    gl.uniform2f(
      this.uniforms.update.resolution,
      gl.canvas.width,
      gl.canvas.height
    );
    gl.uniform1f(this.uniforms.update.time, this.time);
    gl.uniform1f(
      this.uniforms.update.particleSpeed,
      PARTICLE_CONFIG.particleSpeed.value
    );
    gl.uniform1f(
      this.uniforms.update.attractionStrength,
      PARTICLE_CONFIG.attractionStrength.value
    );
    gl.uniform1f(this.uniforms.update.noiseSeed, this.noiseSeed);
    gl.uniform1f(
      this.uniforms.update.flowFieldScale,
      PARTICLE_CONFIG.flowFieldScale.value
    );
    gl.uniform1i(
      this.uniforms.update.use3DNoise,
      PARTICLE_CONFIG.noiseType === '3D' ? 1 : 0
    );

    this.glState.bindVAO(this.vaos[this.currentIndex]);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.transformFeedback);

    gl.bindBufferBase(
      gl.TRANSFORM_FEEDBACK_BUFFER,
      0,
      this.positionBuffers[1 - this.currentIndex]
    );
    gl.bindBufferBase(
      gl.TRANSFORM_FEEDBACK_BUFFER,
      1,
      this.velocityBuffers[1 - this.currentIndex]
    );
    gl.bindBufferBase(
      gl.TRANSFORM_FEEDBACK_BUFFER,
      2,
      this.targetBuffers[1 - this.currentIndex]
    );

    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, this.particleCount);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);

    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, null);

    this.currentIndex = 1 - this.currentIndex;
  }

  public render(): void {
    const gl = this.gl;

    this.glState.useProgram(this.renderProgram);
    this.glState.bindVAO(this.vaos[this.currentIndex]);

    const rgb = hexToRGB(PARTICLE_CONFIG.particleColor);
    gl.uniform3f(this.uniforms.render.particleColor, rgb[0], rgb[1], rgb[2]);
    gl.uniform1f(
      this.uniforms.render.particleOpacity,
      PARTICLE_CONFIG.particleOpacity.value
    );
    gl.uniform1f(
      this.uniforms.render.particleSize,
      PARTICLE_CONFIG.particleSize.value
    );

    this.glState.setBlending(true);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.POINTS, 0, this.particleCount);
    this.glState.setBlending(false);
  }

  public dispose(): void {
    this.gl.deleteTransformFeedback(this.transformFeedback);
    this.gl.deleteVertexArray(this.edgeVAO);
    this.vaos.forEach((vao) => this.gl.deleteVertexArray(vao));
  }
}
