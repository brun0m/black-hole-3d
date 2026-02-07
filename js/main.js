import { Mat4 } from './math.js';
import { vsSource, fsSource } from './shaders.js';
import { initSpaceAudio } from './audio.js';
import { parseOBJString, createSpaceRockTexture, asteroidOBJ } from './utils.js';

const canvas = document.getElementById('canvas');
let gl = canvas.getContext('webgl2', { alpha: false, depth: true, antialias: true });
let isWebGL2 = !!gl;
if (!gl) {
    gl = canvas.getContext('webgl', { alpha: false, depth: true, antialias: true });
}

if (!gl) alert('WebGL não suportado.');

gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);
gl.enable(gl.CULL_FACE);

// --- Helpers de WebGL ---

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
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
gl.useProgram(prog);

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
    uTexture: gl.getUniformLocation(prog, 'uTexture')
};

function createBufferInfo(data) {
    let vao = null;
    if (isWebGL2) {
        vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
    } else {
        var ext = gl.getExtension("OES_vertex_array_object");
        if (ext) { vao = ext.createVertexArrayOES(); ext.bindVertexArrayOES(vao); }
    }

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(locs.aPos);
    gl.vertexAttribPointer(locs.aPos, 3, gl.FLOAT, false, 0, 0);

    if(data.normals && locs.aNorm !== -1) {
        const normBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
        gl.bufferData(gl.ARRAY_BUFFER, data.normals, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(locs.aNorm);
        gl.vertexAttribPointer(locs.aNorm, 3, gl.FLOAT, false, 0, 0);
    }

    if(data.texCoords && locs.aTexCoord !== -1) {
        const texBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
        gl.bufferData(gl.ARRAY_BUFFER, data.texCoords, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(locs.aTexCoord);
        gl.vertexAttribPointer(locs.aTexCoord, 2, gl.FLOAT, false, 0, 0);
    }

    let idxBuf = null;
    if(data.indices) {
        idxBuf = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
    }

    if (isWebGL2) gl.bindVertexArray(null);
    else if(gl.getExtension("OES_vertex_array_object")) gl.getExtension("OES_vertex_array_object").bindVertexArrayOES(null);

    return { vao, count: data.count, indices: !!data.indices };
}

// --- Criação de Geometria ---

function createCube() {
    const positions = [
        -1,-1,1, 1,-1,1, 1,1,1, -1,1,1, -1,-1,-1, -1,1,-1, 1,1,-1, 1,-1,-1,
        -1,1,-1, -1,1,1, 1,1,1, 1,1,-1, -1,-1,-1, 1,-1,-1, 1,-1,1, -1,-1,1,
        1,-1,-1, 1,1,-1, 1,1,1, 1,-1,1, -1,-1,-1, -1,-1,1, -1,1,1, -1,1,-1
    ];
    const normals = [
        0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
        0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
        1,0,0, 1,0,0, 1,0,0, 1,0,0, -1,0,0, -1,0,0, -1,0,0, -1,0,0
    ];
    const uvs = new Array(72).fill(0); 
    const indices = [
        0,1,2, 0,2,3, 4,5,6, 4,6,7, 8,9,10, 8,10,11,
        12,13,14, 12,14,15, 16,17,18, 16,18,19, 20,21,22, 20,22,23
    ];
    return { positions: new Float32Array(positions), normals: new Float32Array(normals), texCoords: new Float32Array(uvs), indices: new Uint16Array(indices), count: indices.length };
}

function createStarField(count) {
    const pos = [];
    for(let i=0; i<count; i++) {
        const r = 50.0 + Math.random() * 50.0; 
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        pos.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
    }
    return { positions: new Float32Array(pos), count: count };
}

// --- Setup da Cena ---

const cubeInfo = createBufferInfo(createCube());
const asteroidData = parseOBJString(asteroidOBJ);
const asteroidInfo = createBufferInfo(asteroidData);
const starsInfo = createBufferInfo(createStarField(2000));

const asteroidTex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, asteroidTex);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, createSpaceRockTexture());
gl.generateMipmap(gl.TEXTURE_2D);

const objects = [
    { type: 0, p: [0,-0.5,0], s: [25,1,25], c: [0.2,0.2,0.2], mesh: cubeInfo },
    { type: 0, p: [0,11.5,0], s: [25,1,25], c: [0.1,0.1,0.1], mesh: cubeInfo },
    { type: 0, p: [0,5.5,-12.5], s: [25,12,1], c: [0.15,0.15,0.2], mesh: cubeInfo },
    { type: 0, p: [0,5.5,12.5], s: [25,12,1], c: [0.15,0.15,0.2], mesh: cubeInfo },
    { type: 0, p: [-12.5,5.5,0], s: [1,12,25], c: [0.15,0.15,0.2], mesh: cubeInfo },
    { type: 0, p: [12.5,5.5,0], s: [1,12,25], c: [0.15,0.15,0.2], mesh: cubeInfo },
    { type: 1, p: [0, 3.5, 0], s: [8, 8, 8], c: [0,0,0], mesh: cubeInfo }, // Black Hole
    { type: 3, p: [0,0,0], s: [0.5,0.5,0.5], c: [1,1,0], mesh: asteroidInfo, isLight: true }, // Luz
    { type: 4, p: [0,0,0], s: [1,1,1], c: [1,1,1], mesh: starsInfo, isStars: true } // Estrelas
];

