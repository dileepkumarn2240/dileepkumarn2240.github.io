const progress = document.querySelector(".scroll-progress span");
const header = document.querySelector(".site-header");
const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".primary-nav");

function updateScrollState() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0;
  progress.style.width = pct + "%";
  header.classList.toggle("scrolled", window.scrollY > 30);
}
window.addEventListener("scroll", updateScrollState, { passive: true });
window.addEventListener("resize", updateScrollState);
updateScrollState();

toggle.addEventListener("click", () => {
  const open = toggle.getAttribute("aria-expanded") !== "true";
  toggle.setAttribute("aria-expanded", String(open));
  toggle.querySelector(".menu-label").textContent = open ? "CLOSE" : "MENU";
  nav.classList.toggle("open", open);
});
nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  toggle.setAttribute("aria-expanded", "false");
  toggle.querySelector(".menu-label").textContent = "MENU";
  nav.classList.remove("open");
}));

document.querySelectorAll(".details-toggle").forEach(button => {
  button.addEventListener("click", () => {
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
    button.querySelector("span").textContent = open ? "−" : "+";
  });
});

document.documentElement.classList.add('motion-ready');
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

fetch('./portfolio-content.json').then(r=>{if(!r.ok)throw new Error('Content unavailable');return r.json()}).then(data=>{const profile=data.profile;document.querySelectorAll('[data-profile]').forEach(el=>{const value=profile[el.dataset.profile];if(value)el.textContent=value});document.querySelectorAll('[data-profile-href]').forEach(el=>{const value=profile[el.dataset.profileHref];if(value)el.href=value});const groups=document.querySelector('[data-skills-groups]');if(groups){groups.replaceChildren(...data.skillGroups.map(group=>{const article=document.createElement('article');article.className='skill-group';const heading=document.createElement('h3');heading.textContent=group.title;const list=document.createElement('div');group.items.forEach(item=>{const tag=document.createElement('span');tag.textContent=item;list.append(tag)});article.append(heading,list);return article}))}}).catch(()=>{});


// Manual carousel keeps development-state captions readable without a timer.
document.querySelectorAll('.rentsafe-gallery').forEach(gallery => {
  const slides = [...gallery.querySelectorAll('.rentsafe-slide')];
  const dots = [...gallery.querySelectorAll('[data-slide-index]')];
  const count = gallery.querySelector('[data-slide-count]');
  let active = 0;
  function showSlide(index) {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== active; });
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === active)));
    count.textContent = String(active + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
  }
  gallery.querySelector('.slideshow-controls').hidden = false;
  gallery.querySelector('.slideshow-dots').hidden = false;
  gallery.querySelector('[data-slide-prev]').addEventListener('click', () => showSlide(active - 1));
  gallery.querySelector('[data-slide-next]').addEventListener('click', () => showSlide(active + 1));
  dots.forEach(dot => dot.addEventListener('click', () => showSlide(Number(dot.dataset.slideIndex))));
  gallery.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const focusedImage = event.target.closest('.rentsafe-shot-link');
    showSlide(event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : active + (event.key === 'ArrowRight' ? 1 : -1));
    if (focusedImage) slides[active].querySelector('a').focus({ preventScroll: true });
  });
  let touchStart = null;
  gallery.addEventListener('touchstart', event => {
    touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  gallery.addEventListener('touchend', event => {
    if (!touchStart) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) showSlide(active + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });
  gallery.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });
});


const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const signal = document.querySelector('.signal-section');
const signalLines = [...document.querySelectorAll('.signal-line')];
let lastSignalStep = -1;
let scrollFrame = 0;
function updateNarrative() {
  scrollFrame = 0;
  if (!signal || !signalLines.length) return;
  const rect = signal.getBoundingClientRect();
  const distance = Math.max(1, signal.offsetHeight - window.innerHeight);
  const progress = Math.max(0, Math.min(0.999, -rect.top / distance));
  const step = Math.floor(progress * signalLines.length);
  if (step === lastSignalStep) return;
  signalLines.forEach((line, i) => line.classList.toggle('active', i === step));
  document.querySelector('.signal-step').textContent = String(step + 1).padStart(2, '0') + ' / 03';
  document.querySelector('.signal-track i').style.width = ((step + 1) / 3 * 100) + '%';
  lastSignalStep = step;
}
function scheduleNarrative() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateNarrative);
}
window.addEventListener('scroll', scheduleNarrative, { passive: true });
window.addEventListener('resize', scheduleNarrative);
updateNarrative();

const rail = document.querySelector('.project-rail');
if (rail) {
  const cards = [...rail.querySelectorAll('.project-card')];
  const previous = document.querySelector('[data-project-prev]');
  const next = document.querySelector('[data-project-next]');
  let currentProject = 0;
  function updateProjects() {
    const firstLeft = cards[0].offsetLeft;
    let closest = Infinity;
    cards.forEach((card, i) => {
      const delta = Math.abs(card.offsetLeft - firstLeft - rail.scrollLeft);
      if (delta < closest) { closest = delta; currentProject = i; }
    });
    document.querySelector('[data-project-count]').textContent = String(currentProject + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
    previous.disabled = currentProject === 0;
    next.disabled = currentProject === cards.length - 1;
  }
  function goToProject(index) {
    const target = Math.max(0, Math.min(cards.length - 1, index));
    rail.scrollTo({ left: cards[target].offsetLeft - cards[0].offsetLeft, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }
  previous.addEventListener('click', () => goToProject(currentProject - 1));
  next.addEventListener('click', () => goToProject(currentProject + 1));
  rail.addEventListener('scroll', updateProjects, { passive: true });
  rail.addEventListener('keydown', event => {
    if (event.target !== rail || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    goToProject(event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : currentProject + (event.key === 'ArrowRight' ? 1 : -1));
  });
  window.addEventListener('resize', updateProjects);
  updateProjects();
}

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || toggle.getAttribute('aria-expanded') !== 'true') return;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.querySelector('.menu-label').textContent = 'MENU';
  nav.classList.remove('open');
  toggle.focus();
});

const chapterLinks = [...nav.querySelectorAll('a')];
const chapterObserver = new IntersectionObserver(entries => {
  const active = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!active) return;
  chapterLinks.forEach(link => {
    if (link.hash === '#' + active.target.id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}, { rootMargin: '-15% 0px -40% 0px', threshold: [0, 0.15, 0.3] });
chapterLinks.forEach(link => { const section = document.querySelector(link.hash); if (section) chapterObserver.observe(section); });
