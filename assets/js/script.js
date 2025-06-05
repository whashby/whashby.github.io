document.addEventListener("DOMContentLoaded", () => {

    const navButtons = document.querySelectorAll(".nav-button");
    const introSection = document.getElementById("intro");
    const aboutSection = document.getElementById("about");
    const contactSection = document.getElementById("contact");
    const projectsSection = document.getElementById("projects");
    const resumeSection = document.getElementById("resume");

    const EVENT_CLICK = "click";

    const updateElementVisibility = (element, isVisible) => {
        element.classList.toggle("hidden", !isVisible);
    };

    navButtons.forEach(button => {
        button.addEventListener(EVENT_CLICK, () => {
            const target = button.getAttribute("data-target");

            // Hide all sections first
            updateElementVisibility(introSection, false);
            updateElementVisibility(aboutSection, false);
            updateElementVisibility(contactSection, false);
            updateElementVisibility(projectsSection, false);
            updateElementVisibility(resumeSection, false);

            // Show the target section
            switch (target) {
                case "intro":
                    updateElementVisibility(introSection, true);
                    break;
                case "about":
                    updateElementVisibility(aboutSection, true);
                    break;
                case "contact":
                    updateElementVisibility(contactSection, true);
                    break;
                case "projects":
                    updateElementVisibility(projectsSection, true);
                    break;
                case "resume":
                    updateElementVisibility(resumeSection, true);
                    break;
                default:
                    console.warn(`Unknown target: ${target}`);
            }


        });
    });
});