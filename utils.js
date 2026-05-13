// ============================================================
//   AAROHI FASHION — utils.js
//   Shared utility functions used across all pages
// ============================================================

/* ── PAGE LOADER ── */
export function hideLoader() {
  const loader = document.getElementById('page-loader');
  if (loader) loader.classList.add('hidden');
}

/* ── NAVBAR ── */
export function initNavbar() {
  const hamburger   = document.querySelector('.hamburger');
  const mobileNav   = document.querySelector('.mobile-nav');
  const mobileClose = document.querySelector('.mobile-nav-close');
  const header      = document.querySelector('.site-header');

  // Create overlay dynamically
  let overlay = document.querySelector('.mobile-nav-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'mobile-nav-overlay';
    document.body.appendChild(overlay);
  }

  function openNav() {
    mobileNav?.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeNav() {
    mobileNav?.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  hamburger?.addEventListener('click', openNav);
  mobileClose?.addEventListener('click', closeNav);
  overlay.addEventListener('click', closeNav);

  // Sticky header shadow on scroll
  window.addEventListener('scroll', () => {
    if (header) {
      header.style.boxShadow = window.scrollY > 10
        ? 'var(--shadow-md)'
        : 'none';
    }
  }, { passive: true });

  // Close mobile nav on resize
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeNav();
  });
}

/* ── SCROLL TO TOP ── */
export function initScrollTop() {
  const btn = document.querySelector('.scroll-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ── COUNTDOWN TIMER ── */
export function initCountdown(targetDateString, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const target = new Date(targetDateString).getTime();

  function update() {
    const now  = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      ['cd-days','cd-hours','cd-mins','cd-secs'].forEach(id => {
        const e = document.getElementById(id);
        if (e) e.textContent = '00';
      });
      return;
    }

    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000)  / 60000);
    const secs  = Math.floor((diff % 60000)    / 1000);

    const fmt = n => String(n).padStart(2, '0');
    const d = document.getElementById('cd-days');
    const h = document.getElementById('cd-hours');
    const m = document.getElementById('cd-mins');
    const s = document.getElementById('cd-secs');
    if (d) d.textContent = fmt(days);
    if (h) h.textContent = fmt(hours);
    if (m) m.textContent = fmt(mins);
    if (s) s.textContent = fmt(secs);
  }

  update();
  setInterval(update, 1000);
}

/* ── TOAST NOTIFICATIONS ── */
const TOAST_ICONS = {
  success: '<i class="fa-solid fa-circle-check"></i>',
  error:   '<i class="fa-solid fa-circle-xmark"></i>',
  warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
  info:    '<i class="fa-solid fa-circle-info"></i>'
};

export function showToast(message, type = 'info', duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `${TOAST_ICONS[type] || ''} <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

/* ── CURRENCY FORMATTER ── */
export function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

/* ── DISCOUNT CALCULATOR ── */
export function calcDiscount(original, discounted) {
  if (!original || !discounted || original <= discounted) return 0;
  return Math.round(((original - discounted) / original) * 100);
}

/* ── DEBOUNCE ── */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ── LOCAL STORAGE HELPERS ── */
export const LS = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch { /* storage full */ }
  },
  remove(key) { localStorage.removeItem(key); }
};

/* ── GET URL PARAMS ── */
export function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/* ── COPY TO CLIPBOARD ── */
export function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => showToast('Copied to clipboard!', 'success'))
    .catch(() => showToast('Could not copy', 'error'));
}

/* ── VALIDATE EMAIL ── */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ── VALIDATE PHONE ── */
export function isValidPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ''));
}

/* ── TRUNCATE TEXT ── */
export function truncate(text, max = 80) {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

/* ── ORDINAL ── */
export function ordinal(n) {
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}

/* ── DATE FORMATTER ── */
export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

/* ── GENERATE ORDER ID ── */
export function generateOrderId() {
  return 'ARH-' + Date.now().toString(36).toUpperCase() + '-' +
    Math.random().toString(36).slice(2, 6).toUpperCase();
}

/* ── PINCODE VALIDATOR (basic Indian) ── */
export function isValidPincode(pin) {
  return /^[1-9][0-9]{5}$/.test(pin);
}

/* ── ANIMATE NUMBER ── */
export function animateNumber(el, target, suffix = '', duration = 1500) {
  let start = 0;
  const steps = 60;
  const step = target / steps;
  let frame = 0;

  const timer = setInterval(() => {
    frame++;
    start = Math.min(start + step, target);
    el.textContent = Math.floor(start) + suffix;
    if (frame >= steps) { el.textContent = target + suffix; clearInterval(timer); }
  }, duration / steps);
}

/* ── INTERSECTION OBSERVER HELPER ── */
export function onVisible(selector, callback, threshold = 0.2) {
  const els = document.querySelectorAll(selector);
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold });

  els.forEach(el => observer.observe(el));
}