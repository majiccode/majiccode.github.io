// Ensure the global animation controller exists
window.pageAnimations = window.pageAnimations || {};

// Create a controllable module for the test page animation
window.pageAnimations.test = (function () {
  let canvas,
    ctx,
    animationFrameId = null,
    textPixelData,
    sparks = [],
    textMetrics,
    textX,
    textY,
    fontSize;

  const text = "TEST";
  const fontFamily = "Arial, sans-serif";
  const maxSparks = 200;

  // Off-screen canvas for collision detection
  const collisionCanvas = document.createElement("canvas");
  const collisionCtx = collisionCanvas.getContext("2d", {
    willReadFrequently: true,
  });

  function setup() {
    if (!canvas || !canvas.parentElement) {
      return;
    }
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 400; // Fixed height

    fontSize = Math.min(200, canvas.width / 4);
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    textMetrics = ctx.measureText(text);
    textX = (canvas.width - textMetrics.width) / 2;
    textY = (canvas.height + fontSize) / 2 - 50;

    // Setup collision canvas
    collisionCanvas.width = canvas.width;
    collisionCanvas.height = canvas.height;
    collisionCtx.font = `bold ${fontSize}px ${fontFamily}`;
    collisionCtx.fillStyle = "#fff";
    collisionCtx.fillText(text, textX, textY);
    textPixelData = collisionCtx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    ).data;

    sparks.length = 0; // Clear existing sparks
  }

  function animate() {
    if (!ctx) return;

    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Create new sparks
    if (sparks.length < maxSparks) {
      for (let i = 0; i < 10; i++) {
        sparks.push(new Spark(canvas.width, canvas.height));
      }
    }

    // Update and draw sparks
    for (let i = sparks.length - 1; i >= 0; i--) {
      sparks[i].update(textPixelData, canvas.width);
      sparks[i].draw(ctx);
      if (sparks[i].life <= 0) {
        sparks.splice(i, 1);
      }
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  function start() {
    canvas = document.getElementById("synthwave-canvas");
    if (!canvas) {
      return;
    }
    ctx = canvas.getContext("2d", { willReadFrequently: true });

    // Defer setup until the next frame to ensure layout is complete
    requestAnimationFrame(() => {
      setup();
      window.addEventListener("resize", setup);

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      animate();
    });
  }

  function stop() {
    window.removeEventListener("resize", setup);
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    sparks.length = 0; // Clear sparks
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  class Spark {
    constructor(canvasWidth, canvasHeight) {
      this.x = Math.random() * canvasWidth;
      this.y = Math.random() * canvasHeight;
      this.life = Math.random() * 200 + 50;
      this.maxLife = this.life;
      this.vx = (Math.random() - 0.5) * 2;
      this.vy = (Math.random() - 0.5) * 2;
    }

    isColliding(pixelData, canvasWidth) {
      const x = Math.floor(this.x);
      const y = Math.floor(this.y);
      if (x < 0 || x >= canvasWidth || y < 0 || y >= canvas.height) {
        return false;
      }
      const index = (y * canvasWidth + x) * 4;
      return pixelData[index + 3] > 0; // Check alpha channel
    }

    update(pixelData, canvasWidth) {
      this.life--;

      if (this.isColliding(pixelData, canvasWidth)) {
        this.vx *= -1.1;
        this.vy *= -1.1;
      }

      this.x += this.vx;
      this.y += this.vy;

      // Friction
      this.vx *= 0.95;
      this.vy *= 0.95;

      // Boundary checks
      if (this.x < 0 || this.x > canvasWidth) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }

    draw(ctx) {
      const alpha = this.life / this.maxLife;
      ctx.fillStyle = `rgba(255, 0, 255, ${alpha})`; // Magenta
      ctx.beginPath();
      ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(0, 255, 255, ${alpha * 0.5})`; // Cyan glow
      ctx.beginPath();
      ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return {
    start,
    stop,
  };
})();
