const routes = {
  "/": "pages/home.html",
  "/about": "pages/about.html",
  "/contact": "pages/contact.html",
  "/test": "pages/test.html",
  "/projects": "pages/projects.html",
  "/notebook": "pages/notebook.html",
};

const app = document.getElementById("app");
let currentPage = null; // To track the current page animation

const router = async () => {
  // 1. Stop any running animation from the previous page
  if (
    currentPage &&
    window.pageAnimations &&
    window.pageAnimations[currentPage] &&
    typeof window.pageAnimations[currentPage].stop === "function"
  ) {
    window.pageAnimations[currentPage].stop();
  }

  // 2. Remove previously loaded dynamic scripts
  document
    .querySelectorAll("script[data-dynamic-script]")
    .forEach((s) => s.remove());

  const path = location.hash.slice(1) || "/";
  const route = routes[path];
  currentPage = path.substring(1) || "home"; // Update current page

  if (route) {
    try {
      const response = await fetch(route);
      if (!response.ok) throw new Error(`Page not found: ${route}`);
      const html = await response.text();
      app.innerHTML = html;

      // Automatically load the corresponding script
      const scriptPath = route.replace(".html", ".js");
      const script = document.createElement("script");
      script.src = scriptPath;
      script.setAttribute("data-dynamic-script", "true");
      document.body.appendChild(script);

      script.onload = () => {
        if (
          window.pageAnimations &&
          window.pageAnimations[currentPage] &&
          typeof window.pageAnimations[currentPage].start === "function"
        ) {
          window.pageAnimations[currentPage].start();
        }
      };
    } catch (error) {
      console.error("Routing error:", error);
      app.innerHTML = "<h1>404 - Not Found</h1>";
    }
  } else {
    app.innerHTML = "<h1>404 - Not Found</h1>";
  }
};

window.addEventListener("hashchange", router);
window.addEventListener("load", router);

window.addEventListener("load", router);

