/**
 * Home Page — Landing screen with Create/Join options
 */
import { navigate } from '../lib/router.js';
import { registerShortcut, unregisterShortcut, clearPageShortcuts } from '../lib/keyboard.js';

export function homePage() {
  return {
    title: 'Home',

    renderHeader(headerEl) {
      headerEl.innerHTML = `
        <nav class="app-header" aria-label="Main navigation">
          <div class="app-header__inner">
            <div class="app-header__brand">
              <span class="app-header__logo" aria-hidden="true"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-primary)"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></span>
              <span class="app-header__title">HackTrack</span>
            </div>
            
            <div class="app-header__links" style="display: flex; gap: 2rem; align-items: center; margin-left: 2rem;">
              <!-- Hidden on mobile, shown via CSS on desktop -->
              <a href="#" class="app-header__link">Product</a>
              <a href="#" class="app-header__link">Solutions</a>
              <a href="#" class="app-header__link">Pricing</a>
              <a href="#" class="app-header__link">Docs</a>
            </div>

            <div class="app-header__nav">
              <a href="#" class="app-header__login">Log in</a>
              <button class="app-header__cta-btn" id="header-cta">Get Started</button>
              <button class="app-header__shortcut-btn" 
                      aria-label="Show keyboard shortcuts" 
                      title="Keyboard shortcuts (?)"
                      id="btn-show-shortcuts"
                      tabindex="0">
                ?
              </button>
            </div>
          </div>
        </nav>
      `;

      headerEl.querySelector('#btn-show-shortcuts')?.addEventListener('click', () => {
        const { toggleShortcutOverlay } = require('../lib/keyboard.js');
        toggleShortcutOverlay(true);
      });
    },

    render(mainEl) {
      mainEl.innerHTML = `
        <div class="home">
          <div class="home__brand">
            <span class="home__icon" aria-hidden="true"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-primary)"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></span>
            <h1 class="home__title">HackTrack</h1>
            <p class="home__subtitle">
              Say goodbye to hackathon chaos! Track evaluations, hype up your teams, and run your event with a smile ✨
            </p>
            <div class="home__cta-group">
              <button class="home__cta-primary" id="btn-hero-cta">Explore Dashboard <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"></path><path d="m19 12-7 7-7-7"></path></svg></button>
            </div>
            <div class="home__constraint-badge">
              <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="6" y1="8" x2="6.01" y2="8"></line><line x1="10" y1="8" x2="10.01" y2="8"></line><line x1="14" y1="8" x2="14.01" y2="8"></line><line x1="18" y1="8" x2="18.01" y2="8"></line><line x1="6" y1="12" x2="6.01" y2="12"></line><line x1="10" y1="12" x2="10.01" y2="12"></line><line x1="14" y1="12" x2="14.01" y2="12"></line><line x1="18" y1="12" x2="18.01" y2="12"></line><line x1="8" y1="16" x2="16" y2="16"></line></svg> <span>Fully keyboard accessible</span> — No mouse required
            </div>
          </div>

          <div class="home__actions" role="group" aria-label="Choose your role">
            <button class="home__action-card" 
                    id="action-create" 
                    tabindex="0"
                    aria-label="Create a new hackathon. Press C for shortcut.">
              <div class="home__action-icon" aria-hidden="true"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg></div>
              <div class="home__action-content">
                <div class="home__action-title">Create Hackathon</div>
                <div class="home__action-desc">
                  Set up your event and get a join code for participants.
                </div>
              </div>
              <kbd>C</kbd>
            </button>

            <button class="home__action-card" 
                    id="action-join" 
                    tabindex="0"
                    aria-label="Join an existing hackathon. Press J for shortcut.">
              <div class="home__action-icon" aria-hidden="true"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg></div>
              <div class="home__action-content">
                <div class="home__action-title">Join Hackathon</div>
                <div class="home__action-desc">
                  Enter your team code and track your evaluation status live.
                </div>
              </div>
              <kbd>J</kbd>
            </button>
          </div>

          <div class="home__kbd-hint" aria-hidden="true">
            Press <kbd>?</kbd> for all keyboard shortcuts
          </div>
        </div>

        <!-- Create Modal -->
        <div class="modal-backdrop" id="modal-create" role="dialog" aria-labelledby="create-title" aria-modal="true">

          <div class="modal">
            <div class="modal__header">
              <h2 id="create-title" class="modal__title">Create Hackathon</h2>
              <p class="modal__desc">Set up your event. You'll get a unique join code to share with teams.</p>
            </div>
            <div class="modal__body">
              <div class="form-group">
                <label class="form-label" for="input-hack-name">Hackathon Name</label>
                <input class="form-input" 
                       id="input-hack-name" 
                       type="text" 
                       placeholder="e.g. MLSC WebDev Hackathon 2026"
                       autocomplete="off"
                       maxlength="60" />
              </div>
              <div class="form-group">
                <label class="form-label" for="input-rounds">Number of Rounds</label>
                <select class="form-select" id="input-rounds">
                  <option value="1">1 Round</option>
                  <option value="2">2 Rounds</option>
                  <option value="3" selected>3 Rounds</option>
                  <option value="4">4 Rounds</option>
                  <option value="5">5 Rounds</option>
                </select>
              </div>
            </div>
            <div class="modal__footer">
              <button class="btn btn--ghost" id="btn-cancel-create" tabindex="0">
                Cancel <kbd>Esc</kbd>
              </button>
              <button class="btn btn--primary" id="btn-confirm-create" tabindex="0">
                Create Event <kbd>↵</kbd>
              </button>
            </div>
          </div>
        </div>

        <!-- Join Modal -->
        <div class="modal-backdrop" id="modal-join" role="dialog" aria-labelledby="join-title" aria-modal="true">
          <div class="modal">
            <div class="modal__header">
              <h2 id="join-title" class="modal__title">Join Hackathon</h2>
              <p class="modal__desc">Enter the 6-character code shared by the organizer.</p>
            </div>
            <div class="modal__body">
              <div class="form-group">
                <label class="form-label" for="input-join-code">Join Code</label>
                <input class="form-input form-input--mono" 
                       id="input-join-code" 
                       type="text" 
                       placeholder="ABC123"
                       autocomplete="off"
                       maxlength="6"
                       spellcheck="false" />
              </div>
              <div class="form-group">
                <label class="form-label" for="input-team-name">Team Name</label>
                <input class="form-input" 
                       id="input-team-name" 
                       type="text" 
                       placeholder="e.g. Code Crusaders"
                       autocomplete="off"
                       maxlength="40" />
              </div>
              <div class="form-group">
                <label class="form-label" for="input-table-num">Table Number <span style="color: var(--text-muted)">(optional)</span></label>
                <input class="form-input" 
                       id="input-table-num" 
                       type="number" 
                       placeholder="e.g. 7"
                       min="1"
                       max="200" />
              </div>
            </div>
            <div class="modal__footer">
              <button class="btn btn--ghost" id="btn-cancel-join" tabindex="0">
                Cancel <kbd>Esc</kbd>
              </button>
              <button class="btn btn--primary" id="btn-confirm-join" tabindex="0">
                Join Event <kbd>↵</kbd>
              </button>
            </div>
          </div>
        </div>
      `;

      // ---- Wire up events ----
      const createModal = mainEl.querySelector('#modal-create');
      const joinModal = mainEl.querySelector('#modal-join');
      const createBtn = mainEl.querySelector('#action-create');
      const joinBtn = mainEl.querySelector('#action-join');

      function openCreate() {
        createModal.classList.add('modal-backdrop--active');
        setTimeout(() => mainEl.querySelector('#input-hack-name')?.focus(), 100);
      }

      function openJoin() {
        joinModal.classList.add('modal-backdrop--active');
        setTimeout(() => mainEl.querySelector('#input-join-code')?.focus(), 100);
      }

      function closeAll() {
        createModal.classList.remove('modal-backdrop--active');
        joinModal.classList.remove('modal-backdrop--active');
      }

      createBtn.addEventListener('click', openCreate);
      joinBtn.addEventListener('click', openJoin);

      mainEl.querySelector('#btn-cancel-create').addEventListener('click', closeAll);
      mainEl.querySelector('#btn-cancel-join').addEventListener('click', closeAll);

      // Close modal on backdrop click
      createModal.addEventListener('click', (e) => {
        if (e.target === createModal) closeAll();
      });
      joinModal.addEventListener('click', (e) => {
        if (e.target === joinModal) closeAll();
      });

      // Create hackathon
      const handleCreate = async () => {
        const name = mainEl.querySelector('#input-hack-name').value.trim();
        const rounds = parseInt(mainEl.querySelector('#input-rounds').value, 10);

        if (!name) {
          mainEl.querySelector('#input-hack-name').focus();
          return;
        }

        const btn = mainEl.querySelector('#btn-confirm-create');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Creating...';

        try {
          const { createHackathon } = await import('../lib/store.js');
          const hackathon = await createHackathon(name, rounds);
          
          // Store session
          const { setSession } = await import('../lib/utils.js');
          setSession({ 
            hackathonId: hackathon.id, 
            role: 'organizer',
            joinCode: hackathon.join_code,
          });

          navigate(`/organizer/${hackathon.id}`);
        } catch (err) {
          console.error('Create hackathon error:', err);
          const { showToast } = await import('../lib/utils.js');
          showToast({ title: 'Error', message: err.message, type: 'urgent' });
          btn.disabled = false;
          btn.innerHTML = 'Create Event <kbd>↵</kbd>';
        }
      };

      mainEl.querySelector('#btn-confirm-create').addEventListener('click', handleCreate);

      // Handle Enter key in create form
      mainEl.querySelector('#input-hack-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleCreate();
      });

      // Join hackathon
      const handleJoin = async () => {
        const code = mainEl.querySelector('#input-join-code').value.trim().toUpperCase();
        const teamName = mainEl.querySelector('#input-team-name').value.trim();
        const tableNum = mainEl.querySelector('#input-table-num').value;

        if (!code || code.length < 6) {
          mainEl.querySelector('#input-join-code').focus();
          return;
        }
        if (!teamName) {
          mainEl.querySelector('#input-team-name').focus();
          return;
        }

        const btn = mainEl.querySelector('#btn-confirm-join');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Joining...';

        try {
          const { getHackathonByCode, registerTeam } = await import('../lib/store.js');
          const hackathon = await getHackathonByCode(code);
          const team = await registerTeam(hackathon.id, teamName, tableNum ? parseInt(tableNum) : null);

          const { setSession } = await import('../lib/utils.js');
          setSession({
            hackathonId: hackathon.id,
            teamId: team.id,
            role: 'participant',
            teamName: team.name,
          });

          navigate(`/participant/${hackathon.id}/${team.id}`);
        } catch (err) {
          console.error('Join hackathon error:', err);
          const { showToast } = await import('../lib/utils.js');
          showToast({ title: 'Error', message: 'Invalid code or could not join. Check the code and try again.', type: 'urgent' });
          btn.disabled = false;
          btn.innerHTML = 'Join Event <kbd>↵</kbd>';
        }
      };

      mainEl.querySelector('#btn-confirm-join').addEventListener('click', handleJoin);

      // Handle Enter key in join form
      mainEl.querySelector('#input-team-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleJoin();
      });
      mainEl.querySelector('#input-table-num').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleJoin();
      });

      // Auto-uppercase join code
      mainEl.querySelector('#input-join-code').addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      });

      // Header Links
      const headerLinks = document.querySelectorAll('.app-header__link, .app-header__login, .app-header__cta-btn');
      headerLinks.forEach(link => link.addEventListener('click', (e) => {
        if (e) e.preventDefault();
        import('../lib/utils.js').then(({ showToast }) => {
          showToast({ title: 'Coming Soon', message: 'This feature is currently under development.', type: 'info' });
        });
      }));

      // Hero CTA
      mainEl.querySelector('#btn-hero-cta')?.addEventListener('click', () => {
        const actions = mainEl.querySelector('.home__actions');
        if (actions) {
          actions.scrollIntoView({ behavior: 'smooth', block: 'center' });
          mainEl.querySelector('#action-create').focus();
        }
      });

      // Register keyboard shortcuts
      clearPageShortcuts();
      registerShortcut('c', 'Create a hackathon', openCreate, 'Navigation');
      registerShortcut('j', 'Join a hackathon', openJoin, 'Navigation');
      registerShortcut('Escape', 'Close dialog', closeAll, 'Global');
    },

    cleanup() {
      unregisterShortcut('c');
      unregisterShortcut('j');
      const navBrand = document.querySelector('.app-header__brand');
      if (navBrand) navBrand.style.opacity = '1';
    },
  };
}
