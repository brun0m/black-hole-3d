import { Mat4 } from './math.js';
import { vsSource, fsSource } from './shaders.js';
import { initSpaceAudio } from './audio.js';
import { parseOBJString, createSpaceRockTexture, asteroidOBJ } from './utils.js';

const canvas = document.getElementById('canvas');

// ---------- GL Context ----------
let gl = canvas.getContext('webgl2', { alpha: false, depth: true, antialias: true });
let isWebGL2 = !!gl;
if (!gl) gl = canvas.getContext('webgl', { alpha: false, depth: true, antialias: true });
if (!gl) alert('WebGL não suportado.');

gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);
gl.enable(gl.CULL_FACE);

// ---------- Shader helpers ----------
function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const vertShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

const prog = gl.createProgram();
gl.attachShader(prog, vertShader);
gl.attachShader(prog, fragShader);
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
  console.error('Program link error:', gl.getProgramInfoLog(prog));
}
gl.useProgram(prog);

// ---------- Locations ----------
const locs = {
  aPos: gl.getAttribLocation(prog, 'aPos'),
  aNorm: gl.getAttribLocation(prog, 'aNorm'),
  aTexCoord: gl.getAttribLocation(prog, 'aTexCoord'),

  uModel: gl.getUniformLocation(prog, 'uModel'),
  uView: gl.getUniformLocation(prog, 'uView'),
  uProj: gl.getUniformLocation(prog, 'uProj'),
  uViewPos: gl.getUniformLocation(prog, 'uViewPos'),
  uColor: gl.getUniformLocation(prog, 'uColor'),
  uTime: gl.getUniformLocation(prog, 'uTime'),
  uType: gl.getUniformLocation(prog, 'uType'),
  uLightPos: gl.getUniformLocation(prog, 'uLightPos'),
  uTexture: gl.getUniformLocation(prog, 'uTexture'),

  uResolution: gl.getUniformLocation(prog, 'uResolution'),
  uSwallow: gl.getUniformLocation(prog, 'uSwallow')
};

// ---------- VAO support ----------
const vaoExt = (!isWebGL2) ? gl.getExtension('OES_vertex_array_object') : null;

function createVAO() {
  return isWebGL2 ? gl.createVertexArray() : (vaoExt ? vaoExt.createVertexArrayOES() : null);
}
function bindVAO(vao) {
  if (!vao) return;
  if (isWebGL2) gl.bindVertexArray(vao);
  else if (vaoExt) vaoExt.bindVertexArrayOES(vao);
}
function unbindVAO() {
  if (isWebGL2) gl.bindVertexArray(null);
  else if (vaoExt) vaoExt.bindVertexArrayOES(null);
}

// ---------- Geometry ----------
function createCube() {
  const positions = [
    -1,-1,1,  1,-1,1,  1, 1,1,  -1, 1,1,
    -1,-1,-1, -1, 1,-1, 1, 1,-1, 1,-1,-1,
    -1, 1,-1, -1, 1,1, 1, 1,1, 1, 1,-1,
    -1,-1,-1, 1,-1,-1, 1,-1,1, -1,-1,1,
     1,-1,-1, 1, 1,-1, 1, 1,1, 1,-1,1,
    -1,-1,-1, -1,-1,1, -1, 1,1, -1, 1,-1
  ];
  const normals = [
     0,0,1, 0,0,1, 0,0,1, 0,0,1,
     0,0,-1,0,0,-1,0,0,-1,0,0,-1,
     0,1,0,0,1,0,0,1,0,0,1,0,
     0,-1,0,0,-1,0,0,-1,0,0,-1,0,
     1,0,0,1,0,0,1,0,0,1,0,0,
    -1,0,0,-1,0,0,-1,0,0,-1,0,0
  ];
  const texCoords = new Array(24 * 2).fill(0);
  const indices = [
     0, 1, 2, 0, 2, 3,
     4, 5, 6, 4, 6, 7,
     8, 9,10, 8,10,11,
    12,13,14,12,14,15,
    16,17,18,16,18,19,
    20,21,22,20,22,23
  ];
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    texCoords: new Float32Array(texCoords),
    indices: new Uint16Array(indices),
    count: indices.length
  };
}

