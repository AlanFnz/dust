export function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    console.error('Unable to create shader.');
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
  transformFeedbackVaryings?: string[] | null
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) {
    console.error('Unable to create program.');
    return null;
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  if (transformFeedbackVaryings) {
    gl.transformFeedbackVaryings(
      program,
      transformFeedbackVaryings,
      gl.SEPARATE_ATTRIBS
    );
  }
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export function createBuffer(
  gl: WebGL2RenderingContext,
  data: BufferSource,
  usage: number = gl.DYNAMIC_COPY
): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new Error('Unable to create buffer');
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buffer;
}

export function setUniforms(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  uniforms: { [key: string]: number | boolean | number[] }
): void {
  gl.useProgram(program);

  Object.entries(uniforms).forEach(([name, value]) => {
    const location = gl.getUniformLocation(program, name);
    if (location === null) return;

    if (Array.isArray(value)) {
      switch (value.length) {
        case 2:
          gl.uniform2fv(location, new Float32Array(value));
          break;
        case 3:
          gl.uniform3fv(location, new Float32Array(value));
          break;
        case 4:
          gl.uniform4fv(location, new Float32Array(value));
          break;
        case 9:
          gl.uniformMatrix3fv(location, false, new Float32Array(value));
          break;
        case 16:
          gl.uniformMatrix4fv(location, false, new Float32Array(value));
          break;
        default:
          gl.uniform1fv(location, new Float32Array(value));
      }
    } else if (typeof value === 'number') {
      gl.uniform1f(location, value);
    } else if (typeof value === 'boolean') {
      gl.uniform1i(location, value ? 1 : 0);
    }
  });
}

export function hexToRGB(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export function getRandomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

export function getRandomValue(min: number, max: number, step: number): number {
  const steps = Math.floor((max - min) / step);
  return min + Math.floor(Math.random() * steps) * step;
}

export function createFullscreenQuad(gl: WebGL2RenderingContext): {
  vao: WebGLVertexArrayObject | null;
  buffer: WebGLBuffer | null;
} {
  const positions = new Float32Array([
    -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
  ]);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const buffer = createBuffer(gl, positions, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return { vao, buffer };
}

export function isWebGL2Supported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch (error) {
    console.log('WebGL2 not supported', error);
    return false;
  }
}

export function resizeCanvasToDisplaySize(
  canvas: HTMLCanvasElement,
  multiplier: number = 1
): boolean {
  const width = Math.floor(canvas.clientWidth * multiplier);
  const height = Math.floor(canvas.clientHeight * multiplier);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }
  return false;
}

export function logWebGLCapabilities(gl: WebGL2RenderingContext): void {
  console.log('WebGL Capabilities:');
  console.log('WebGL version:', gl.getParameter(gl.VERSION));
  console.log('Shader version:', gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
  console.log('Vendor:', gl.getParameter(gl.VENDOR));
  console.log('Renderer:', gl.getParameter(gl.RENDERER));
  console.log('Max texture size:', gl.getParameter(gl.MAX_TEXTURE_SIZE));
  console.log(
    'Max viewport dimensions:',
    gl.getParameter(gl.MAX_VIEWPORT_DIMS)
  );
  console.log('Available extensions:', gl.getSupportedExtensions());
}
