// Adapted from the pointer-reactive WebGL background in ../portfolio/js/site.js.
(() => {
  const canvas = document.getElementById('bgCanvas');
  const gl = canvas.getContext('webgl');
  if (!gl || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (gl.getShaderParameter(result, gl.COMPILE_STATUS)) return result;
    gl.deleteShader(result);
    return null;
  }
  const vertex = shader(gl.VERTEX_SHADER, `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0., 1.); }
  `);
  const fragment = shader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform vec2 mouse;
    uniform float spacing;
    uniform float radius;
    uniform float displacementStrength;
    uniform float influenceRadius;
    uniform vec3 dotColor;
    uniform vec3 bgColor;
    void main() {
      vec2 p = gl_FragCoord.xy;
      vec2 grid = floor((p + .5 * spacing) / spacing) * spacing;
      vec2 delta = grid - mouse;
      float distance = length(delta);
      float influence = 1. / (1. + distance * .01);
      vec2 displacement = normalize(delta) * displacementStrength * influence;
      vec2 displacedGrid = grid + 5. * displacement;
      float dot = smoothstep(radius, radius - 1., length(p - displacedGrid));
      float fade = smoothstep(influenceRadius, 0., distance);
      vec3 dotTint = mix(dotColor, bgColor, 1. - fade);
      gl_FragColor = vec4(mix(bgColor, dotTint, dot), 1.);
    }
  `);
  if (!vertex || !fragment) return;
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const mouseUniform = gl.getUniformLocation(program, 'mouse');
  const spacingUniform = gl.getUniformLocation(program, 'spacing');
  const radiusUniform = gl.getUniformLocation(program, 'radius');
  const displacementUniform = gl.getUniformLocation(program, 'displacementStrength');
  const influenceUniform = gl.getUniformLocation(program, 'influenceRadius');
  const dotColorUniform = gl.getUniformLocation(program, 'dotColor');
  const bgColorUniform = gl.getUniformLocation(program, 'bgColor');
  let mouse = [-9999, -9999];
  let frame = 0;
  function draw() {
    frame = 0;
    const dpr = Math.max(1, devicePixelRatio || 1);
    const width = Math.floor(innerWidth * dpr);
    const height = Math.floor(innerHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    // Keep the original shader's physical-pixel coordinates. Its falloff
    // depends on devicePixelRatio as well as the scaled uniform values.
    gl.uniform2f(mouseUniform, mouse[0] * dpr, (innerHeight - mouse[1]) * dpr);
    const spacing = Math.round(Math.max(28, Math.min(48, Math.min(innerWidth, innerHeight) / 24)));
    gl.uniform1f(spacingUniform, spacing * dpr);
    gl.uniform1f(radiusUniform, 3 * dpr);
    gl.uniform1f(displacementUniform, 12 * dpr);
    gl.uniform1f(influenceUniform, 250 * dpr);
    gl.uniform3f(bgColorUniform, 26 / 255, 26 / 255, 26 / 255);
    gl.uniform3f(dotColorUniform, (247 + 26) / 255 * .4, (246 + 26) / 255 * .4, (243 + 26) / 255 * .4);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(draw); }
  window.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    mouse = [event.clientX, event.clientY];
    schedule();
  });
  document.documentElement.addEventListener('pointerleave', () => {
    mouse = [-9999, -9999];
    schedule();
  });
  window.addEventListener('blur', () => { mouse = [-9999, -9999]; schedule(); });
  window.addEventListener('resize', schedule);
  draw();
})();