function createStarField(count) {
  const pos = [];
  for (let i = 0; i < count; i++) {
    const r = 55.0 + Math.random() * 75.0;
    const theta = Math.random() * Math.PI * 2.0;
    const phi = Math.acos(2.0 * Math.random() - 1.0);
    pos.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  }
  return { positions: new Float32Array(pos), count };
}

function createBufferInfo(data, { indexed = false, withNormals = false, withTex = false } = {}) {
  const vao = createVAO();
  bindVAO(vao);

  // positions
  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, data.positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(locs.aPos);
  gl.vertexAttribPointer(locs.aPos, 3, gl.FLOAT, false, 0, 0);

  // normals
  if (withNormals && data.normals && locs.aNorm !== -1) {
    const nBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data.normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(locs.aNorm);
    gl.vertexAttribPointer(locs.aNorm, 3, gl.FLOAT, false, 0, 0);
  } else if (locs.aNorm !== -1) {
    gl.disableVertexAttribArray(locs.aNorm);
    gl.vertexAttrib3f(locs.aNorm, 0, 1, 0);
  }

  // texcoords
  if (withTex && data.texCoords && locs.aTexCoord !== -1) {
    const tBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data.texCoords, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(locs.aTexCoord);
    gl.vertexAttribPointer(locs.aTexCoord, 2, gl.FLOAT, false, 0, 0);
  } else if (locs.aTexCoord !== -1) {
    gl.disableVertexAttribArray(locs.aTexCoord);
    gl.vertexAttrib2f(locs.aTexCoord, 0, 0);
  }

  let hasIndices = false;
  if (indexed && data.indices) {
    const idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
    hasIndices = true;
  }

  unbindVAO();
  return { vao, count: data.count, indexed: hasIndices };
}

// Buffers
const cubeInfo = createBufferInfo(createCube(), { indexed: true, withNormals: true, withTex: true });
const starsInfo = createBufferInfo(createStarField(2800), { indexed: false, withNormals: false, withTex: false });

// Asteroid mesh (OBJ)
const asteroidData = parseOBJString(asteroidOBJ);
const asteroidInfo = createBufferInfo(
  { positions: asteroidData.positions, normals: asteroidData.normals, texCoords: asteroidData.texCoords, count: asteroidData.count },
  { indexed: false, withNormals: true, withTex: true }
);

// Asteroid texture (procedural)
const asteroidTex = gl.createTexture();
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, asteroidTex);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, createSpaceRockTexture());
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.generateMipmap(gl.TEXTURE_2D);

// ---------- Scene ----------
const bhCenter = [0, 3.5, 0];

const objects = [
  // Buraco negro (volume)
  { type: 1, p: [0, 3.5, 0], s: [8, 8, 8], c: [0, 0, 0], mesh: cubeInfo },

  // Estrelas (fundo)
  { type: 4, p: [0, 0, 0], s: [1, 1, 1], c: [1, 1, 1], mesh: starsInfo, isStars: true }
];

// Asteroides ao redor (neutros/pedra, mas visíveis)
const AST_COUNT = 14;
for (let i = 0; i < AST_COUNT; i++) {
  const angle = (i / AST_COUNT) * Math.PI * 2.0 + (Math.random() * 0.6);
  const r = 6.5 + Math.random() * 3.5; // anel em volta
  const y = 2.0 + Math.random() * 3.2;

  // cor de pedra neutra, mas com leve variação
  const base = 0.45 + Math.random() * 0.18;
  const c = [base, base * 0.95, base * 0.9];

  const s = 0.35 + Math.random() * 0.55;

  objects.push({
    type: 2,
    p: [Math.cos(angle) * r, y, Math.sin(angle) * r],
    s: [s, s * (0.7 + Math.random() * 0.6), s], // um pouco irregular
    c,
    mesh: asteroidInfo,
    isAst: true,
    anim: {
      seed: Math.random() * 1000,
      orbitR: r,
      orbitY: y,
      orbitSpeed: 0.18 + Math.random() * 0.22,
      rotSpeed: 0.15 + Math.random() * 0.6,
      phase: angle
    }
  });
}

