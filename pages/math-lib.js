// --- Vector and Matrix Library ---

// --- Vector Constructors ---
function vec2(x, y) {
  if (typeof x === "object") return { x: x.x, y: x.y };
  if (typeof x === "number" && y === undefined) return { x, y: x };
  return { x: x || 0, y: y || 0 };
}

function vec3(x, y, z) {
  if (typeof x === "object") return { x: x.x, y: x.y, z: x.z };
  if (typeof x === "number" && y === undefined) return { x, y: x, z: x };
  return { x: x || 0, y: y || 0, z: z || 0 };
}

function vec4(x, y, z, w) {
  if (typeof x === "object") return { x: x.x, y: x.y, z: x.z, w: x.w };
  if (typeof x === "number" && y === undefined) return { x, y: x, z: x, w: x };
  return { x: x || 0, y: y || 0, z: z || 0, w: w || 0 };
}

// --- Matrix Constructors ---
// Matrices are stored in column-major order as flat arrays
function mat2(...args) {
  if (args.length === 1 && typeof args[0] === "number") {
    // from scalar
    return [args[0], 0, 0, args[0]];
  }
  if (args.length === 4) {
    // from 4 numbers
    return [args[0], args[1], args[2], args[3]];
  }
  if (args.length === 2) {
    // from 2 vec2s
    return [args[0].x, args[0].y, args[1].x, args[1].y];
  }
  return [1, 0, 0, 1]; // identity
}

function mat3(...args) {
  if (args.length === 1 && typeof args[0] === "number") {
    // from scalar
    return [args[0], 0, 0, 0, args[0], 0, 0, 0, args[0]];
  }
  if (args.length === 9) {
    // from 9 numbers
    return args;
  }
  if (args.length === 3) {
    // from 3 vec3s
    return [
      args[0].x,
      args[0].y,
      args[0].z,
      args[1].x,
      args[1].y,
      args[1].z,
      args[2].x,
      args[2].y,
      args[2].z,
    ];
  }
  return [1, 0, 0, 0, 1, 0, 0, 0, 1]; // identity
}

// --- Vector Operations ---
const add = (a, b) => {
  if (a.w !== undefined)
    return vec4(a.x + b.x, a.y + b.y, a.z + b.z, a.w + b.w);
  if (a.z !== undefined) return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
  return vec2(a.x + b.x, a.y + b.y);
};

const sub = (a, b) => {
  if (a.w !== undefined)
    return vec4(a.x - b.x, a.y - b.y, a.z - b.z, a.w - b.w);
  if (a.z !== undefined) return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
  return vec2(a.x - b.x, a.y - b.y);
};

const mul = (a, b) => {
  if (typeof b === "number") {
    if (a.w !== undefined) return vec4(a.x * b, a.y * b, a.z * b, a.w * b);
    if (a.z !== undefined) return vec3(a.x * b, a.y * b, a.z * b);
    return vec2(a.x * b, a.y * b);
  }
  if (a.w !== undefined)
    return vec4(a.x * b.x, a.y * b.y, a.z * b.z, a.w * b.w);
  if (a.z !== undefined) return vec3(a.x * b.x, a.y * b.y, a.z * b.z);
  return vec2(a.x * b.x, a.y * b.y);
};
const scale = mul; // alias

const div = (a, b) => {
  if (typeof b === "number") {
    if (a.w !== undefined) return vec4(a.x / b, a.y / b, a.z / b, a.w / b);
    if (a.z !== undefined) return vec3(a.x / b, a.y / b, a.z / b);
    return vec2(a.x / b, a.y / b);
  }
  if (a.w !== undefined)
    return vec4(a.x / b.x, a.y / b.y, a.z / b.z, a.w / b.w);
  if (a.z !== undefined) return vec3(a.x / b.x, a.y / b.y, a.z / b.z);
  return vec2(a.x / b.x, a.y / b.y);
};

const dot = (a, b) => {
  if (a.w !== undefined) return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  if (a.z !== undefined) return a.x * b.x + a.y * b.y + a.z * b.z;
  return a.x * b.x + a.y * b.y;
};

const cross = (a, b) => {
  return vec3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x
  );
};

const length = (a) => Math.sqrt(dot(a, a));

const distance = (a, b) => length(sub(a, b));

const normalize = (a) => {
  const l = length(a);
  return l > 0 ? div(a, l) : a;
};

const mix = (x, y, a) => {
  if (typeof a === "number") {
    return add(mul(x, 1.0 - a), mul(y, a));
  }
  // component-wise mix
  return add(mul(x, sub(vec2(1), a)), mul(y, a));
};

const step = (edge, x) => {
  if (typeof edge === "number") {
    if (x.w !== undefined)
      return vec4(
        x.x < edge ? 0 : 1,
        x.y < edge ? 0 : 1,
        x.z < edge ? 0 : 1,
        x.w < edge ? 0 : 1
      );
    if (x.z !== undefined)
      return vec3(x.x < edge ? 0 : 1, x.y < edge ? 0 : 1, x.z < edge ? 0 : 1);
    return vec2(x.x < edge ? 0 : 1, x.y < edge ? 0 : 1);
  }
  // component-wise
  if (x.w !== undefined)
    return vec4(
      x.x < edge.x ? 0 : 1,
      x.y < edge.y ? 0 : 1,
      x.z < edge.z ? 0 : 1,
      x.w < edge.w ? 0 : 1
    );
  if (x.z !== undefined)
    return vec3(
      x.x < edge.x ? 0 : 1,
      x.y < edge.y ? 0 : 1,
      x.z < edge.z ? 0 : 1
    );
  return vec2(x.x < edge.x ? 0 : 1, x.y < edge.y ? 0 : 1);
};

