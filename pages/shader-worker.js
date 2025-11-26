importScripts("math-lib.js");

let userShader = null;

// --- Pre-compute function lists for performance ---
const mathProperties = Object.getOwnPropertyNames(Math);
const mathValues = mathProperties.map((key) => Math[key]);
const libProperties = Object.keys(mathLib);
const libValues = libProperties.map((key) => mathLib[key]);
const allProperties = [...mathProperties, ...libProperties];
const allValues = [...mathValues, ...libValues];

self.onmessage = function (e) {
  const { type, payload } = e.data;

  if (type === "updateCode") {
    try {
      const userCode = payload.code + "\nreturn main;";
      const userFunctionFactory = new Function(...allProperties, userCode);
      userShader = userFunctionFactory(...allValues);
      self.postMessage({ type: "compileSuccess" });
    } catch (err) {
      self.postMessage({
        type: "compileError",
        payload: { message: err.message },
      });
    }
  } else if (type === "render") {
    if (!userShader) {
      return;
    }

    const { imageData, width, height, time } = payload;
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const result = userShader(x, y, width, height, time);
        const index = (y * width + x) * 4;
        data[index] = result.x * 255;
        data[index + 1] = result.y * 255;
        data[index + 2] = result.z * 255;
        data[index + 3] = (result.w !== undefined ? result.w : 1.0) * 255;
      }
    }

    self.postMessage({ type: "renderComplete", payload: { imageData } }, [
      imageData.data.buffer,
    ]);
  }
};
