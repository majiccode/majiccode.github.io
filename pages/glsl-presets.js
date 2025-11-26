const glslPresets = {
  Default: `precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    
    float color = 0.0;
    // Rotate uv
    float angle = u_time * 0.5;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    uv = rot * (uv - 0.5) + 0.5;

    vec3 col = vec3(0.5 + 0.5 * cos(u_time * 2.0 + uv.x * 10.0),
                    0.5 + 0.5 * sin(u_time * 1.0 + uv.y * 10.0),
                    0.5 + 0.5 * cos(u_time * 3.0 + (uv.x + uv.y) * 5.0));

    gl_FragColor = vec4(col,1.0);
}`,

  "Raytraced Sphere": `precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;

// Ray-sphere intersection
float intersectSphere(vec3 ro, vec3 rd, vec3 sp, float r) {
    vec3 oc = ro - sp;
    float b = dot(oc, rd);
    float c = dot(oc, oc) - r*r;
    float h = b*b - c;
    if (h < 0.0) return -1.0;
    return -b - sqrt(h);
}

// Calculate normal for a point on a sphere
vec3 normalSphere(vec3 p, vec3 sp) {
    return normalize(p - sp);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    
    vec3 ro = vec3(0.0, 0.0, -3.0);
    vec3 rd = normalize(vec3(uv, 1.0));

    vec3 spherePos = vec3(sin(u_time), cos(u_time), 0.0);
    float sphereRad = 1.0;

    float t = intersectSphere(ro, rd, spherePos, sphereRad);

    if (t > 0.0) {
        vec3 p = ro + rd * t;
        vec3 n = normalSphere(p, spherePos);
        vec3 lightDir = normalize(vec3(1.0, 1.0, -1.0));
        float diff = max(0.0, dot(n, lightDir));
        vec3 col = vec3(1.0, 0.5, 0.2) * diff;
        gl_FragColor = vec4(col, 1.0);
    } else {
        gl_FragColor = vec4(0.1, 0.1, 0.2, 1.0);
    }
}`,

  "SDF Ray Marcher": `precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdPlane(vec3 p, vec4 n) {
    return dot(p, n.xyz) + n.w;
}

float map(vec3 p) {
    float sphereDist = sdSphere(p - vec3(sin(u_time), 0.5, 0.0), 1.0);
    float planeDist = sdPlane(p, vec4(0.0, 1.0, 0.0, 0.0));
    return min(sphereDist, planeDist);
}

vec3 calcNormal(vec3 p) {
    const float eps = 0.001;
    return normalize(vec3(
        map(p + vec3(eps, 0, 0)) - map(p - vec3(eps, 0, 0)),
        map(p + vec3(0, eps, 0)) - map(p - vec3(0, eps, 0)),
        map(p + vec3(0, 0, eps)) - map(p - vec3(0, 0, eps))
    ));
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    
    vec3 ro = vec3(0.0, 1.0, -4.0);
    vec3 rd = normalize(vec3(uv, 1.0));

    float t = 0.0;
    for (int i = 0; i < 64; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        if (d < 0.001) {
            vec3 n = calcNormal(p);
            vec3 light = normalize(vec3(1.0, 1.0, -1.0));
            float diff = max(0.0, dot(n, light));
            gl_FragColor = vec4(vec3(diff), 1.0);
            return;
        }
        t += d;
        if (t > 100.0) break;
    }

    gl_FragColor = vec4(0.1, 0.1, 0.2, 1.0);
}`,

  Metaballs: `precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float sum = 0.0;

    vec2 p1 = vec2(0.5 + 0.2 * sin(u_time), 0.5 + 0.2 * cos(u_time));
    sum += 0.1 / distance(uv, p1);

    vec2 p2 = vec2(0.5 + 0.2 * cos(u_time * 1.5), 0.5 + 0.2 * sin(u_time * 1.5));
    sum += 0.1 / distance(uv, p2);

    vec3 col = vec3(sum * sum, sum, sum * 0.5);
    gl_FragColor = vec4(col, 1.0);
}`,

  "Fire Effect": `precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    for (int i = 0; i < 5; ++i) {
        v += a * noise(p);
        p = p * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    
    vec2 q = vec2(fbm(uv + vec2(0.0, u_time * 0.2)),
                  fbm(uv + vec2(5.2, 1.3)));

    vec2 r = vec2(fbm(uv + q + vec2(1.7, 9.2)),
                  fbm(uv + q + vec2(8.3, 2.8)));

    float f = fbm(uv + r);

    f = 1.0 - pow(f, 3.0);
    vec3 col = mix(vec3(1.0, 0.5, 0.1), vec3(0.8, 0.0, 0.0), f);

    gl_FragColor = vec4(col, 1.0);
}`,
};
