export const vsSource = `
    attribute vec3 aPos;
    attribute vec3 aNorm;
    attribute vec2 aTexCoord; 
    
    uniform mat4 uModel;
    uniform mat4 uView;
    uniform mat4 uProj;
    uniform vec3 uViewPos;
    
    varying vec3 vWorldPos;
    varying vec3 vNorm;
    varying vec2 vTexCoord;
    
    void main() {
        vec4 worldPos = uModel * vec4(aPos, 1.0);
        vWorldPos = worldPos.xyz;
        vNorm = mat3(uModel) * aNorm; 
        vTexCoord = aTexCoord;
        gl_Position = uProj * uView * worldPos;

        float dist = length(uViewPos - worldPos.xyz);
        gl_PointSize = 400.0 / dist;
    }
`;

export const fsSource = `
    precision highp float;
    
    varying vec3 vWorldPos;
    varying vec3 vNorm;
    varying vec2 vTexCoord;
    
    uniform vec3 uViewPos;
    uniform vec3 uColor;
    uniform float uTime;
    uniform vec3 uLightPos;
    uniform sampler2D uTexture;
    uniform int uType; // 0=Sala, 1=Buraco Negro, 2=Asteroide, 3=Luz, 4=Estrelas
    
    // --- Noise Functions ---
    float hash(float n) { return fract(sin(n) * 43758.5453123); }
    float noise(vec3 x) {
        vec3 p = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        float n = p.x + p.y * 57.0 + 113.0 * p.z;
        return mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
                       mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
                   mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                       mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z);
    }
    float fbm(vec3 p) {
        float f = 0.0;
        f += 0.5000 * noise(p); p *= 2.02;
        f += 0.2500 * noise(p); p *= 2.03;
        f += 0.1250 * noise(p);
        return f;
    }

    void main() {
        // TIPO 4: Estrelas
        if (uType == 4) {
            vec2 circCoord = 2.0 * gl_PointCoord - 1.0;
            float alpha = 1.0 - dot(circCoord, circCoord);
            if (alpha < 0.0) discard;
            float twinkle = 0.5 + 0.5 * sin(uTime * 5.0 + gl_FragCoord.x);
            gl_FragColor = vec4(vec3(1.0) * twinkle, alpha);
            return;
        }
        // TIPO 3: Luz
        if (uType == 3) {
            gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
            return;
        }

        vec3 norm = normalize(vNorm);
        vec3 viewDir = normalize(uViewPos - vWorldPos);
        vec3 lightDir = normalize(uLightPos - vWorldPos);

        // TIPO 2: Asteroide
        if (uType == 2) {
            vec3 ambient = 0.2 * uColor;
            float diff = max(dot(norm, lightDir), 0.0);
            vec3 diffuse = diff * uColor;
            vec3 reflectDir = reflect(-lightDir, norm);
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
            vec3 specular = vec3(0.5) * spec;
            vec4 texColor = texture2D(uTexture, vTexCoord);
            vec3 result = (ambient + diffuse + specular) * texColor.rgb;
            gl_FragColor = vec4(result, 1.0);
            return;
        }

        // TIPO 0: Sala
        if (uType == 0) {
            float diff = max(dot(norm, lightDir), 0.0);
            vec3 ambient = uColor * 0.1;
            vec3 diffuse = diff * uColor;
            float grid = step(0.98, fract(vWorldPos.x)) + step(0.98, fract(vWorldPos.z)) + step(0.98, fract(vWorldPos.y));
            vec3 finalColor = ambient + diffuse + (vec3(0.1) * grid);
            gl_FragColor = vec4(finalColor, 1.0);
            return;
        }

        // TIPO 1: Buraco Negro + JATOS RELATIVÍSTICOS
        vec3 ro = uViewPos; 
        vec3 rd = normalize(vWorldPos - ro); 
        vec3 bhCenter = vec3(0.0, 3.5, 0.0);
        
        vec3 col = vec3(0.0);
        float totalDensity = 0.0;
        vec3 p = ro; 
        
        // Otimização
        float distToBox = length(p - bhCenter) - 9.0;
        if (distToBox > 0.0) p += rd * distToBox;

        float schwarzschildRadius = 0.8; 
        float eventHorizon = schwarzschildRadius * 1.2; 
        float accretionDiskRadius = 4.5;
        
        for(int i = 0; i < 150; i++) {
            p += rd * 0.15; 
            float distToCenter = length(p - bhCenter);
            
            // --- 1. Horizonte de Eventos ---
            if (distToCenter < eventHorizon) {
                col = vec3(0.0);
                totalDensity = 100.0; 
                break; 
            }
            
            vec3 q = p - bhCenter;
            float distY = abs(q.y);
            float distR = length(q.xz);

            // --- 2. JATOS RELATIVÍSTICOS ---
            float jetWidth = 0.3 + distY * 0.15;
            
            if (distR < jetWidth && distY > 1.0) { 
                float jetDens = 1.0 - (distR / jetWidth);
                jetDens = pow(jetDens, 2.0); 

                vec3 jetNoisePos = q * 2.5; 
                jetNoisePos.y -= uTime * 8.0 * sign(q.y); 
                
                float jetNoise = fbm(jetNoisePos);
                float attenuation = 1.0 / (1.0 + distY * 0.3);
                
                vec3 jetColor = vec3(0.2, 0.6, 1.0) * 1.5; 
                
                float stepJet = jetDens * jetNoise * attenuation * 0.3;
                col += jetColor * stepJet * (1.0 - min(totalDensity, 1.0));
                totalDensity += stepJet;
            }

            // --- 3. Disco de Acreção ---
            if (distR < accretionDiskRadius && distR > eventHorizon * 1.5 && distY < 1.0) {
                float density = (1.0 - smoothstep(eventHorizon * 1.5, accretionDiskRadius, distR));
                density *= exp(-distY * 3.0); 
                
                vec3 noisePos = p * 1.5;
                float angle = atan(p.z - bhCenter.z, p.x - bhCenter.x);
                float rotSpeed = 3.0;
                noisePos.x += cos(angle + uTime * rotSpeed); 
                noisePos.z += sin(angle + uTime * rotSpeed);
                
                float noiseVal = fbm(noisePos + uTime);
                
                vec2 dirToCenter = normalize(p.xz - bhCenter.xz);
                float doppler = 1.0 + 0.5 * dot(dirToCenter, vec2(1.0, 0.0));
                
                vec3 plasmaColor = vec3(1.0, 0.5, 0.1) * density * noiseVal * 4.0;
                plasmaColor += vec3(1.0, 0.9, 0.8) * pow(density, 4.0); 
                
                float stepDensity = density * 0.15 * doppler;
                col += plasmaColor * stepDensity * (1.0 - min(totalDensity, 1.0));
                totalDensity += stepDensity;
            }
            if (totalDensity >= 1.0 || distToCenter > 12.0) break;
        }
        
        col = col / (1.0 + col);
        col = pow(col, vec3(0.45));
        float alpha = smoothstep(0.0, 0.2, totalDensity);
        gl_FragColor = vec4(col, alpha); 
    }
`;