const routes = {
  "/": "pages/home.html",
  "/about": "pages/about.html",
  "/contact": "pages/contact.html",
  "/test": "pages/test.html",
  "/projects": "pages/projects.html",
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

      app.innerHTML = ""; // Clear previous content

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      Array.from(doc.body.childNodes).forEach((node) => {
        if (node.nodeName === "SCRIPT") {
          const script = document.createElement("script");
          script.setAttribute("data-dynamic-script", "true"); // Mark as dynamic

          if (node.src) {
            // Re-create the src to ensure it's correctly resolved
            const scriptURL = new URL(
              node.getAttribute("src"),
              window.location.href
            );
            script.src = scriptURL.href;
            // Start animation after script loads
            script.onload = () => {
              if (
                window.pageAnimations &&
                window.pageAnimations[currentPage] &&
                typeof window.pageAnimations[currentPage].start === "function"
              ) {
                window.pageAnimations[currentPage].start();
              }
            };
          } else {
            script.textContent = node.textContent;
          }
          // Append to body to ensure execution
          document.body.appendChild(script);

          // For inline scripts, start animation immediately after append
          if (!node.src) {
            if (
              window.pageAnimations &&
              window.pageAnimations[currentPage] &&
              typeof window.pageAnimations[currentPage].start === "function"
            ) {
              window.pageAnimations[currentPage].start();
            }
          }
        } else {
          app.appendChild(node.cloneNode(true));
        }
      });
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
        matrix.draw();
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
  const container = document.querySelector(containerSelector);

  canvas.width = container.offsetWidth;
  canvas.height = container.offsetHeight;

  const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%";
  const font_size = 10;
  const columns = canvas.width / font_size;
  const drops = [];

  for (let x = 0; x < columns; x++) {
    drops[x] = 1;
  }

  function draw() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0F0";
    ctx.font = font_size + "px arial";

    for (let i = 0; i < drops.length; i++) {
      const text = matrix[Math.floor(Math.random() * matrix.length)];
      ctx.fillText(text, i * font_size, drops[i] * font_size);

      if (drops[i] * font_size > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }
  return { draw };
};

window.matrix = matrixEffect("fullscreen-matrix-canvas", "body");
