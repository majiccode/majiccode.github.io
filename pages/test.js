// Ensure the global animation controller exists
window.pageAnimations = window.pageAnimations || {};

// Create a controllable module for the test page animation
window.pageAnimations.test = (function () {
  const canvas = document.getElementById("synthwave-canvas");
  if (!canvas) {
    console.error("Canvas element #synthwave-canvas not found.");
    return { start: () => {}, stop: () => {} };
  }

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let animationFrameId = null;

  const text = "TEST";
  const fontFamily = "Arial, sans-serif";
  let fontSize;
  let textMetrics;
  let textX, textY;

  const sparks = [];
  const maxSparks = 200;

  // Off-screen canvas for collision detection
  const collisionCanvas = document.createElement("canvas");
  const collisionCtx = collisionCanvas.getContext("2d", {
    willReadFrequently: true,
  });
  let textPixelData;

  function setup() {
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
  }

  function isPointOnText(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
      return false;
    }
    const index = (y * canvas.width + x) * 4;
    return textPixelData[index + 3] > 0; // Check alpha channel
  }

  function createSpark() {
    sparks.push({
      x: Math.random() * canvas.width,
      y: 0,
      vy: 2 + Math.random() * 3, // velocity y
      size: 1 + Math.random() * 2,
      color: `hsl(${180 + Math.random() * 60}, 100%, 75%)`,
      state: "falling", // falling, behind, sliding
      life: 100 + Math.random() * 100, // for sliding/glowing sparks
    });
  }

  function draw() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)"; // Fading trail effect
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (sparks.length < maxSparks && Math.random() > 0.9) {
      createSpark();
    }

    const sparksBehind = sparks.filter((s) => s.state === "behind");
    const sparksFront = sparks.filter((s) => s.state === "front");
    const sparksSliding = sparks.filter((s) => s.state === "sliding");

    // 1. Draw collective glow from sparks behind the text
    const behindGlowAlpha = Math.min(1.0, sparksBehind.length * 0.05); // Each spark adds 5% opacity
    if (behindGlowAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${behindGlowAlpha})`;
      ctx.fillText(text, textX, textY);
    }

    // 2. Draw the main text with shadows
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeText(text, textX, textY);

    // Reset shadows for other elements
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 3. Draw sliding sparks and their glow on the letter
    sparksSliding.forEach((spark) => {
      // Draw the spark itself
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      ctx.fill();

      // Draw the glow effect on the letter
      const glowGradient = ctx.createRadialGradient(
        spark.x,
        spark.y,
        spark.size,
        spark.x,
        spark.y,
        spark.size * 15 // Increased glow radius
      );
      glowGradient.addColorStop(0, spark.color);
      glowGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.7)");
      glowGradient.addColorStop(1, "transparent");

      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = glowGradient;
      ctx.fillText(text, textX, textY);
      ctx.globalCompositeOperation = "source-over";
    });

    // 4. Draw sparks in front and their dimming effect
    sparksFront.forEach((spark) => {
      // Dimming effect
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size * 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      // Spark itself
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      ctx.fill();
    });

    updateSparks();

    animationFrameId = requestAnimationFrame(draw);
  }

  function updateSparks() {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const spark = sparks[i];
      spark.y += spark.vy;

      if (spark.state === "falling" && isPointOnText(spark.x, spark.y)) {
        const decision = Math.random();
        if (decision < 0.5) {
          // 50% chance
          spark.state = "behind";
        } else if (decision < 0.85) {
          // 35% chance
          spark.state = "sliding";
        } else {
          // 15% chance
          spark.state = "front";
        }
      }

      if (spark.state === "sliding") {
        spark.vy = 1; // Slow down when sliding
        spark.life--;
      }

      if (spark.y > canvas.height || spark.life <= 0) {
        sparks.splice(i, 1);
      }
    }
  }

  function start() {
    if (!animationFrameId) {
      console.log("Starting test animation");
      setup(); // Recalculate sizes on start
      sparks.length = 0; // Clear sparks
      animationFrameId = requestAnimationFrame(draw);
    }
  }

  function stop() {
    if (animationFrameId) {
      console.log("Stopping test animation");
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  window.addEventListener("resize", setup);

  return {
    start,
    stop,
  };
})();
