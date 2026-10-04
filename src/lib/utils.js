/**
 * Toast notification system
 */

let toastCounter = 0;

/**
 * Show a toast notification
 * @param {Object} options
 * @param {string} options.title - Toast title
 * @param {string} options.message - Toast message
 * @param {'info'|'success'|'warning'|'urgent'} options.type - Toast type
 * @param {number} options.duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
 */
export function showToast({ title, message, type = 'info', duration = 5000 }) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const id = `toast-${++toastCounter}`;
  const icons = {
    info: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
    success: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    warning: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    urgent: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12c-2.8 0-5 2.2-5 5v3h10v-3c0-2.8-2.2-5-5-5Z"></path><path d="M12 8v4"></path><path d="M12 2v2"></path><path d="M22 17v2"></path><path d="M2 17v2"></path><path d="m20 9-1.7 1.7"></path><path d="m5.7 10.7-1.7-1.7"></path></svg>`,
  };

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.id = id;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <span class="toast__icon">${icons[type]}</span>
    <div class="toast__content">
      <div class="toast__title">${escapeHtml(title)}</div>
      ${message ? `<div class="toast__message">${escapeHtml(message)}</div>` : ''}
    </div>
  `;

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration);
  }

  return id;
}

/**
 * Dismiss a toast
 */
export function dismissToast(id) {
  const toast = document.getElementById(id);
  if (!toast) return;

  toast.classList.add('toast--leaving');
  setTimeout(() => toast.remove(), 200);
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Generate a short random code
 */
export function generateCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 for clarity
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Format a timestamp for display
 */
export function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Debounce a function
 */
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Store and retrieve data with device fingerprint
 */
export function getDeviceId() {
  let id = localStorage.getItem('hacktrack_device_id');
  if (!id) {
    id = 'dev_' + crypto.randomUUID();
    localStorage.setItem('hacktrack_device_id', id);
  }
  return id;
}

/**
 * Local session storage for current hackathon context
 */
export function setSession(data) {
  localStorage.setItem('hacktrack_session', JSON.stringify(data));
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem('hacktrack_session'));
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem('hacktrack_session');
}
