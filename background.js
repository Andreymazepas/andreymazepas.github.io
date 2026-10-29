(() => {
  const canvas = document.getElementById('bgCanvas');
  const gl = canvas.getContext('webgl');
  if (!gl || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function compileShader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (gl.getShaderParameter(result, gl.COMPILE_STATUS)) return result;
    gl.deleteShader(result);
    return null;
  }

  const vertex = compileShader(gl.VERTEX_SHADER, `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0., 1.); }
  `);
  const fragment = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform vec2 mouse;
    uniform float spacing;
    uniform float radius;
    uniform float displacementStrength;
    uniform float influenceRadius;
    uniform vec3 dotColor;
    uniform vec3 bgColor;
    uniform vec2 bootOrigin;
    uniform float bootRadius;
    uniform float bootWidth;
    uniform float bootStrength;
    uniform float bootDisplacement;
    uniform float pointerStrength;
    uniform vec2 linkCenter;
    uniform float linkStrength;
    uniform float linkRadius;
    uniform float pixelRatio;
    uniform vec3 press;
    uniform vec4 ripples[3];

    float pointDepth(vec2 cell) {
      vec3 seed = fract(vec3(cell.xyx) * .1031);
      seed += dot(seed, seed.yzx + 33.33);
      return fract((seed.x + seed.y) * seed.z);
    }

    float gatherAt(float distance, float strength) {
      return (1. - smoothstep(0., linkRadius, distance)) * strength;
    }

    vec2 forceDirection(vec2 delta) {
      float distance = length(delta);
      return delta / max(distance, .001) * smoothstep(0., radius * 3., distance);
    }

    void main() {
      vec2 p = gl_FragCoord.xy;
      vec2 cell = floor((p + .5 * spacing) / spacing);
      vec2 grid = cell * spacing;
      float depth = pointDepth(cell);
      float response = mix(.86, 1.14, depth);

      vec2 rippleDisplacement = vec2(0.);
      float clickLight = 0.;
      float releasedGather = 0.;
      for (int i = 0; i < 3; i++) {
        vec2 fromClick = grid - ripples[i].xy;
        float clickDistance = length(fromClick);
        float age = ripples[i].z;
        float waveRadius = age * 520. * pixelRatio;
        float recovery = smoothstep(clickDistance, clickDistance + 45. * pixelRatio, waveRadius);
        float gather = gatherAt(clickDistance, ripples[i].w) * (1. - recovery);
        float envelope = (1. - smoothstep(0., 65. * pixelRatio, abs(clickDistance - age * 520. * pixelRatio)))
          * pow(max(0., 1. - age / 1.2), 1.5) * ripples[i].w;
        vec2 direction = forceDirection(fromClick);
        rippleDisplacement += direction * (envelope * 9. * pixelRatio - gather * spacing * .22) * response;
        releasedGather = max(releasedGather, gather);
        clickLight = max(clickLight, max(envelope * .65, gather * .55));
      }

      vec2 toPress = press.xy - grid;
      float pressDistance = length(toPress);
      float heldGather = gatherAt(pressDistance, press.z);
      rippleDisplacement += forceDirection(toPress) * spacing * .22 * heldGather * response;
      clickLight = max(clickLight, heldGather * .55);

      vec2 delta = grid - mouse;
      float distance = length(delta);
      float influence = 1. / (1. + distance * .01);
      vec2 toLink = linkCenter - grid;
      float linkDistance = length(toLink);
      float gathering = gatherAt(linkDistance, linkStrength);
      vec2 displacement = forceDirection(delta) * displacementStrength * influence * pointerStrength;
      displacement *= 1. - max(max(gathering, heldGather), releasedGather) * .8;
      displacement *= response;
      vec2 displacedGrid = grid + 5. * displacement;
      displacedGrid += forceDirection(toLink) * spacing * .22 * gathering * response;

      vec2 fromCorner = grid - bootOrigin;
      float cornerDistance = length(fromCorner);
      float wave = (1. - smoothstep(0., bootWidth, abs(cornerDistance - bootRadius))) * bootStrength;
      displacedGrid += fromCorner / max(cornerDistance, .001) * wave * bootDisplacement * response;

      displacedGrid += rippleDisplacement;

      float pointRadius = radius * mix(.92, 1.08, depth);
      float dot = smoothstep(pointRadius, pointRadius - 1., length(p - displacedGrid));
      float fade = smoothstep(influenceRadius, 0., distance) * pointerStrength;
      fade = max(max(max(fade, wave * .7), gathering * .55), clickLight);
      fade *= mix(.85, 1., depth);
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
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1,
  ]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {};
  for (const name of [
    'mouse', 'spacing', 'radius', 'displacementStrength', 'influenceRadius',
    'dotColor', 'bgColor', 'bootOrigin', 'bootRadius', 'bootWidth',
    'bootStrength', 'bootDisplacement', 'pointerStrength', 'linkCenter',
    'linkStrength', 'linkRadius', 'pixelRatio', 'ripples', 'press',
  ]) {
    uniforms[name] = gl.getUniformLocation(program, name === 'ripples' ? 'ripples[0]' : name);
  }

  gl.uniform3f(uniforms.bgColor, 26 / 255, 26 / 255, 26 / 255);
  gl.uniform3f(uniforms.dotColor,
    (247 + 26) / 255 * .4,
    (246 + 26) / 255 * .4,
    (243 + 26) / 255 * .4
  );

  const ripples = [];
  const rippleValues = new Float32Array(12);
  const bootStart = performance.now() + 100;
  const bootDuration = 1700;
  let mouse = [-9999, -9999];
  let targetMouse = [...mouse];
  let pointerInside = false;
  let pointerStrength = 0;
  let heldPointer = null;
  let pressPosition = [0, 0];
  let touchActive = false;
  let pressStrength = 0;
  let linkStrength = 0;
  let hoveredLink = null;
  let focusedLink = null;
  let lastTime = performance.now();
  let frame = 0;

  function damp(value, target, dt, duration) {
    return value + (target - value) * (1 - Math.exp(-dt / duration));
  }

  function draw() {
    frame = 0;
    const now = performance.now();
    const dt = Math.min(32, now - lastTime);
    lastTime = now;

    mouse[0] = damp(mouse[0], targetMouse[0], dt, 55);
    mouse[1] = damp(mouse[1], targetMouse[1], dt, 55);
    const pointerTarget = pointerInside ? 1 : 0;
    pointerStrength = damp(pointerStrength, pointerTarget, dt, 75);
    pressStrength = damp(pressStrength, heldPointer ? 1 : 0, dt, 90);
    const activeLink = hoveredLink || focusedLink;
    const linkTarget = activeLink ? 1 : 0;
    linkStrength = damp(linkStrength, linkTarget, dt, 90);

    const dpr = Math.max(1, devicePixelRatio || 1);
    const width = Math.floor(innerWidth * dpr);
    const height = Math.floor(innerHeight * dpr);

    while (ripples.length && now - ripples[0].start >= 1200) ripples.shift();
    rippleValues.fill(0);
    ripples.forEach((ripple, index) => {
      rippleValues.set([
        ripple.x * width,
        (1 - ripple.y) * height,
        (now - ripple.start) / 1000,
        ripple.strength,
      ], index * 4);
    });
    gl.uniform4fv(uniforms.ripples, rippleValues);
    gl.uniform1f(uniforms.pixelRatio, dpr);
    gl.uniform3f(uniforms.press,
      pressPosition[0] * width,
      (1 - pressPosition[1]) * height,
      pressStrength
    );
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }

    gl.uniform2f(uniforms.mouse, mouse[0] * dpr, (innerHeight - mouse[1]) * dpr);
    gl.uniform1f(uniforms.pointerStrength, pointerStrength);
    if (activeLink) {
      const rect = activeLink.getBoundingClientRect();
      gl.uniform2f(uniforms.linkCenter,
        (rect.left + rect.width / 2) * dpr,
        (innerHeight - rect.top - rect.height / 2) * dpr
      );
    }
    gl.uniform1f(uniforms.linkStrength, linkStrength);
    gl.uniform1f(uniforms.linkRadius, (touchActive ? 85 : 140) * dpr);
    gl.uniform1f(uniforms.spacing, 28 * dpr);
    gl.uniform1f(uniforms.radius, 3 * dpr);
    gl.uniform1f(uniforms.displacementStrength, 12 * dpr);
    gl.uniform1f(uniforms.influenceRadius, 250 * dpr);

    const progress = Math.max(0, Math.min(1, (now - bootStart) / bootDuration));
    const waveWidth = 110 * dpr;
    const diagonal = Math.hypot(width, height);
    gl.uniform2f(uniforms.bootOrigin, width, height);
    gl.uniform1f(uniforms.bootRadius, -waveWidth + progress * (diagonal + waveWidth * 2));
    gl.uniform1f(uniforms.bootWidth, waveWidth);
    gl.uniform1f(uniforms.bootStrength, progress < 1 ? 1 : 0);
    gl.uniform1f(uniforms.bootDisplacement, 10 * dpr);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const settling = Math.hypot(targetMouse[0] - mouse[0], targetMouse[1] - mouse[1]) > .1
      || Math.abs(pointerTarget - pointerStrength) > .001
      || Math.abs((heldPointer ? 1 : 0) - pressStrength) > .001
      || Math.abs(linkTarget - linkStrength) > .001;
    if (progress < 1 || settling || ripples.length) schedule();
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  window.addEventListener('pointermove', event => {
    if (heldPointer?.id === event.pointerId) {
      heldPointer.x = event.clientX / innerWidth;
      heldPointer.y = event.clientY / innerHeight;
      pressPosition = [heldPointer.x, heldPointer.y];
      schedule();
    }
    if (event.pointerType === 'touch') return;
    touchActive = false;
    targetMouse = [event.clientX, event.clientY];
    if (!pointerInside) mouse = [...targetMouse];
    pointerInside = true;
    schedule();
  });

  const closestLink = target => target instanceof Element ? target.closest('a') : null;

  document.addEventListener('pointerdown', event => {
    if (event.button !== 0 || heldPointer) return;
    if (event.target instanceof Element && event.target.closest(
      'main, a, button, input, textarea, select, label, [contenteditable]'
    )) return;
    if (window.getSelection()?.toString()) return;
    heldPointer = {
      id: event.pointerId,
      x: event.clientX / innerWidth,
      y: event.clientY / innerHeight,
    };
    pressPosition = [heldPointer.x, heldPointer.y];
    touchActive = event.pointerType === 'touch';
    if (touchActive) {
      pointerInside = false;
      pointerStrength = 0;
      hoveredLink = null;
      focusedLink = null;
      linkStrength = 0;
      schedule();
      return;
    }
    targetMouse = [event.clientX, event.clientY];
    if (!pointerInside) mouse = [...targetMouse];
    pointerInside = true;
    schedule();
  });

  window.addEventListener('pointerup', event => {
    if (heldPointer?.id !== event.pointerId) return;
    if (ripples.length === 3) ripples.shift();
    ripples.push({
      x: event.clientX / innerWidth,
      y: event.clientY / innerHeight,
      start: performance.now(),
      strength: Math.max(.01, pressStrength),
    });
    heldPointer = null;
    pressStrength = 0;
    schedule();
  });

  window.addEventListener('pointercancel', event => {
    if (heldPointer?.id !== event.pointerId) return;
    releasePointer();
  });

  document.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    hoveredLink = closestLink(event.target);
    schedule();
  });

  document.addEventListener('pointerout', event => {
    if (event.pointerType === 'touch') return;
    hoveredLink = closestLink(event.relatedTarget);
    schedule();
  });

  document.addEventListener('focusin', event => {
    focusedLink = closestLink(event.target);
    schedule();
  });

  document.addEventListener('focusout', event => {
    focusedLink = closestLink(event.relatedTarget);
    schedule();
  });

  function releasePointer() {
    heldPointer = null;
    pressStrength = 0;
    pointerInside = false;
    hoveredLink = null;
    schedule();
  }

  document.documentElement.addEventListener('pointerleave', releasePointer);
  window.addEventListener('blur', releasePointer);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);

  draw();
})();
