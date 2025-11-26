/*
This file contains the core logic for the live coding environment.
It checks the URL for a `?mode=webgl` parameter to decide which renderer to use.
The mode toggle checkbox now triggers a page reload to switch between modes.
This ensures that only one rendering context is ever requested from the canvas,
preventing the conflicts that were causing the WebGL initialization to fail.
*/
document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const canvas = document.getElementById("live-coding-canvas");
  const editor = document.getElementById("live-coding-editor");
  const runButton = document.getElementById("run-button");
  const loadingIndicator = document.getElementById("loading-indicator");
  const presetSelect = document.getElementById("preset-select");
  const modeToggle = document.getElementById("mode-toggle");
  const resolutionContainer = document.getElementById("resolution-container");
  const resolutionSelect = document.getElementById("resolution-select");
  const helpDialog = document.getElementById("help-dialog");
  const helpContent = document.getElementById("help-content");
  const closeHelpButton = document.getElementById("close-help");

  // --- State ---
  let animationFrameId;
  let renderer = {};

  // --- URL-based Mode Detection ---
  const urlParams = new URLSearchParams(window.location.search);
  const isWebGL = urlParams.get("mode") === "webgl";

  // --- 2D Canvas / Worker Setup ---
  function setup2D() {
    const mainCtx = canvas.getContext("2d");
    // Disable image smoothing for a crisp, pixelated look when scaling up
    mainCtx.imageSmoothingEnabled = false;

    const offscreenCanvas = document.createElement("canvas");
    const offscreenCtx = offscreenCanvas.getContext("2d", {
      willReadFrequently: true,
    });

    const shaderWorker = new Worker("shader-worker.js");
    let userShader = true;
    let startTime = Date.now();
    let resolutionMultiplier = parseFloat(resolutionSelect.value);

    function resizeAndRestart() {
      const renderWidth = Math.floor(window.innerWidth * resolutionMultiplier);
      const renderHeight = Math.floor(
        window.innerHeight * resolutionMultiplier
      );
      offscreenCanvas.width = renderWidth;
      offscreenCanvas.height = renderHeight;
    }

    shaderWorker.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === "renderComplete") {
        offscreenCtx.putImageData(payload.imageData, 0, 0);
        // Draw the small canvas onto the large one, letting the GPU do the scaling.
        mainCtx.drawImage(offscreenCanvas, 0, 0, canvas.width, canvas.height);
        animationFrameId = requestAnimationFrame(animate);
      } else if (type === "compileSuccess") {
        loadingIndicator.style.display = "none";
        userShader = true;
      } else if (type === "compileError") {
        loadingIndicator.style.display = "none";
        alert("Error in your JS shader: " + payload.message);
        userShader = null;
      }
    };

    function animate() {
      const currentTime = (Date.now() - startTime) / 1000;
      if (userShader) {
        const imageData = offscreenCtx.getImageData(
          0,
          0,
          offscreenCanvas.width,
          offscreenCanvas.height
        );
        shaderWorker.postMessage(
          {
            type: "render",
            payload: {
              imageData,
              width: offscreenCanvas.width,
              height: offscreenCanvas.height,
              time: currentTime,
            },
          },
          [imageData.data.buffer]
        );
      } else {
        // If there's no valid shader, just clear the screen and keep the loop going.
        mainCtx.fillStyle = "black";
        mainCtx.fillRect(0, 0, canvas.width, canvas.height);
        animationFrameId = requestAnimationFrame(animate);
      }
    }

    resolutionSelect.addEventListener("change", () => {
      resolutionMultiplier = parseFloat(resolutionSelect.value);
      resizeAndRestart();
    });

    return {
      run: () => {
        shaderWorker.postMessage({
          type: "updateCode",
          payload: { code: editor.value },
        });
        loadingIndicator.style.display = "block";
      },
      start: () => {
        startTime = Date.now();
        animate();
      },
      stop: () => {
        cancelAnimationFrame(animationFrameId);
        shaderWorker.terminate();
      },
      resize: resizeAndRestart,
    };
  }

  // --- WebGL Setup ---
  function setupWebGL() {
    const contextAttributes = {
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: false,
      antialias: false,
      depth: false,
      stencil: false,
    };
    const gl =
      canvas.getContext("webgl", contextAttributes) ||
      canvas.getContext("experimental-webgl", contextAttributes);

    if (!gl) {
      alert("WebGL initialization failed. Switching back to 2D mode.");
      // Force reload to 2D mode if WebGL fails
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("mode");
      window.location.href = newUrl.href;
      return null;
    }

    let program;
    let startTime = Date.now();

    const vertexShaderSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    function createShader(gl, type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error =
          "Error compiling GLSL shader: " + gl.getShaderInfoLog(shader);
        alert(error);
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    function createProgram(gl, vertexShader, fragmentShader) {
      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const error =
          "Error linking GLSL program: " + gl.getProgramInfoLog(program);
        alert(error);
        gl.deleteProgram(program);
        return null;
      }
      return program;
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    function animate() {
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.useProgram(program);

      const timeLocation = gl.getUniformLocation(program, "u_time");
      gl.uniform1f(timeLocation, (Date.now() - startTime) / 1000);
      const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
      gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

      const positionAttributeLocation = gl.getAttribLocation(
        program,
        "a_position"
      );
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(
        positionAttributeLocation,
        2,
        gl.FLOAT,
        false,
        0,
        0
      );
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationFrameId = requestAnimationFrame(animate);
    }

    function resizeAndRestart() {
      // WebGL viewport is handled automatically on resize event
    }

    return {
      run: () => {
        loadingIndicator.style.display = "block";
        const vertexShader = createShader(
          gl,
          gl.VERTEX_SHADER,
          vertexShaderSource
        );
        const fragmentShader = createShader(
          gl,
          gl.FRAGMENT_SHADER,
          editor.value
        );

        if (vertexShader && fragmentShader) {
          const newProgram = createProgram(gl, vertexShader, fragmentShader);
          if (newProgram) {
            if (program) {
              gl.deleteProgram(program);
            }
            program = newProgram;
          }
        }
        loadingIndicator.style.display = "none";
      },
      start: () => {
        startTime = Date.now();
        animate();
      },
      stop: () => {
        cancelAnimationFrame(animationFrameId);
      },
      resize: resizeAndRestart,
    };
  }

  // --- Help Dialog Content ---
  function generateCanvasHelp() {
    const mathFunctions = Object.getOwnPropertyNames(Math)
      .filter((p) => typeof Math[p] === "function")
      .map((f) => `<li><code>${f}</code></li>`)
      .join("");
    const mathConstants = Object.getOwnPropertyNames(Math)
      .filter((p) => typeof Math[p] !== "function")
      .map((c) => `<li><code>${c}</code></li>`)
      .join("");
    const libFunctions = Object.keys(mathLib)
      .map((f) => `<li><code>${f}</code></li>`)
      .join("");

    return `
      <h3>Shader Entry Point</h3>
      <ul><li><code>function main(x, y, width, height, time)</code></li></ul>
      <p>Must return a <code>vec4</code>.</p>
      
      <h3>Built-in Math Functions</h3>
      <ul>${mathFunctions}</ul>
      
      <h3>Built-in Math Constants</h3>
      <ul>${mathConstants}</ul>

      <h3>Vector/Matrix Library</h3>
      <ul>${libFunctions}</ul>
    `;
  }

  function generateWebGLHelp() {
    const uniforms = `<li><code>uniform float u_time;</code></li><li><code>uniform vec2 u_resolution;</code></li>`;
    const varyings = `<li><code>varying vec2 v_texCoord;</code></li>`;
    const functions = [
      "sin",
      "cos",
      "tan",
      "asin",
      "acos",
      "atan",
      "pow",
      "exp",
      "log",
      "exp2",
      "log2",
      "sqrt",
      "inversesqrt",
      "abs",
      "sign",
      "floor",
      "ceil",
      "fract",
      "mod",
      "min",
      "max",
      "clamp",
      "mix",
      "step",
      "smoothstep",
      "length",
      "distance",
      "dot",
      "cross",
      "normalize",
      "faceforward",
      "reflect",
      "refract",
      "matrixCompMult",
      "lessThan",
      "lessThanEqual",
      "greaterThan",
      "greaterThanEqual",
      "equal",
      "notEqual",
      "any",
      "all",
      "not",
    ]
      .map((f) => `<li><code>${f}</code></li>`)
      .join("");
    const types = ["vec2", "vec3", "vec4", "mat2", "mat3", "mat4"]
      .map((t) => `<li><code>${t}</code></li>`)
      .join("");

    return `
      <h3>Shader Entry Point</h3>
      <p>Set the final color using <code>gl_FragColor = vec4(r, g, b, a);</code></p>

      <h3>Uniforms</h3>
      <ul>${uniforms}</ul>

      <h3>Varyings</h3>
      <ul>${varyings}</ul>
      
      <h3>Built-in Functions</h3>
      <ul>${functions}</ul>

      <h3>Types</h3>
      <ul>${types}</ul>
    `;
  }

  // --- UI and Mode Management ---
  function updatePresets(isWebGLMode) {
    presetSelect.innerHTML = "";
    const presets = isWebGLMode ? glslPresets : shaderPresets;
    for (const name in presets) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      presetSelect.appendChild(option);
    }
    editor.value = presets["Default"];
  }

  // --- Event Listeners ---
  runButton.addEventListener("click", () => {
    if (renderer.run) renderer.run();
  });

  modeToggle.addEventListener("change", () => {
    const newUrl = new URL(window.location.href);
    if (modeToggle.checked) {
      newUrl.searchParams.set("mode", "webgl");
    } else {
      newUrl.searchParams.delete("mode");
    }
    window.location.href = newUrl.href;
  });

  presetSelect.addEventListener("change", (e) => {
    const presets = isWebGL ? glslPresets : shaderPresets;
    const presetName = e.target.value;
    if (presets[presetName]) {
      editor.value = presets[presetName];
      runButton.click();
    }
  });

  editor.addEventListener("keydown", function (e) {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = this.selectionStart;
      const end = this.selectionEnd;
      this.value =
        this.value.substring(0, start) + "  " + this.value.substring(end);
      this.selectionStart = this.selectionEnd = start + 2;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runButton.click();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "F1") {
      e.preventDefault();
      editor.classList.toggle("editor-transparent");
    }
    if (e.key === "F10") {
      e.preventDefault();
      helpContent.innerHTML = isWebGL
        ? generateWebGLHelp()
        : generateCanvasHelp();
      helpDialog.classList.add("visible");
    }
  });

  closeHelpButton.addEventListener("click", () => {
    helpDialog.classList.remove("visible");
  });

  helpDialog.addEventListener("click", (e) => {
    if (e.target === helpDialog) {
      helpDialog.classList.remove("visible");
    }
  });

  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (renderer.resize) {
      renderer.resize();
    }
  });

  // --- Initial Setup ---
  modeToggle.checked = isWebGL;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  if (isWebGL) {
    renderer = setupWebGL();
  } else {
    resolutionContainer.style.display = "block";
    renderer = setup2D();
  }

  // If renderer failed to initialize (e.g. WebGL failed and reloaded), this will stop further execution.
  if (!renderer) return;

  updatePresets(isWebGL);
  renderer.run();
  renderer.start();
});
