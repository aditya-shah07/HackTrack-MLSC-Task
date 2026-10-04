/**
 * Keyboard navigation manager
 * Handles global shortcuts and focus management
 */

const globalShortcuts = new Map();
let isShortcutOverlayOpen = false;

/**
 * Initialize keyboard system
 */
export function initKeyboard() {
  document.addEventListener('keydown', handleGlobalKeydown);
  renderShortcutList();
}

/**
 * Register a global keyboard shortcut
 * @param {string} key - Key to bind (e.g., 'c', '?', 'Escape')
 * @param {string} description - Human-readable description
 * @param {Function} handler - Callback function
 * @param {string} group - Group name for the overlay
 */
export function registerShortcut(key, description, handler, group = 'General') {
  globalShortcuts.set(key, { description, handler, group });
  renderShortcutList();
}

/**
 * Unregister a shortcut
 */
export function unregisterShortcut(key) {
  globalShortcuts.delete(key);
  renderShortcutList();
}

/**
 * Clear all shortcuts (useful on page change)
 */
export function clearPageShortcuts() {
  // Keep only the global ones
  for (const [key, val] of globalShortcuts.entries()) {
    if (val.group !== 'Global') {
      globalShortcuts.delete(key);
    }
  }
  renderShortcutList();
}

/**
 * Handle global keydown events
 */
function handleGlobalKeydown(e) {
  // Don't trigger shortcuts when typing in inputs
  const tag = e.target.tagName.toLowerCase();
  const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;

  // Allow Escape always
  if (e.key === 'Escape') {
    if (isShortcutOverlayOpen) {
      toggleShortcutOverlay(false);
      e.preventDefault();
      return;
    }
    // Close any open modals
    const modal = document.querySelector('.modal-backdrop--active');
    if (modal) {
      modal.classList.remove('modal-backdrop--active');
      e.preventDefault();
      return;
    }
  }

  // Don't process shortcuts when in input fields (except Escape)
  if (isInput) return;

  // Toggle shortcut overlay with '?'
  if (e.key === '?') {
    toggleShortcutOverlay();
    e.preventDefault();
    return;
  }

  // Check registered shortcuts
  const shortcut = globalShortcuts.get(e.key);
  if (shortcut) {
    e.preventDefault();
    shortcut.handler();
  }
}

/**
 * Toggle the keyboard shortcuts overlay
 */
export function toggleShortcutOverlay(show) {
  const overlay = document.getElementById('shortcut-overlay');
  if (!overlay) return;

  const shouldShow = show !== undefined ? show : !isShortcutOverlayOpen;
  isShortcutOverlayOpen = shouldShow;

  overlay.setAttribute('aria-hidden', String(!shouldShow));

  if (shouldShow) {
    overlay.focus();
    // Trap focus within overlay
    trapFocus(overlay);
  }
}

/**
 * Render the shortcut list in the overlay
 */
function renderShortcutList() {
  const container = document.getElementById('shortcut-list');
  if (!container) return;

  // Group shortcuts
  const groups = {};
  for (const [key, val] of globalShortcuts.entries()) {
    if (!groups[val.group]) groups[val.group] = [];
    groups[val.group].push({ key, ...val });
  }

  // Always add the '?' shortcut
  if (!groups['Global']) groups['Global'] = [];
  const hasQuestionMark = groups['Global'].some(s => s.key === '?');
  if (!hasQuestionMark) {
    groups['Global'].unshift({ key: '?', description: 'Show keyboard shortcuts' });
  }

  container.innerHTML = Object.entries(groups).map(([groupName, shortcuts]) => `
    <div class="shortcut-group">
      <div class="shortcut-group__title">${groupName}</div>
      ${shortcuts.map(s => `
        <div class="shortcut-item">
          <span class="shortcut-item__label">${s.description}</span>
          <div class="shortcut-item__keys">
            <kbd>${formatKey(s.key)}</kbd>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

/**
 * Format a key for display
 */
function formatKey(key) {
  const map = {
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Enter': '↵ Enter',
    'Escape': 'Esc',
    ' ': 'Space',
    'Tab': 'Tab',
  };
  return map[key] || key.toUpperCase();
}

/**
 * Trap focus within an element (for modals/overlays)
 */
export function trapFocus(element) {
  const focusable = element.querySelectorAll(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  function handler(e) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }

  element._focusTrapHandler = handler;
  element.addEventListener('keydown', handler);
}

/**
 * Remove focus trap from element
 */
export function releaseFocusTrap(element) {
  if (element._focusTrapHandler) {
    element.removeEventListener('keydown', element._focusTrapHandler);
    delete element._focusTrapHandler;
  }
}

/**
 * Enable arrow-key navigation within a list of items
 * @param {HTMLElement} container - The list container
 * @param {string} itemSelector - Selector for navigable items
 * @param {Object} options - { onSelect, orientation }
 */
export function enableListNavigation(container, itemSelector, options = {}) {
  const { onSelect, orientation = 'vertical' } = options;

  container.addEventListener('keydown', (e) => {
    const items = [...container.querySelectorAll(itemSelector)];
    const currentIndex = items.indexOf(document.activeElement);

    let nextIndex = -1;

    const upKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
    const downKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';

    switch (e.key) {
      case downKey:
        e.preventDefault();
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      case upKey:
        e.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        if (currentIndex >= 0 && onSelect) {
          e.preventDefault();
          onSelect(items[currentIndex], currentIndex);
        }
        break;
    }

    if (nextIndex >= 0 && items[nextIndex]) {
      items[nextIndex].focus();
    }
  });
}