// ---------- Input ----------
const camera = { pos: [0, 2.0, 14], yaw: -Math.PI / 2, pitch: 0 };
const keys = {};
let mouseLocked = false;

window.onkeydown = e => keys[e.key.toLowerCase()] = true;
window.onkeyup = e => keys[e.key.toLowerCase()] = false;

canvas.onclick = () => {
  canvas.requestPointerLock();
  initSpaceAudio();
};

document.onpointerlockchange = () => {
  mouseLocked = document.pointerLockElement === canvas;
};

document.onmousemove = e => {
  if (!mouseLocked) return;
  camera.yaw -= e.movementX * 0.002;
  camera.pitch = Math.max(-1.4, Math.min(1.4, camera.pitch - e.movementY * 0.002));
};

// ---------- Resize (DPR) ----------
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  gl.viewport(0, 0, canvas.width, canvas.height);
}
window.onresize = resize;
resize();

// ---------- Modo Engolido ----------
let swallow = 0.0;
let swallowed = false;

// Shake (tremor) conforme aproxima do BH
function proximityFactorXZ() {
  const dx = camera.pos[0] - 0.0;
  const dz = camera.pos[2] - 0.0;
  const d = Math.sqrt(dx * dx + dz * dz);
  // 0 longe (>= 14), 1 bem perto (<= 3)
  const t = 1.0 - Math.min(1.0, Math.max(0.0, (d - 3.0) / 11.0));
  // curva suave
  return t * t * (3.0 - 2.0 * t);
}

function updateSwallow(dt) {
  const distXZ = Math.hypot(camera.pos[0], camera.pos[2]);
  if (!swallowed && distXZ < 2.2) swallowed = true;

  if (swallowed) {
    swallow = Math.min(1.0, swallow + dt * 0.45);

    // Puxa para o centro (sensação de queda)
    const k = swallow * swallow * (3.0 - 2.0 * swallow);
    camera.pos[0] *= (1.0 - dt * (0.6 + 3.2 * k));
    camera.pos[2] *= (1.0 - dt * (0.6 + 3.2 * k));

    // Desorientação suave
    camera.yaw += dt * (0.35 + 1.2 * k);

    // Reset quando blackout completa
    if (swallow >= 1.0) {
      swallowed = false;
      swallow = 0.0;
      camera.pos = [0, 2.0, 14];
      camera.yaw = -Math.PI / 2;
      camera.pitch = 0;
    }
  }
}