const clamp = (x, minVal, maxVal) => {
  if (x.w !== undefined)
    return vec4(
      Math.max(minVal, Math.min(maxVal, x.x)),
      Math.max(minVal, Math.min(maxVal, x.y)),
      Math.max(minVal, Math.min(maxVal, x.z)),
      Math.max(minVal, Math.min(maxVal, x.w))
    );
  if (x.z !== undefined)
    return vec3(
      Math.max(minVal, Math.min(maxVal, x.x)),
      Math.max(minVal, Math.min(maxVal, x.y)),
      Math.max(minVal, Math.min(maxVal, x.z))
    );
  return vec2(
    Math.max(minVal, Math.min(maxVal, x.x)),
    Math.max(minVal, Math.min(maxVal, x.y))
  );
};

const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
};

const fract = (x) => {
  if (typeof x === "number") return x - Math.floor(x);
  if (x.w !== undefined)
    return vec4(
      x.x - Math.floor(x.x),
      x.y - Math.floor(x.y),
      x.z - Math.floor(x.z),
      x.w - Math.floor(x.w)
    );
  if (x.z !== undefined)
    return vec3(
      x.x - Math.floor(x.x),
      x.y - Math.floor(x.y),
      x.z - Math.floor(x.z)
    );
  return vec2(x.x - Math.floor(x.x), x.y - Math.floor(x.y));
};

const mod = (x, y) => {
  if (typeof x === "number") return x - y * Math.floor(x / y);
  // vec mod
  return sub(x, mul(y, vec2(Math.floor(x.x / y.x), Math.floor(x.y / y.y))));
};

// --- Matrix Operations ---
function mult(a, b) {
  // mat2 * mat2
  if (a.length === 4 && b.length === 4) {
    const res = new Array(4);
    res[0] = a[0] * b[0] + a[2] * b[1];
    res[1] = a[1] * b[0] + a[3] * b[1];
    res[2] = a[0] * b[2] + a[2] * b[3];
    res[3] = a[1] * b[2] + a[3] * b[3];
    return res;
  }
  // mat2 * vec2
  if (a.length === 4 && b.y !== undefined) {
    return vec2(a[0] * b.x + a[2] * b.y, a[1] * b.x + a[3] * b.y);
  }
  // mat3 * mat3
  if (a.length === 9 && b.length === 9) {
    const res = new Array(9);
    res[0] = a[0] * b[0] + a[3] * b[1] + a[6] * b[2];
    res[1] = a[1] * b[0] + a[4] * b[1] + a[7] * b[2];
    res[2] = a[2] * b[0] + a[5] * b[1] + a[8] * b[2];
    res[3] = a[0] * b[3] + a[3] * b[4] + a[6] * b[5];
    res[4] = a[1] * b[3] + a[4] * b[4] + a[7] * b[5];
    res[5] = a[2] * b[3] + a[5] * b[4] + a[8] * b[5];
    res[6] = a[0] * b[6] + a[3] * b[7] + a[6] * b[8];
    res[7] = a[1] * b[6] + a[4] * b[7] + a[7] * b[8];
    res[8] = a[2] * b[6] + a[5] * b[7] + a[8] * b[8];
    return res;
  }
  // mat3 * vec3
  if (a.length === 9 && b.z !== undefined) {
    return vec3(
      a[0] * b.x + a[3] * b.y + a[6] * b.z,
      a[1] * b.x + a[4] * b.y + a[7] * b.z,
      a[2] * b.x + a[5] * b.y + a[8] * b.z
    );
  }
  return null;
}

function transpose(m) {
  if (m.length === 4) {
    return [m[0], m[2], m[1], m[3]];
  }
  if (m.length === 9) {
    return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
  }
  return null;
}

function inverse(m) {
  if (m.length === 4) {
    const det = m[0] * m[3] - m[2] * m[1];
    if (det === 0) return null;
    return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det];
  }
  if (m.length === 9) {
    const m00 = m[0],
      m01 = m[3],
      m02 = m[6];
    const m10 = m[1],
      m11 = m[4],
      m12 = m[7];
    const m20 = m[2],
      m21 = m[5],
      m22 = m[8];

    const b01 = m22 * m11 - m12 * m21;
    const b11 = -m22 * m10 + m12 * m20;
    const b21 = m21 * m10 - m11 * m20;

    const det = m00 * b01 + m01 * b11 + m02 * b21;
    if (det === 0) return null;

    return [
      b01 / det,
      (-m22 * m01 + m02 * m21) / det,
      (m12 * m01 - m02 * m11) / det,
      b11 / det,
      (m22 * m00 - m02 * m20) / det,
      (-m12 * m00 + m02 * m10) / det,
      b21 / det,
      (-m21 * m00 + m01 * m20) / det,
      (m11 * m00 - m01 * m10) / det,
    ];
  }
  return null;
}

const mathLib = {
  vec2,
  vec3,
  vec4,
  mat2,
  mat3,
  add,
  sub,
  mul,
  scale,
  div,
  dot,
  cross,
  length,
  distance,
  normalize,
  mix,
  step,
  smoothstep,
  clamp,
  fract,
  mod,
  mult,
  transpose,
  inverse,
};
