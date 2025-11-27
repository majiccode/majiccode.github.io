const shaderPresets = {
  Default: `function main(x, y, width, height, time) {
  // Create a rotation matrix
  const angle = time * 0.5;
  const rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));

  // Normalize coordinates and apply rotation
  let uv = sub(vec2(x, y), vec2(width / 2, height / 2));
  uv = mult(rot, uv);
  uv = add(uv, vec2(width / 2, height / 2));
  uv = div(uv, vec2(width, height));

  // Animate colors
  const r = 0.5 + 0.5 * cos(time * 2.0 + uv.x * 10.0);
  const g = 0.5 + 0.5 * sin(time * 1.0 + uv.y * 10.0);
  const b = 0.5 + 0.5 * cos(time * 3.0 + (uv.x + uv.y) * 5.0);

  return vec4(0, g*0.2, 0, 1.0);
}`,

  "Raytraced Sphere": `function main(x, y, width, height, time) {
    const uv = div(sub(vec2(x, y), vec2(width/2, height/2)), min(width, height));

    const ro = vec3(0, 0, -3); // Ray origin
    const rd = normalize(vec3(uv.x, uv.y, 1)); // Ray direction

    const spherePos = vec3(sin(time), cos(time), 0);
    const sphereRad = 1.0;

    const oc = sub(ro, spherePos);
    const a = dot(rd, rd);
    const b = 2.0 * dot(oc, rd);
    const c = dot(oc, oc) - sphereRad*sphereRad;

    const disc = b*b - 4.0*a*c;

    if (disc < 0.0) {
        return vec4(0.1, 0.1, 0.2, 1.0); // Background
    }

    const t = (-b - sqrt(disc)) / (2.0 * a);

    if (t < 0.0) {
        return vec4(0.1, 0.1, 0.2, 1.0); // Background
    }

    const p = add(ro, mul(rd, t));
    const n = normalize(sub(p, spherePos));
    const lightDir = normalize(vec3(1, 1, -1));
    const diff = max(0.0, dot(n, lightDir));

    const col = mul(vec3(1, 0.5, 0.2), diff);
    return vec4(col.x, col.y, col.z, 1.0);
}`,

  "SDF Ray Marcher": `function main(x, y, width, height, time) {
    const uv = div(sub(vec2(x, y), vec2(width/2, height/2)), min(width, height));

    const ro = vec3(0, 1, -4);
    const rd = normalize(vec3(uv.x, uv.y, 1.0));

    // SDF functions
    const sdSphere = (p, r) => length(p) - r;
    const sdPlane = (p, n, h) => dot(p, n) + h;

    const map = (p) => {
        const sphereDist = sdSphere(sub(p, vec3(sin(time), 0.5, 0)), 1.0);
        const planeDist = sdPlane(p, vec3(0, 1, 0), 0.0);
        return min(sphereDist, planeDist);
    };

    let t = 0.0;
    for(let i=0; i<64; i++) {
        const p = add(ro, mul(rd, t));
        const d = map(p);
        if (d < 0.001) {
            const n = normalize(vec3(
                map(add(p, vec3(0.001, 0, 0))) - d,
                map(add(p, vec3(0, 0.001, 0))) - d,
                map(add(p, vec3(0, 0, 0.001))) - d
            ));
            const light = normalize(vec3(1, 1, -1));
            const diff = max(0.0, dot(n, light));
            return vec4(diff, diff, diff, 1.0);
        }
        t += d;
        if (t > 100.0) break;
    }

    return vec4(0.1, 0.1, 0.2, 1.0);
}`,

  Metaballs: `function main(x, y, width, height, time) {
    const uv = div(vec2(x, y), vec2(width, height));
    let sum = 0.0;

    const p1 = vec2(0.5 + 0.2 * sin(time), 0.5 + 0.2 * cos(time));
    let d = distance(uv, p1);
    sum += 0.1 / d;

    const p2 = vec2(0.5 + 0.2 * cos(time * 1.5), 0.5 + 0.2 * sin(time * 1.5));
    d = distance(uv, p2);
    sum += 0.1 / d;

    const col = vec3(sum * sum, sum, sum * 0.5);
    return vec4(col.x, col.y, col.z, 1.0);
}`,

  "Fire Effect": `function main(x, y, width, height, time) {
    const uv = div(vec2(x, y), vec2(width, height));
    
    const random = (v) => fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453);

    const noise = (p) => {
        const i = floor(p);
        const f = fract(p);
        const a = random(i);
        const b = random(add(i, vec2(1, 0)));
        const c = random(add(i, vec2(0, 1)));
        const d = random(add(i, vec2(1, 1)));
        const u = smoothstep(0.0, 1.0, f);
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    };

    const fbm = (p) => {
        let v = 0.0;
        let a = 0.5;
        let shift = vec2(100);
        for (let i = 0; i < 5; ++i) {
            v += a * noise(p);
            p = mul(p, 2.0);
            p = add(p, shift);
            a *= 0.5;
        }
        return v;
    };

    const q = fbm(add(uv, vec2(0.0, time * 0.2)));
    const r = fbm(add(add(uv, q), vec2(1.7, 9.2)));
    let f = fbm(add(uv, r));

    f = 1.0 - pow(f, 3.0);
    const col = mix(vec3(1.0, 0.5, 0.1), vec3(0.8, 0.0, 0.0), f);
    
    return vec4(col.x, col.y, col.z, 1.0);
}`,
};