// ---------- Render loop ----------
let lastTime = 0;
function render(now) {
  const dt = (now - lastTime) * 0.001;
  lastTime = now;
  const timeSec = now * 0.001;

  // Movimento (travado durante engolido)
  if (mouseLocked && !swallowed) {
    const f = (keys['w'] ? 1 : 0) - (keys['s'] ? 1 : 0);
    const s = (keys['a'] ? 1 : 0) - (keys['d'] ? 1 : 0);
    if (f || s) {
      const spd = 6.0 * dt;
      const dx = Math.sin(camera.yaw) * f + Math.cos(camera.yaw) * s;
      const dz = Math.cos(camera.yaw) * f - Math.sin(camera.yaw) * s;
      camera.pos[0] += dx * spd;
      camera.pos[2] += dz * spd;
    }
  }

  updateSwallow(dt);

  // Atualiza asteroides (órbitas) — com leve aceleração quando perto do BH
  const prox = proximityFactorXZ();
  const speedBoost = 1.0 + prox * 1.8 + swallow * 2.5;
  for (const o of objects) {
    if (!o.anim) continue;
    const a = o.anim.phase + timeSec * o.anim.orbitSpeed * speedBoost;
    o.p[0] = Math.cos(a) * o.anim.orbitR;
    o.p[2] = Math.sin(a) * o.anim.orbitR;
    // micro variação em Y (bem sutil)
    o.p[1] = o.anim.orbitY + Math.sin(timeSec * 0.8 + o.anim.seed) * 0.15;
  }

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // FOV dramático no engolido
  const baseFov = Math.PI / 3;
  const fov = baseFov + swallow * 0.35;
  const proj = Mat4.persp(fov, canvas.width / canvas.height, 0.01, 220);

  // Tremor conforme aproxima
  const trem = proximityFactorXZ();
  const tremAmp = (0.01 + 0.08 * trem) + (0.14 * swallow);
  const t1 = timeSec * (8.0 + 18.0 * trem);
  const shakeX = Math.sin(t1 * 1.7) * tremAmp;
  const shakeY = Math.sin(t1 * 2.3 + 10.0) * tremAmp * 0.6;
  const shakeZ = Math.sin(t1 * 1.1 + 20.0) * tremAmp * 0.4;

  const eye = [
    camera.pos[0] + shakeX,
    camera.pos[1] + shakeY,
    camera.pos[2] + shakeZ
  ];

  const target = [
    eye[0] + Math.sin(camera.yaw) * Math.cos(camera.pitch),
    eye[1] + Math.sin(camera.pitch),
    eye[2] + Math.cos(camera.yaw) * Math.cos(camera.pitch)
  ];

  const view = Mat4.look(eye, target, [0, 1, 0]);

  // Luz “fria” girando só pra dar relevo nos asteroides
  const lightX = Math.sin(timeSec * 0.8) * 7.0;
  const lightZ = Math.cos(timeSec * 0.8) * 7.0;
  const lightPos = [lightX, 5.5, lightZ];

  // Uniforms globais
  gl.uniformMatrix4fv(locs.uProj, false, proj);
  gl.uniformMatrix4fv(locs.uView, false, view);
  gl.uniform3fv(locs.uViewPos, eye);
  gl.uniform1f(locs.uTime, timeSec);
  gl.uniform3fv(locs.uLightPos, lightPos);
  gl.uniform2f(locs.uResolution, canvas.width, canvas.height);
  gl.uniform1f(locs.uSwallow, swallow);

  // textura no slot 0
  gl.uniform1i(locs.uTexture, 0);

  // Draw
  for (const o of objects) {
    let m = Mat4.identity();
    m = Mat4.translate(m, o.p);

    // Asteroides: rotação + leve “spaghettification” quando muito perto
    if (o.anim) {
      const rot = timeSec * o.anim.rotSpeed * speedBoost;
      m = Mat4.rotateY(m, rot);

      // estica um pouco ao aproximar (efeito divertido, mas sutil)
      const d = Math.hypot(o.p[0], o.p[2]);
      const stretch = Math.max(0.0, Math.min(1.0, (3.8 - d) / 2.0));
      const st = stretch * stretch;

      const sx = o.s[0] * (1.0 + st * 0.9);
      const sy = o.s[1] * (1.0 - st * 0.35);
      const sz = o.s[2] * (1.0 - st * 0.35);

      m = Mat4.scale(m, [sx, sy, sz]);
    } else {
      m = Mat4.scale(m, o.s);
    }

    gl.uniformMatrix4fv(locs.uModel, false, m);
    gl.uniform3fv(locs.uColor, o.c);
    gl.uniform1i(locs.uType, o.type);

    // Buraco negro: render com face dupla e sem escrita de depth
    if (o.type === 1) {
      gl.depthMask(false);
      gl.disable(gl.CULL_FACE);
    } else {
      gl.depthMask(true);
      gl.enable(gl.CULL_FACE);
    }

    bindVAO(o.mesh.vao);

    if (o.type === 2) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, asteroidTex);
      gl.drawArrays(gl.TRIANGLES, 0, o.mesh.count);
    } else if (o.type === 4) {
      gl.drawArrays(gl.POINTS, 0, o.mesh.count);
    } else if (o.mesh.indexed) {
      gl.drawElements(gl.TRIANGLES, o.mesh.count, gl.UNSIGNED_SHORT, 0);
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, o.mesh.count);
    }

    unbindVAO();
  }

  requestAnimationFrame(render);
}

// Loading overlay
setTimeout(() => {
  const l = document.getElementById('loading');
  if (l) l.classList.add('hidden');
}, 900);

requestAnimationFrame(render);
