export const SECTIONS = {
  planta: 'section-planta',
  queries: 'section-queries',
  events: 'section-events',
};

export function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
