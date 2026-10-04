/**
 * Simple hash-based router with keyboard-friendly navigation
 */

const routes = {};
let currentCleanup = null;

/**
 * Register a route handler
 * @param {string} pattern - route pattern like '/organizer/:id'
 * @param {Function} handler - function(params) that returns { render(), cleanup?() }
 */
export function route(pattern, handler) {
  routes[pattern] = handler;
}

/**
 * Navigate to a new route
 * @param {string} path 
 */
export function navigate(path) {
  window.location.hash = '#' + path;
}

/**
 * Get current path from hash
 */
function getCurrentPath() {
  return window.location.hash.slice(1) || '/';
}

/**
 * Match a path against registered route patterns
 */
function matchRoute(path) {
  for (const [pattern, handler] of Object.entries(routes)) {
    const params = matchPattern(pattern, path);
    if (params !== null) {
      return { handler, params };
    }
  }
  return null;
}

/**
 * Match path against pattern, extracting params
 */
function matchPattern(pattern, path) {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }

  return params;
}

/**
 * Resolve the current route and render
 */
async function resolveRoute() {
  const path = getCurrentPath();
  const match = matchRoute(path);

  // Clean up previous page
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  const mainEl = document.getElementById('main-content');
  const headerEl = document.getElementById('app-header');

  if (!match) {
    // Redirect to home
    navigate('/');
    return;
  }

  const page = match.handler(match.params);
  
  // Clear and render
  mainEl.innerHTML = '';
  mainEl.classList.remove('page-enter');
  
  if (page.renderHeader) {
    headerEl.innerHTML = '';
    page.renderHeader(headerEl);
  }

  await page.render(mainEl);
  
  // Trigger enter animation
  requestAnimationFrame(() => {
    mainEl.classList.add('page-enter');
  });

  // Focus main content for keyboard users
  mainEl.focus();

  // Announce page change to screen readers
  announceToSR(`Navigated to ${page.title || 'new page'}`);

  if (page.cleanup) {
    currentCleanup = page.cleanup;
  }
}

/**
 * Announce a message to screen readers
 */
export function announceToSR(message) {
  const el = document.getElementById('sr-announcer');
  if (el) {
    el.textContent = '';
    requestAnimationFrame(() => {
      el.textContent = message;
    });
  }
}

/**
 * Initialize the router
 */
export function initRouter() {
  window.addEventListener('hashchange', resolveRoute);
  resolveRoute();
}

/**
 * Get a query parameter from the current hash
 */
export function getHashParam(key) {
  const hash = window.location.hash.slice(1);
  const queryIndex = hash.indexOf('?');
  if (queryIndex === -1) return null;
  const params = new URLSearchParams(hash.slice(queryIndex));
  return params.get(key);
}
