document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.querySelector(".menu-toggle");
  const leftPanel = document.querySelector(".left-panel");

  if (menuToggle && leftPanel) {
    menuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      menuToggle.classList.toggle("active");
      leftPanel.classList.toggle("active");
    });

    const navLinks = leftPanel.querySelectorAll("a");
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        if (leftPanel.classList.contains("active")) {
          menuToggle.classList.remove("active");
          leftPanel.classList.remove("active");
        }
      });
    });
  }
});
