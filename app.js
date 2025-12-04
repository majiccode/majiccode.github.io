const routes = {
  "/": "pages/home.html",
  "/about": "pages/about.html",
  "/contact": "pages/contact.html",
  "/test": "pages/test.html",
  "/projects": "pages/projects.html",
  "/notebook": "pages/notebook.html",
  "/piano": "pages/piano.html",
};

// Create a PCG random number generator
function createPcgRandom(seed = 1) {
  let state = BigInt(seed);
  const multiplier = 6364136223846793005n;
  const increment = 1442695040888963407n;
  const mod = 2n ** 64n;
  const mod32 = 2 ** 32;

  return function () {
    const oldState = state;
    state = (oldState * multiplier + increment) % mod;

    const xorshifted = Number(((oldState >> 18n) ^ oldState) >> 27n);
    const rot = Number(oldState >> 59n);
    const result = (xorshifted >>> rot) | (xorshifted << (-rot & 31));

    return (result >>> 0) / mod32;
  };
}

const pcg = createPcgRandom(Date.now());

const app = document.getElementById("app");
const pageCache = {}; // To cache page content and scripts
let currentPage = null; // To track the current page

const router = async () => {
  const path = location.hash.slice(1) || "/";
  const pageName = path.substring(1) || "home";
  const route = routes[path];

  // Stop any running animation from the previous page
  if (
    currentPage &&
    window.pageAnimations &&
    window.pageAnimations[currentPage] &&
    typeof window.pageAnimations[currentPage].stop === "function"
  ) {
    window.pageAnimations[currentPage].stop();
  }

  // Hide all page containers
  Object.values(pageCache).forEach((p) => {
    if (p.container) {
      p.container.classList.add("page-hidden");
    }
  });

  if (pageCache[pageName]) {
    // Page is in cache, just show it
    pageCache[pageName].container.classList.remove("page-hidden");
    currentPage = pageName;
    // Restart animation if available
    if (
      window.pageAnimations &&
      window.pageAnimations[currentPage] &&
      typeof window.pageAnimations[currentPage].start === "function"
    ) {
      window.pageAnimations[currentPage].start();
    }
  } else if (route) {
    // Page not in cache, load it
    try {
      const response = await fetch(route);
      if (!response.ok) throw new Error(`Page not found: ${route}`);
      const html = await response.text();

      // Create a new container for the page
      const container = document.createElement("div");
      container.id = `${pageName}-container`;
      container.innerHTML = html;
      app.appendChild(container);

      pageCache[pageName] = { container };
      currentPage = pageName;

      // Load the corresponding script
      const scriptPath = route.replace(".html", ".js");
      const script = document.createElement("script");
      script.src = scriptPath;
      script.dataset.page = pageName; // Associate script with page
      document.body.appendChild(script);

      script.onload = () => {
        // Start animation if available
        if (
          window.pageAnimations &&
          window.pageAnimations[currentPage] &&
          typeof window.pageAnimations[currentPage].start === "function"
        ) {
          window.pageAnimations[currentPage].start();
        }
      };
    } catch (error) {
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
  const sparkleText = [
    "code",
    "hack",
    "0xFF",
    "0x90",
    "xor",
    "eax",
    "lulz",
    "pwn",
  ];
  const matrixLength = matrix.length;
  const sparkleTextLength = sparkleText.length;

  const font_size = 10;
  const circle_buffer_width = (canvas.width / font_size) | 0;
  const circle_buffer_height = (canvas.height / font_size) | 0;
  const columns = circle_buffer_width;
  const drops = [];
  const particles = [];
  const lines = [];
  const circle_buffer = new Int8Array(
    circle_buffer_width * circle_buffer_height
  );

  const maxParticles = 12;

  for (let x = 0; x < columns; x++) {
    drops[x] = 1;
  }
  for (let i = 0; i < drops.length; i++) {
    drops[i] = circle_buffer_height;
  }
  for (let i = 0; i < maxParticles; i++) {
    particles.push({
      x: pcg() * canvas.width,
      y: pcg() * canvas.height,
      radius: pcg() * 220 + 30,
      speed: pcg() * 10 + 1,
      dir: { x: pcg() - 0.5, y: pcg() - 0.5 },
    });
  }

  function plotPixel(x, y, v) {
    const sx = x | 0;
    const sy = y | 0;
    if (
      sx >= 0 &&
      sx < circle_buffer_width &&
      sy >= 0 &&
      sy < circle_buffer_height
    ) {
      const index = (sy * circle_buffer_width + sx) | 0;
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
    const cx = (centerX / font_size) | 0;
    const cy = (centerY / font_size) | 0;
    const r = (radius / font_size) | 0;

    let x = 0 | 0;
    let y = r | 0;
    let d = (3 - 2 * r) | 0;
    while (y >= x) {
      plotOctants(x, y, cx, cy);
      x++;
      if (d > 0) {
        y--;
        d = d + 4 * (x - y); // + 10;
      } else {
        d = d + 4 * x; // + 6;
      }
    }
  }
  const epsilon = 0.01;

  function line(x0, y0, x1, y1) {
    let cx0 = (x0 / font_size) | 0;
    let cy0 = (y0 / font_size) | 0;
    const cx1 = (x1 / font_size) | 0;
    const cy1 = (y1 / font_size) | 0;

    const dx = Math.abs(cx1 - cx0);
    const dy = Math.abs(cy1 - cy0);
    const sx = Math.sign(cx1 - cx0);
    const sy = Math.sign(cy1 - cy0);
    let err = dx - dy;

    while (true) {
      plotPixel(cx0, cy0, 2);

      if (Math.abs(cx0 - cx1) < epsilon && Math.abs(cy0 - cy1) < epsilon) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy0 += sy;
      }
    }
  }

  function drawCicleBuffer() {
    const blackFill = "rgba(0, 0, 0, 1)";
    const redFill = "rgba(122, 5, 5, 1)";
    const greenFill = "rgba(6, 46, 6, 1)";
    let currentFill = "";

    for (let y = 0; y < circle_buffer_height; y++) {
      for (let x = 0; x < circle_buffer_width; x++) {
        const index = (y * circle_buffer_width + x) | 0;
        const value = circle_buffer[index];

        if (value > 0) {
          const xx = (x * font_size) | 0;
          const yy = (y * font_size) | 0;

          if (currentFill !== blackFill) {
            ctx.fillStyle = blackFill;
            currentFill = blackFill;
          }
          ctx.fillRect(xx, yy, font_size, font_size);

          if (value === 2) {
            if (currentFill !== redFill) {
              ctx.fillStyle = redFill;
              currentFill = redFill;
            }
          } else {
            if (currentFill !== greenFill) {
              ctx.fillStyle = greenFill;
              currentFill = greenFill;
            }
          }

          const text = matrix[(pcg() * matrixLength) | 0];
          ctx.fillText(text, xx, yy + font_size);
        }
      }
    }
  }

  function rndInt(min, max) {
    return ((pcg() * (max - min + 1)) | 0) + min;
  }

  function draw(deltaTime) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = font_size + "px arial";

    circle_buffer.fill(0);

    for (let i = 0; i < maxParticles; i++) {
      const p = particles[i];
      p.x += p.dir.x * p.speed;
      p.y += p.dir.y * p.speed;
      if (p.x < 0 || p.x > canvas.width) p.dir.x *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dir.y *= -1;
      bresenhamCircle(p.x, p.y, p.radius);

      if (pcg() < 0.01) {
        p.dir.x = pcg() - 0.5;
        p.dir.y = pcg() - 0.5;
        p.radius = pcg() * 100 + 25;
      }
      if (rndInt(0, 1000) < 5) {
        p.radius += pcg() * 50 - 25;
      }

      if (rndInt(0, 1000) < 10) {
        ctx.fillStyle = "rgba(129, 199, 225, 0.75)";
        ctx.fillText(sparkleText[rndInt(0, sparkleTextLength - 1)], p.x, p.y);
      }
    }

    if (lines.length === 0 && rndInt(0, 100) < 10) {
      const numLines = rndInt(2, maxParticles);
      for (let i = 0; i < numLines; i++) {
        lines.push(rndInt(0, maxParticles - 1));
      }
    }

    if (lines.length >= 2) {
      for (let i = 0; i < lines.length - 1; i++) {
        const p1 = particles[lines[i]];
        const p2 = particles[lines[i + 1]];
        line(p1.x, p1.y, p2.x, p2.y);
      }
      if (rndInt(0, 1000) < 20) {
        lines.length = 0;
      }
    }

    const baseCol = "rgba(2, 67, 2, 1)";
    ctx.fillStyle = baseCol;

    drawCicleBuffer();
    for (let i = 0; i < drops.length; i++) {
      const text = matrix[(pcg() * matrixLength) | 0];

      const tx = i * font_size;
      const ty = drops[i] * font_size;

      ctx.fillText(text, tx, ty);

      const cx = (tx / font_size) | 0;
      const cy = (ty / font_size) | 0;

      if (
        cx >= 0 &&
        cx < circle_buffer_width &&
        cy >= 0 &&
        cy < circle_buffer_height
      ) {
        const index = (cy * circle_buffer_width + cx) | 0;
        if (circle_buffer[index] === 1) {
          ctx.fillStyle = "rgba(18, 215, 202, 1)";
          ctx.fillText(sparkleText[rndInt(0, sparkleTextLength - 1)], tx, ty);
          ctx.fillText(
            sparkleText[rndInt(0, sparkleTextLength - 1)],
            tx + font_size,
            ty + font_size
          );
          ctx.fillText(
            sparkleText[rndInt(0, sparkleTextLength - 1)],
            tx - font_size,
            ty + font_size
          );
        }
        if (circle_buffer[index] === 2) {
          ctx.fillStyle = "rgba(215, 18, 18, 1)";
          ctx.fillText("FF", tx + font_size, ty + font_size);
          ctx.fillText("90", tx - font_size, ty + font_size);
        }
      }
      ctx.fillStyle = baseCol;

      if (drops[i] * font_size > canvas.height && pcg() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }
  return { draw };
};

window.matrix = matrixEffect("fullscreen-matrix-canvas", "body");
