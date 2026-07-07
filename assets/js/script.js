document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll("header nav a");
  const sections = document.querySelectorAll("main section");

  navLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const targetId = link.getAttribute("href").replace("#", "");

      sections.forEach(section => {
        section.style.display = section.id === targetId ? "block" : "none";
      });

      // Smooth scroll to section
      document.getElementById(targetId).scrollIntoView({ behavior: "smooth" });
    });
  });

  // Default: show first section
  sections.forEach((section, index) => {
    section.style.display = index === 0 ? "block" : "none";
  });
});
