export function parseOBJString(objString) {
    const positions = [];
    const texCoords = [];
    const normals = [];
    const finalPos = [];
    const finalTex = [];
    const finalNorm = [];
    
    const lines = objString.split('\n');
    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('v ')) {
            const v = line.split(/\s+/);
            positions.push(parseFloat(v[1]), parseFloat(v[2]), parseFloat(v[3]));
        } else if (line.startsWith('vt ')) {
            const v = line.split(/\s+/);
            texCoords.push(parseFloat(v[1]), parseFloat(v[2]));
        } else if (line.startsWith('vn ')) {
            const v = line.split(/\s+/);
            normals.push(parseFloat(v[1]), parseFloat(v[2]), parseFloat(v[3]));
        } else if (line.startsWith('f ')) {
            const v = line.split(/\s+/);
            const numVerts = v.length - 1;
            for (let i = 0; i < numVerts - 2; i++) {
                const parts = [v[1], v[2+i], v[3+i]];
                for (let part of parts) {
                    const p = part.split('/');
                    const pi = (parseInt(p[0]) - 1) * 3;
                    const ti = (parseInt(p[1]) - 1) * 2;
                    const ni = (parseInt(p[2]) - 1) * 3;
                    finalPos.push(positions[pi], positions[pi+1], positions[pi+2]);
                    if (texCoords.length > 0) finalTex.push(texCoords[ti], texCoords[ti+1]);
                    else finalTex.push(0,0);
                    if (normals.length > 0) finalNorm.push(normals[ni], normals[ni+1], normals[ni+2]);
                    else finalNorm.push(0,1,0);
                }
            }
        }
    }
    return {
        positions: new Float32Array(finalPos),
        texCoords: new Float32Array(finalTex),
        normals: new Float32Array(finalNorm),
        count: finalPos.length / 3
    };
}

export function createSpaceRockTexture() {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#444';
    ctx.fillRect(0,0,size,size);
    for(let i=0; i<400; i++) {
        const x = Math.random()*size;
        const y = Math.random()*size;
        const r = Math.random()*10 + 2;
        ctx.beginPath();
        ctx.arc(x,y,r,0,Math.PI*2);
        ctx.fillStyle = `rgba(0,0,0,${Math.random()*0.3})`;
        ctx.fill();
    }
    for(let i=0; i<200; i++) {
        const x = Math.random()*size;
        const y = Math.random()*size;
        const r = Math.random()*4;
        ctx.fillStyle = `rgba(200,200,200,${Math.random()*0.2})`;
        ctx.fillRect(x,y,r,r);
    }
    return c;
}

export const asteroidOBJ = `
v -0.525731 0.000000 0.850651
v 0.525731 0.000000 0.850651
v -0.525731 0.000000 -0.850651
v 0.525731 0.000000 -0.850651
v 0.000000 0.850651 0.525731
v 0.000000 0.850651 -0.525731
v 0.000000 -0.850651 0.525731
v 0.000000 -0.850651 -0.525731
v 0.850651 0.525731 0.000000
v -0.850651 0.525731 0.000000
v 0.850651 -0.525731 0.000000
v -0.850651 -0.525731 0.000000
vt 0.0 0.0
vt 1.0 0.0
vt 1.0 1.0
vt 0.0 1.0
vn -0.525731 0.000000 0.850651
vn 0.525731 0.000000 0.850651
vn -0.525731 0.000000 -0.850651
vn 0.525731 0.000000 -0.850651
vn 0.000000 0.850651 0.525731
vn 0.000000 0.850651 -0.525731
vn 0.000000 -0.850651 0.525731
vn 0.000000 -0.850651 -0.525731
vn 0.850651 0.525731 0.000000
vn -0.850651 0.525731 0.000000
vn 0.850651 -0.525731 0.000000
vn -0.850651 -0.525731 0.000000
f 2/2/2 5/3/5 9/4/9
f 9/4/9 5/3/5 6/3/6
f 6/3/6 5/3/5 10/1/10
f 10/1/10 5/3/5 2/2/2
f 6/3/6 9/4/9 4/1/4
f 4/1/4 9/4/9 11/2/11
f 11/2/11 9/4/9 2/2/2
f 10/1/10 6/3/6 3/4/3
f 3/4/3 6/3/6 4/1/4
f 2/2/2 10/1/10 12/3/12
f 12/3/12 10/1/10 3/4/3
f 12/3/12 3/4/3 8/1/8
f 8/1/8 3/4/3 4/1/4
f 12/3/12 8/1/8 7/2/7
f 7/2/7 8/1/8 11/2/11
f 11/2/11 8/1/8 4/1/4
f 7/2/7 11/2/11 2/2/2
f 7/2/7 2/2/2 12/3/12
`;