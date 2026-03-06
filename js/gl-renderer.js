/**
 * WebGL renderer: displays a 2D canvas as a texture on a fullscreen quad.
 * Uses a fragment shader (passthrough by default) so we can plug in CRT/scanline shaders later.
 */
export class GLRenderer {
  constructor(glCanvas, vertSource, fragSource) {
    this.canvas = glCanvas;
    this.vertSource = vertSource;
    this.fragSource = fragSource;
    this.gl = glCanvas.getContext('webgl', { alpha: false, preserveDrawingBuffer: false });
    if (!this.gl) throw new Error('WebGL not available');

    const gl = this.gl;
    this.program = this.createProgram(vertSource, fragSource);
    gl.useProgram(this.program);

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const uvs = new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]);

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    this.uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.clearColor(0.04, 0.04, 0.04, 1);
  }

  createProgram(vertSource, fragSource) {
    const gl = this.gl;
    const vert = this.compileShader(gl.VERTEX_SHADER, vertSource);
    const frag = this.compileShader(gl.FRAGMENT_SHADER, fragSource);
    const program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Program link: ' + gl.getProgramInfoLog(program));
    }
    return program;
  }

  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  /** Update texture from the terminal's 2D canvas and draw. */
  render(sourceCanvas) {
    const gl = this.gl;
    const w = this.canvas.width;
    const h = this.canvas.height;

    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);

    gl.useProgram(this.program);

    const uTextureLoc = gl.getUniformLocation(this.program, 'u_texture') ?? gl.getUniformLocation(this.program, 'uTexture');
    if (uTextureLoc) gl.uniform1i(uTextureLoc, 0);

    const uResolutionLoc = gl.getUniformLocation(this.program, 'u_resolution') ?? gl.getUniformLocation(this.program, 'uResolution');
    if (uResolutionLoc) gl.uniform2f(uResolutionLoc, w, h);

    let positionLoc = gl.getAttribLocation(this.program, 'aPosition');
    if (positionLoc < 0) positionLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const uvLoc = gl.getAttribLocation(this.program, 'a_uv');
    if (uvLoc >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
      gl.enableVertexAttribArray(uvLoc);
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /** Swap fragment shader (e.g. for CRT effect). Recreate program with new frag source. */
  setFragmentShader(fragSource) {
    this.fragSource = fragSource;
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);
    this.program = this.createProgram(this.vertSource, fragSource);
  }
}