for(let i=0; i<8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const r = 6.0 + Math.random() * 2;
    objects.push({
        type: 2, 
        p: [Math.cos(angle)*r, 2.0 + Math.random()*3, Math.sin(angle)*r],
        s: [0.5, 0.5, 0.5],
        c: [0.8, 0.7, 0.6], 
        mesh: asteroidInfo,
        anim: { rot: Math.random(), speed: Math.random()*0.5 + 0.1, orbitSpeed: 0.2 + Math.random()*0.1, orbitR: r, orbitY: 2.0 + Math.random()*3 }
    });
}

// --- Input & Loop ---

const camera = { pos: [0, 1.7, 10], yaw: -Math.PI/2, pitch: 0 };
const keys = {};
let mouseLocked = false;

window.onkeydown = e => keys[e.key.toLowerCase()] = true;
window.onkeyup = e => keys[e.key.toLowerCase()] = false;

canvas.onclick = () => { 
    canvas.requestPointerLock(); 
    initSpaceAudio(); 
};

document.onpointerlockchange = () => mouseLocked = document.pointerLockElement === canvas;
document.onmousemove = e => {
    if(mouseLocked) {
        camera.yaw -= e.movementX * 0.002;
        camera.pitch = Math.max(-1.5, Math.min(1.5, camera.pitch - e.movementY * 0.002));
    }
};

function checkCol(p) {
    if(p[0]<-11 || p[0]>11 || p[2]<-11 || p[2]>11) return true; 
    if(Math.sqrt(p[0]*p[0] + (p[2])*(p[2])) < 2.0) return true;
    return false;
}

let lastTime = 0;
function render(now) {
    const dt = (now - lastTime)*0.001;
    lastTime = now;
    const timeSec = now * 0.001;

    if(mouseLocked) {
        const f = (keys['w']?1:0) - (keys['s']?1:0);
        const s = (keys['a']?1:0) - (keys['d']?1:0);
        if(f||s) {
            const spd = 5.0 * dt;
            const dx = Math.sin(camera.yaw)*f + Math.cos(camera.yaw)*s;
            const dz = Math.cos(camera.yaw)*f - Math.sin(camera.yaw)*s;
            const next = [camera.pos[0]+dx*spd, camera.pos[1], camera.pos[2]+dz*spd];
            if(!checkCol(next)) { camera.pos[0]=next[0]; camera.pos[2]=next[2]; }
        }
    }

    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const proj = Mat4.persp(Math.PI/3, canvas.width/canvas.height, 0.01, 100);
    const target = [
        camera.pos[0] + Math.sin(camera.yaw)*Math.cos(camera.pitch),
        camera.pos[1] + Math.sin(camera.pitch),
        camera.pos[2] + Math.cos(camera.yaw)*Math.cos(camera.pitch)
    ];
    const view = Mat4.look(camera.pos, target, [0,1,0]);
    
    const lightX = Math.sin(timeSec) * 5.0;
    const lightZ = Math.cos(timeSec) * 5.0;
    const lightPos = [lightX, 5.0, lightZ];

    gl.uniformMatrix4fv(locs.uProj, false, proj);
    gl.uniformMatrix4fv(locs.uView, false, view);
    gl.uniform3fv(locs.uViewPos, camera.pos);
    gl.uniform1f(locs.uTime, timeSec);
    gl.uniform3fv(locs.uLightPos, lightPos);
    gl.uniform1i(locs.uTexture, 0); 

    for(let o of objects) {
        let m = Mat4.identity();
        if (o.anim) {
            const angle = timeSec * o.anim.orbitSpeed;
            o.p[0] = Math.cos(angle) * o.anim.orbitR;
            o.p[2] = Math.sin(angle) * o.anim.orbitR;
            m = Mat4.translate(m, o.p);
            m = Mat4.rotateY(m, timeSec * o.anim.speed);
            m = Mat4.scale(m, o.s);
        } else if (o.isLight) {
            m = Mat4.translate(m, lightPos);
            m = Mat4.scale(m, o.s);
        } else {
            m = Mat4.translate(m, o.p);
            m = Mat4.scale(m, o.s);
        }

        gl.uniformMatrix4fv(locs.uModel, false, m);
        gl.uniform3fv(locs.uColor, o.c);
        gl.uniform1i(locs.uType, o.type);
        
        if (o.type == 1) { // Buraco Negro
            gl.depthMask(false);
            gl.disable(gl.CULL_FACE);
        } else {
            gl.depthMask(true);
            gl.enable(gl.CULL_FACE);
        }

        if (isWebGL2) gl.bindVertexArray(o.mesh.vao);
        else gl.getExtension("OES_vertex_array_object").bindVertexArrayOES(o.mesh.vao);
        
        if (o.type === 2) {
             gl.activeTexture(gl.TEXTURE0);
             gl.bindTexture(gl.TEXTURE_2D, asteroidTex);
        }

        if (o.mesh.indices) {
            gl.drawElements(gl.TRIANGLES, o.mesh.count, gl.UNSIGNED_SHORT, 0);
        } else {
            if (o.isStars) gl.drawArrays(gl.POINTS, 0, o.mesh.count);
            else gl.drawArrays(gl.TRIANGLES, 0, o.mesh.count);
        }
    }

    const dist = Math.sqrt(camera.pos[0]**2 + (camera.pos[2])**2);
    const info = document.getElementById('artwork-info');
    if(dist < 7.0) info.classList.add('visible');
    else info.classList.remove('visible');

    requestAnimationFrame(render);
}

window.onresize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
window.onresize();

setTimeout(() => document.getElementById('loading').classList.add('hidden'), 1500);
requestAnimationFrame(render);