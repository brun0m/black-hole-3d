export function sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
export function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
export function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
export function norm(a){let l=Math.sqrt(dot(a,a)); return[a[0]/l,a[1]/l,a[2]/l]}

export const Mat4 = {
    persp: (fov, asp, n, f) => {
        const a = 1/Math.tan(fov/2);
        return new Float32Array([a/asp,0,0,0, 0,a,0,0, 0,0,(f+n)/(n-f),-1, 0,0,2*f*n/(n-f),0]);
    },
    look: (eye, center, up) => {
        const z = norm(sub(eye, center));
        const x = norm(cross(up, z));
        const y = cross(z, x);
        return new Float32Array([
            x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
            -dot(x,eye), -dot(y,eye), -dot(z,eye), 1
        ]);
    },
    identity: () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
    translate: (m, v) => {
        m[12] = m[0]*v[0] + m[4]*v[1] + m[8]*v[2] + m[12];
        m[13] = m[1]*v[0] + m[5]*v[1] + m[9]*v[2] + m[13];
        m[14] = m[2]*v[0] + m[6]*v[1] + m[10]*v[2] + m[14];
        m[15] = m[3]*v[0] + m[7]*v[1] + m[11]*v[2] + m[15];
        return m;
    },
    scale: (m, v) => {
        m[0]*=v[0]; m[4]*=v[1]; m[8]*=v[2];
        m[1]*=v[0]; m[5]*=v[1]; m[9]*=v[2];
        m[2]*=v[0]; m[6]*=v[1]; m[10]*=v[2];
        m[3]*=v[0]; m[7]*=v[1]; m[11]*=v[2];
        return m;
    },
    rotateY: (m, angle) => {
        const c = Math.cos(angle), s = Math.sin(angle);
        const m0=m[0], m4=m[4], m8=m[8];
        const m2=m[2], m6=m[6], m10=m[10];
        m[0] = c*m0 - s*m2; m[4] = c*m4 - s*m6; m[8] = c*m8 - s*m10;
        m[2] = c*m2 + s*m0; m[6] = c*m6 + s*m4; m[10] = c*m10 + s*m0;
        return m;
    }
};