document.addEventListener("DOMContentLoaded", () => {
  const logo = document.querySelector(".logo");
  if (logo) {
    const logoText = logo.textContent;
    logo.innerHTML = logoText
      .split("")
      .map(
        (char, i) =>
          `<span style="animation-delay: ${
            i * 0.1
          }s" onmouseover="this.classList.add('glow')" onmouseout="this.classList.remove('glow')">${char}</span>`
      )
      .join("");
  }

  const logoLetters = logo.querySelectorAll("span");

  let lastTime = 0;
  let matrixTimer = 0;
  const matrixInterval = 33; // roughly 30fps

  let logoAnimationTimer = 0;
  const logoAnimationInterval = 2500; // ms to restart the whole sequence
  let nextLetterIndex = 0;
  let letterTimer = 0;
  const letterInterval = 100; // ms between each letter glowing

  function animate(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // Matrix effect update
    matrixTimer += deltaTime;
    if (matrixTimer > matrixInterval) {
      const matrix = window.matrix;
      if (matrix && typeof matrix.draw === "function") {
        matrix.draw(deltaTime);
      }
      matrixTimer = 0;
    }

    // Logo animation update
    logoAnimationTimer += deltaTime;
    if (logoAnimationTimer > logoAnimationInterval) {
      logoAnimationTimer = 0;
      nextLetterIndex = 0;
      letterTimer = 0;
    }

    if (nextLetterIndex < logoLetters.length) {
      letterTimer += deltaTime;
      if (letterTimer > letterInterval) {
        const letter = logoLetters[nextLetterIndex];
        if (letter) {
          letter.classList.add("glow");
          // Store the time when the glow should be removed
          letter.glowRemoveTime = timestamp + 300;
        }
        nextLetterIndex++;
        letterTimer = 0;
      }
    }

    // Check for letters that need the glow removed
    logoLetters.forEach((letter) => {
      if (letter.glowRemoveTime && timestamp >= letter.glowRemoveTime) {
        letter.classList.remove("glow");
        letter.glowRemoveTime = null;
      }
    });

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
});

const matrixEffect = (canvasId, containerSelector) => {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  //const ctx = canvas.getContext("2d", {
  //  willReadFrequently: true,
  //});
  const container = document.querySelector(containerSelector);

  canvas.width = container.offsetWidth;
  canvas.height = container.offsetHeight;

  const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%";
  const font_size = 10;

  const circle_buffer_width = canvas.width / font_size;
  const circle_buffer_height = canvas.height / font_size;
  const columns = canvas.width / font_size;
  const drops = [];
  const particles = [];
  const circle_buffer = new Int8Array(
    circle_buffer_width * circle_buffer_height
  );

  const maxParticles = 6;

  for (let x = 0; x < columns; x++) {
    drops[x] = 1;
  }
  for (let i = 0; i < drops.length; i++) {
    drops[i] = canvas.height / font_size;
  }
  for (let i = 0; i < maxParticles; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 50 + 75,
      speed: Math.random() * 4,
      dir: vec2(Math.random() - 0.5, Math.random() - 0.5),
    });
  }

  function plotPixel(x, y, v) {
    const sx = Math.floor(x) | 0;
    const sy = Math.floor(y) | 0;
    const index = (sy * circle_buffer_width + sx) | 0;
    if (
      sx >= 0 &&
      sx < circle_buffer_width &&
      sy >= 0 &&
      sy < circle_buffer_height
    ) {
      circle_buffer[index] = v;
    }
  }

  function plotOctants(x, y, centerX, centerY) {
    plotPixel(centerX + x, centerY + y, 1);
    plotPixel(centerX - x, centerY + y, 1);
    plotPixel(centerX + x, centerY - y, 1);
    plotPixel(centerX - x, centerY - y, 1);
    plotPixel(centerX + y, centerY + x, 1);
    plotPixel(centerX - y, centerY + x, 1);
    plotPixel(centerX + y, centerY - x, 1);
    plotPixel(centerX - y, centerY - x, 1);
  }

  function bresenhamCircle(centerX, centerY, radius) {
    centerX /= font_size;
    centerY /= font_size;
    radius /= font_size;
    centerX = Math.floor(centerX) | 0;
    centerY = Math.floor(centerY) | 0;
    radius = Math.floor(radius) | 0;
    let x = 0 | 0;
    let y = radius | 0;
    let d = (3 - 2 * radius) | 0;
    while (y > x) {
      x++;
      if (d > 0) {
        y--;
        d = (d + 4 * (x - y)) | 0;
      } else {
        d = (d + 4 * x) | 0;
      }
      plotOctants(x, y, centerX, centerY);
    }
  }
  const epsilon = 0.01;

  function line(x0, y0, x1, y1) {
    x0 /= font_size;
    y0 /= font_size;
    x1 /= font_size;
    y1 /= font_size;
    x0 = Math.floor(x0) | 0;
    y0 = Math.floor(y0) | 0;
    x1 = Math.floor(x1) | 0;
    y1 = Math.floor(y1) | 0;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = Math.sign(x1 - x0);
    const sy = Math.sign(y1 - y0);
    let err = dx - dy;

    while (true) {
      plotPixel(x0, y0, 2);

      if (Math.abs(x0 - x1) + Math.abs(y0 - y1) < epsilon) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  function drawCicleBuffer() {
    ctx.fillStyle = "rgba(3, 94, 3, 1)";
    for (let y = 0; y < circle_buffer_height; y++) {
      for (let x = 0; x < circle_buffer_width; x++) {
        const index = (y * circle_buffer_width + x) | 0;
        const xx = (x * font_size) | 0;
        const yy = (y * font_size) | 0;
        if (circle_buffer[index] > 0) {
          ctx.fillStyle = "rgba(0, 0, 0, 1)";
          ctx.fillRect(xx, yy, font_size, font_size);
          ctx.fillStyle = "rgba(5, 130, 5, 1)";
          const text = matrix[Math.floor(Math.random() * matrix.length)];
          ctx.fillText(text, xx, yy + font_size);
        }
      }
    }
  }

  function draw(deltaTime) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set the fill color to green
    ctx.fillStyle = "green";

    circle_buffer.fill(0);

    for (let i = 0; i < maxParticles; i++) {
      const p = particles[i];
      p.x += p.dir.x * p.speed;
      p.y += p.dir.y * p.speed;
      if (p.x < 0 || p.x > canvas.width) p.dir.x *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dir.y *= -1;
      bresenhamCircle(p.x, p.y, p.radius);
      if (Math.random() < 0.01) {
        p.dir = vec2(Math.random() - 0.5, Math.random() - 0.5);
      }
      // if (i > 0) {
      //   line(
      //     particles[i - 1].x,
      //     particles[i - 1].y,
      //     particles[i].x,
      //     particles[i].y
      //   );
      // }
    }

    ctx.fillStyle = "rgba(3, 94, 3, 1)";
    ctx.font = font_size + "px arial";

    drawCicleBuffer();
    for (let i = 0; i < drops.length; i++) {
      const text = matrix[Math.floor(Math.random() * matrix.length)];

      const tx = i * font_size;
      const ty = drops[i] * font_size;

      ctx.fillText(text, tx, ty);

      const cx = tx / font_size;
      const cy = ty / font_size;
      const index = (cy * circle_buffer_width + cx) | 0;
      if (circle_buffer[index] === 1) {
        ctx.fillStyle = "rgba(18, 215, 202, 1)";
        ctx.fillText("code", tx, ty);
        ctx.fillText("base", tx + font_size, ty + font_size);
        ctx.fillText("hack", tx - font_size, ty + font_size);
      }
      ctx.fillStyle = "rgba(3, 94, 3, 1)";

      if (drops[i] * font_size > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }
  return { draw };
};

window.matrix = matrixEffect("fullscreen-matrix-canvas", "body");
