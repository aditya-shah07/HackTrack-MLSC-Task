/**
 * Organizer Dashboard — Control panel for managing the hackathon
 */
import { navigate, announceToSR } from '../lib/router.js';
import { registerShortcut, unregisterShortcut, clearPageShortcuts, enableListNavigation } from '../lib/keyboard.js';
import { showToast, escapeHtml, formatTime, setSession, getSession } from '../lib/utils.js';
import {
  getHackathon,
  getTeams,
  getAnnouncements,
  updateTeamStatus,
  createAnnouncement,
  deleteAnnouncement,
  submitEvaluation,
  updateHackathon,
  subscribeToHackathon,
  unsubscribeAll,
  updateTeamPosition,
  eliminateTeams,
} from '../lib/store.js';

export function organizerPage(params) {
  const hackathonId = params.id;
  let hackathon = null;
  let teams = [];
  let announcements = [];
  let refreshInterval = null;

  return {
    title: 'Organizer Dashboard',

    renderHeader(headerEl) {
      headerEl.innerHTML = `
        <nav class="app-header" aria-label="Organizer navigation">
          <div class="app-header__inner">
            <div class="app-header__brand">
              <span class="app-header__logo" aria-hidden="true"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-primary)"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></span>
              <span class="app-header__title">HackTrack</span>
            </div>
            <div class="app-header__meta">
              <button class="app-header__code" 
                      id="btn-copy-code" 
                      title="Click to copy join code for participants"
                      aria-label="Copy join code">
                <span class="app-header__code-label">Join Code</span>
                <span id="header-code">------</span>
              </button>
              <button class="app-header__code" 
                      id="btn-copy-key" 
                      title="Click to copy your secret Organizer Key"
                      aria-label="Copy organizer key"
                      style="border-color: var(--accent-secondary); color: var(--text-primary);">
                <span class="app-header__code-label" style="color: var(--accent-secondary);">Organizer Key</span>
                <span id="header-key" style="font-family: var(--font-mono); font-size: 0.85em;">••••••••••••</span>
              </button>
            </div>
            <div class="app-header__nav">
              <button class="btn btn--ghost btn--sm" id="btn-go-home" tabindex="0" aria-label="Back to home">
                ← Home
              </button>
              <button class="app-header__shortcut-btn" 
                      aria-label="Show keyboard shortcuts"
                      id="btn-show-shortcuts-org"
                      tabindex="0">
                ?
              </button>
            </div>
          </div>
        </nav>
      `;

      headerEl.querySelector('#btn-go-home')?.addEventListener('click', () => navigate('/'));
      headerEl.querySelector('#btn-copy-code')?.addEventListener('click', copyJoinCode);
      headerEl.querySelector('#btn-copy-key')?.addEventListener('click', copyOrganizerKey);
      headerEl.querySelector('#btn-show-shortcuts-org')?.addEventListener('click', () => {
        import('../lib/keyboard.js').then(m => m.toggleShortcutOverlay(true));
      });
    },

    async render(mainEl) {
      mainEl.innerHTML = `
        <div class="loading-screen">
          <div class="spinner"></div>
          <div class="loading-screen__text">Loading dashboard...</div>
        </div>
      `;

      try {
        hackathon = await getHackathon(hackathonId);
        teams = await getTeams(hackathonId);
        announcements = await getAnnouncements(hackathonId);
      } catch (err) {
        mainEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state__icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg></div>
            <div class="empty-state__title">Could not load hackathon</div>
            <div class="empty-state__desc">${escapeHtml(err.message)}</div>
            <button class="btn btn--primary" style="margin-top: var(--space-4)" onclick="location.hash='#/'">
              Go Home
            </button>
          </div>
        `;
        return;
      }

      // Update header code & key
      const codeEl = document.getElementById('header-code');
      if (codeEl) codeEl.textContent = hackathon.join_code;

      const keyEl = document.getElementById('header-key');
      if (keyEl) keyEl.textContent = hackathon.id.substring(0, 8) + '...';

      renderDashboard(mainEl);
      setupRealtimeSubscriptions(mainEl);
      setupKeyboardShortcuts(mainEl);

      // Auto-refresh every 15 seconds as fallback
      refreshInterval = setInterval(() => refreshData(mainEl), 15000);
    },

    cleanup() {
      clearPageShortcuts();
      unsubscribeAll();
      if (refreshInterval) clearInterval(refreshInterval);
    },
  };

  // ---- Render Dashboard ----
  function renderDashboard(mainEl) {
    // Preserve form state before re-rendering
    const existingForm = mainEl.querySelector('#announcement-form');
    const existingInput = mainEl.querySelector('#input-announcement');
    const existingPriority = mainEl.querySelector('#select-priority');
    
    const formVisible = existingForm ? existingForm.style.display !== 'none' : false;
    const formMessage = existingInput ? existingInput.value : '';
    const formPriority = existingPriority ? existingPriority.value : 'normal';

    const activeTeamsList = teams.filter(t => !t.is_eliminated);
    const waitingTeams = activeTeamsList.filter(t => t.status === 'waiting');
    const activeTeam = activeTeamsList.find(t => t.status === 'being_evaluated');
    const evaluatedTeams = activeTeamsList.filter(t => t.status === 'evaluated');
    const awayTeams = activeTeamsList.filter(t => t.status === 'away');

    // Preserve evaluation form state
    let activeEvalScores = null;
    if (activeTeam) {
      const evalForm = mainEl.querySelector(`#eval-form-${activeTeam.id}`);
      if (evalForm) {
        activeEvalScores = {
          innovation: evalForm.querySelector('[data-crit="innovation"]').value,
          accuracy: evalForm.querySelector('[data-crit="accuracy"]').value,
          ui: evalForm.querySelector('[data-crit="ui"]').value,
          privacy: evalForm.querySelector('[data-crit="privacy"]').value,
          community: evalForm.querySelector('[data-crit="community"]').value,
          notes: evalForm.querySelector('.eval-notes').value,
          total: evalForm.querySelector('.eval-total').textContent
        };
      }
    }

    mainEl.innerHTML = `
      <div class="dashboard">
        <!-- Title Area -->
        <div class="page-title-area">
          <div>
            <h1 class="page-title">
              <span class="page-title__accent">${escapeHtml(hackathon.name)}</span>
            </h1>
          </div>
          <div class="page-actions" style="display: flex; gap: var(--space-3);">
            <button class="btn btn--ghost btn--sm" id="btn-export-csv" tabindex="0" aria-label="Export evaluation scores to CSV">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; vertical-align: text-bottom;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export Scores
            </button>
            <button class="btn btn--secondary btn--sm" id="btn-next-round" tabindex="0">
              Next Round <kbd>N</kbd>
            </button>
          </div>
        </div>

        <!-- Stats -->
        <div class="dashboard__full">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-card__value">${teams.length}</div>
              <div class="stat-card__label">Total Teams</div>
            </div>
            <div class="stat-card">
              <div class="stat-card__value stat-card__value--warning">${waitingTeams.length}</div>
              <div class="stat-card__label">In Queue</div>
            </div>
            <div class="stat-card">
              <div class="stat-card__value stat-card__value--success">${activeTeam ? 1 : 0}</div>
              <div class="stat-card__label">Evaluating</div>
            </div>
            <div class="stat-card">
              <div class="stat-card__value stat-card__value--accent">${evaluatedTeams.length}</div>
              <div class="stat-card__label">Completed</div>
            </div>
          </div>
        </div>

        <!-- Round Indicator -->
        <div class="dashboard__full">
          <div class="round-indicator">
            <div class="round-label">Round ${hackathon.current_round} / ${hackathon.total_rounds}</div>
            <div class="round-steps">
              ${Array.from({ length: hackathon.total_rounds }, (_, i) => {
                const num = i + 1;
                let cls = 'round-step';
                if (num < hackathon.current_round) cls += ' round-step--completed';
                else if (num === hackathon.current_round) cls += ' round-step--active';
                return `<div class="${cls}" aria-label="Round ${num}"></div>`;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Evaluation Queue -->
        <div class="card">
          <div class="card__header">
            <div>
              <h2 class="card__title">Evaluation Queue</h2>
              <div class="card__subtitle">Use ↑↓ to navigate, Enter to evaluate, D for done</div>
            </div>
            <span class="badge badge--waiting">${waitingTeams.length + (activeTeam ? 1 : 0)} remaining</span>
          </div>
          <div id="eval-queue">
            ${activeTeam ? renderTeamItem(activeTeam, true, activeEvalScores) : ''}
            ${waitingTeams.length > 0 ? `
              <ul class="team-list" role="listbox" aria-label="Evaluation queue" id="team-list-queue">
                ${waitingTeams.map((team, i) => `
                  <li class="team-item" 
                      draggable="true"
                      role="option" 
                      tabindex="${i === 0 && !activeTeam ? '0' : '-1'}"
                      data-team-id="${team.id}"
                      data-pos="${team.eval_position}"
                      aria-label="${team.name}, position ${team.eval_position}, ${team.status}">
                    <span class="team-item__position">#${team.eval_position}</span>
                    <div class="team-item__info">
                      <div class="team-item__name">${escapeHtml(team.name)}</div>
                      ${team.table_number ? `<div class="team-item__table">Table ${team.table_number}</div>` : ''}
                    </div>
                    <span class="badge badge--waiting">Waiting</span>
                    <div class="team-item__actions">
                      <button class="btn btn--sm btn--primary" 
                              data-action="evaluate" 
                              data-team-id="${team.id}"
                              tabindex="-1"
                              aria-label="Start evaluating ${escapeHtml(team.name)}">
                        Evaluate
                      </button>
                      <button class="btn btn--sm btn--ghost" 
                              data-action="mark-away" 
                              data-team-id="${team.id}"
                              tabindex="-1"
                              aria-label="Mark ${escapeHtml(team.name)} as away">
                        Away
                      </button>
                    </div>
                  </li>
                `).join('')}
              </ul>
            ` : (!activeTeam ? `
              <div class="empty-state">
                <div class="empty-state__icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.8 11.3 2 22l10.7-3.79"></path><path d="M4 3h.01"></path><path d="M22 8h.01"></path><path d="M15 2h.01"></path><path d="M22 20h.01"></path><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"></path><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"></path><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"></path><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"></path></svg></div>
                <div class="empty-state__title">Queue is clear!</div>
                <div class="empty-state__desc">All teams have been evaluated for this round.</div>
              </div>
            ` : '')}
          </div>
        </div>

        <!-- Announcements Panel -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Announcements</h2>
            <button class="btn btn--sm btn--secondary" id="btn-new-announcement" tabindex="0">
              + New <kbd>A</kbd>
            </button>
          </div>
          
          <!-- New Announcement Form (hidden by default) -->
          <div id="announcement-form" style="display: ${formVisible ? 'block' : 'none'}; margin-bottom: var(--space-5);">
            <div class="form-group" style="margin-bottom: var(--space-3);">
              <textarea class="form-textarea" 
                        id="input-announcement" 
                        placeholder="Type your announcement..."
                        rows="3">${escapeHtml(formMessage)}</textarea>
            </div>
            <div style="display: flex; gap: var(--space-3); align-items: center;">
              <select class="form-select" id="select-priority" style="flex: 0 0 auto;">
                <option value="normal" ${formPriority === 'normal' ? 'selected' : ''}>Normal</option>
                <option value="important" ${formPriority === 'important' ? 'selected' : ''}>Important</option>
                <option value="urgent" ${formPriority === 'urgent' ? 'selected' : ''}>Urgent</option>
              </select>
              <div style="flex: 1;"></div>
              <button type="button" class="btn btn--ghost btn--sm" id="btn-cancel-announcement" tabindex="0">Cancel</button>
              <button type="button" class="btn btn--primary btn--sm" id="btn-send-announcement" tabindex="0">
                Send <kbd>↵</kbd>
              </button>
            </div>
          </div>

          <div id="announcement-feed" class="announcement-feed">
            ${announcements.length > 0 ? announcements.map(renderAnnouncement).join('') : `
              <div class="empty-state">
                <div class="empty-state__icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg></div>
                <div class="empty-state__title">No announcements yet</div>
                <div class="empty-state__desc">Press A to create the first one.</div>
              </div>
            `}
          </div>
        </div>

        <!-- Completed & Away Teams -->
        ${(evaluatedTeams.length > 0 || awayTeams.length > 0) ? `
          <div class="card dashboard__full">
            <div class="card__header">
              <h2 class="card__title">Completed & Away</h2>
              <span class="badge badge--done">${evaluatedTeams.length} done</span>
            </div>
            <ul class="team-list" role="list" id="team-list-done">
              ${evaluatedTeams.map(team => `
                <li class="team-item" tabindex="0" data-team-id="${team.id}">
                  <span class="team-item__position" style="opacity: 0.4">#${team.eval_position}</span>
                  <div class="team-item__info">
                    <div class="team-item__name">${escapeHtml(team.name)}</div>
                    ${team.table_number ? `<div class="team-item__table">Table ${team.table_number}</div>` : ''}
                  </div>
                  <span class="badge badge--done">Done</span>
                  <button class="btn btn--sm btn--ghost" 
                          data-action="reset-waiting" 
                          data-team-id="${team.id}"
                          tabindex="-1">
                    Reset
                  </button>
                </li>
              `).join('')}
              ${awayTeams.map(team => `
                <li class="team-item" tabindex="0" data-team-id="${team.id}">
                  <span class="team-item__position" style="opacity: 0.4">#${team.eval_position}</span>
                  <div class="team-item__info">
                    <div class="team-item__name">${escapeHtml(team.name)}</div>
                    ${team.table_number ? `<div class="team-item__table">Table ${team.table_number}</div>` : ''}
                  </div>
                  <span class="badge badge--away">Away</span>
                  <button class="btn btn--sm btn--ghost" 
                          data-action="reset-waiting" 
                          data-team-id="${team.id}"
                          tabindex="-1">
                    Bring Back
                  </button>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;

    // ---- Wire up events ----
    wireUpEvents(mainEl);
  }

  // ---- Render a single team item (currently being evaluated) ----
  function renderTeamItem(team, isActive, scores = null) {
    const s = scores || { innovation: 0, accuracy: 0, ui: 0, privacy: 0, community: 0, total: 0 };
    return `
      <div class="team-item team-item--current" tabindex="0" data-team-id="${team.id}" style="margin-bottom: var(--space-3); flex-direction: column; align-items: stretch; gap: var(--space-4); background: rgba(30,30,45,0.6); padding: var(--space-4); border: 1px solid var(--accent-primary);">
        <div style="display: flex; align-items: center; width: 100%;">
          <span class="team-item__position team-item__position--active">▶</span>
          <div class="team-item__info" style="flex: 1;">
            <div class="team-item__name" style="font-size: var(--text-lg);">${escapeHtml(team.name)}</div>
            ${team.table_number ? `<div class="team-item__table">Table ${team.table_number}</div>` : ''}
          </div>
          <span class="badge badge--active">Evaluating</span>
        </div>
        
        <div class="eval-form" id="eval-form-${team.id}" style="display: flex; flex-direction: column; gap: var(--space-3); padding-top: var(--space-3); border-top: 1px solid rgba(255,255,255,0.1);">
          <div style="display: grid; grid-template-columns: 3fr 2fr; gap: var(--space-4); align-items: stretch;">
            <!-- Left Side: Scores -->
            <div style="display: flex; flex-direction: column; gap: var(--space-2);">
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 6px;">
                <label style="font-size: var(--text-sm); color: var(--text-secondary); margin: 0;">Innovation & Originality <span style="opacity:0.5; font-size:0.85em;">(20)</span></label>
                <input type="number" max="20" min="0" class="form-input eval-input" data-crit="innovation" value="${s.innovation}" style="width: 70px; padding: 4px 8px; text-align: center;">
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 6px;">
                <label style="font-size: var(--text-sm); color: var(--text-secondary); margin: 0;">Accuracy & Performance <span style="opacity:0.5; font-size:0.85em;">(20)</span></label>
                <input type="number" max="20" min="0" class="form-input eval-input" data-crit="accuracy" value="${s.accuracy}" style="width: 70px; padding: 4px 8px; text-align: center;">
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 6px;">
                <label style="font-size: var(--text-sm); color: var(--text-secondary); margin: 0;">UI/UX & Compatibility <span style="opacity:0.5; font-size:0.85em;">(20)</span></label>
                <input type="number" max="20" min="0" class="form-input eval-input" data-crit="ui" value="${s.ui}" style="width: 70px; padding: 4px 8px; text-align: center;">
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 6px;">
                <label style="font-size: var(--text-sm); color: var(--text-secondary); margin: 0;">Privacy & Scalability <span style="opacity:0.5; font-size:0.85em;">(20)</span></label>
                <input type="number" max="20" min="0" class="form-input eval-input" data-crit="privacy" value="${s.privacy}" style="width: 70px; padding: 4px 8px; text-align: center;">
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 6px;">
                <label style="font-size: var(--text-sm); color: var(--text-secondary); margin: 0;">Community & Demo <span style="opacity:0.5; font-size:0.85em;">(20)</span></label>
                <input type="number" max="20" min="0" class="form-input eval-input" data-crit="community" value="${s.community}" style="width: 70px; padding: 4px 8px; text-align: center;">
              </div>
            </div>
            <!-- Right Side: Notes -->
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-size: var(--text-xs); color: var(--text-secondary);">Evaluation Notes (Optional)</label>
              <textarea class="form-textarea eval-notes" placeholder="Jot down quick thoughts..." style="flex: 1; resize: none; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: var(--text-primary); font-size: var(--text-sm); border-radius: var(--radius-md); padding: var(--space-3); line-height: 1.5;">${s.notes || ''}</textarea>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--space-2); background: rgba(0,0,0,0.2); padding: var(--space-3); border-radius: var(--radius-md);">
            <div style="font-weight: 600; font-size: 1.1em; color: var(--text-primary);">Total Score: <span class="eval-total" style="color: var(--accent-primary); font-weight: 800;">${s.total}</span>/100</div>
            <div style="display: flex; gap: var(--space-2);">
              <button class="btn btn--sm btn--ghost" data-action="cancel-eval" data-team-id="${team.id}">
                Cancel
              </button>
              <button class="btn btn--sm btn--primary" data-action="submit-eval" data-team-id="${team.id}">
                Submit Evaluation <kbd>D</kbd>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ---- Render a single announcement ----
  function renderAnnouncement(ann) {
    const cls = ann.priority === 'urgent' ? 'announcement--urgent' : 
                ann.priority === 'important' ? 'announcement--important' : '';
    return `
      <div class="announcement ${cls}">
        <div class="announcement__header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div>
            <span class="announcement__priority announcement__priority--${ann.priority}">${ann.priority}</span>
            <span class="announcement__time">${formatTime(ann.created_at)}</span>
          </div>
          <button class="btn btn--ghost btn--sm" data-action="delete-announcement" data-announcement-id="${ann.id}" title="Delete announcement" style="padding: 4px; height: auto;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="announcement__message">${escapeHtml(ann.message)}</div>
      </div>
    `;
  }

  // ---- Wire up button events ----
  function wireUpEvents(mainEl) {
    // Team action buttons (evaluate, mark-done, mark-away, reset)
    mainEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const teamId = btn.dataset.teamId;

      try {
        switch (action) {
          case 'evaluate':
            await updateTeamStatus(teamId, 'being_evaluated');
            announceToSR('Now evaluating team');
            break;
          case 'cancel-eval':
            await updateTeamStatus(teamId, 'waiting');
            announceToSR('Evaluation cancelled, team returned to queue');
            break;
          case 'mark-done':
            await updateTeamStatus(teamId, 'evaluated');
            announceToSR('Team marked as evaluated');
            break;
          case 'submit-eval': {
            const form = document.getElementById(`eval-form-${teamId}`);
            if (!form) break;
            
            const scores = {
              innovation: parseInt(form.querySelector('[data-crit="innovation"]').value) || 0,
              accuracy: parseInt(form.querySelector('[data-crit="accuracy"]').value) || 0,
              ui: parseInt(form.querySelector('[data-crit="ui"]').value) || 0,
              privacy: parseInt(form.querySelector('[data-crit="privacy"]').value) || 0,
              community: parseInt(form.querySelector('[data-crit="community"]').value) || 0,
            };
            scores.total = Object.values(scores).reduce((a, b) => a + b, 0);
            scores.notes = form.querySelector('.eval-notes')?.value || '';
            
            btn.disabled = true;
            await submitEvaluation(teamId, scores);
            announceToSR('Evaluation submitted');
            break;
          }
          case 'mark-away':
            await updateTeamStatus(teamId, 'away');
            announceToSR('Team marked as away');
            break;
          case 'reset-waiting':
            await updateTeamStatus(teamId, 'waiting');
            announceToSR('Team moved back to queue');
            break;
          case 'delete-announcement':
            if (confirm('Are you sure you want to delete this announcement?')) {
              await deleteAnnouncement(btn.dataset.announcementId);
              announceToSR('Announcement deleted');
            } else {
              return; // Prevent refresh if cancelled
            }
            break;
        }
        await refreshData(mainEl);
      } catch (err) {
        showToast({ title: 'Error', message: err.message, type: 'urgent' });
        if (btn) btn.disabled = false;
      }
    });

    // Real-time calculation for evaluation inputs
    mainEl.addEventListener('input', (e) => {
      if (e.target.classList.contains('eval-input')) {
        let val = parseInt(e.target.value);
        if (isNaN(val)) val = 0;
        if (val > 20) val = 20;
        if (val < 0) val = 0;
        e.target.value = val;

        const form = e.target.closest('.eval-form');
        if (form) {
          const inputs = form.querySelectorAll('.eval-input');
          let total = 0;
          inputs.forEach(input => {
            total += parseInt(input.value) || 0;
          });
          form.querySelector('.eval-total').textContent = total;
        }
      }
    });

    // Announcement form
    const formEl = mainEl.querySelector('#announcement-form');
    const feedEl = mainEl.querySelector('#announcement-feed');
    const newBtn = mainEl.querySelector('#btn-new-announcement');
    const cancelBtn = mainEl.querySelector('#btn-cancel-announcement');
    const sendBtn = mainEl.querySelector('#btn-send-announcement');
    const inputAnn = mainEl.querySelector('#input-announcement');

    if (newBtn) {
      newBtn.addEventListener('click', () => {
        formEl.style.display = 'block';
        inputAnn.focus();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        if (e) e.preventDefault();
        formEl.style.display = 'none';
        inputAnn.value = '';
      });
    }

    if (sendBtn) {
      const handleSend = async (e) => {
        if (e) e.preventDefault();
        const message = inputAnn.value.trim();
        if (!message) { inputAnn.focus(); return; }

        const priority = mainEl.querySelector('#select-priority').value;
        sendBtn.disabled = true;

        try {
          await createAnnouncement(hackathonId, message, priority);
          formEl.style.display = 'none';
          inputAnn.value = '';
          await refreshData(mainEl);
          showToast({ title: 'Sent', message: 'Announcement published', type: 'success' });
        } catch (err) {
          showToast({ title: 'Error', message: err.message, type: 'urgent' });
        }

        sendBtn.disabled = false;
      };

      sendBtn.addEventListener('click', handleSend);
      inputAnn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend(e);
      });
    }

    // Next round
    mainEl.querySelector('#btn-next-round')?.addEventListener('click', async () => {
      if (hackathon.current_round >= hackathon.total_rounds) {
        showToast({ title: 'Final round', message: 'This is already the last round.', type: 'warning' });
        return;
      }
      
      const numInput = prompt("How many top teams should advance to the next round?");
      if (!numInput) return; 
      
      const numShortlist = parseInt(numInput, 10);
      if (isNaN(numShortlist) || numShortlist <= 0) {
        showToast({ title: 'Invalid input', message: 'Please enter a valid number', type: 'warning' });
        return;
      }

      try {
        const activeTeamsList = teams.filter(t => !t.is_eliminated);
        const sortedTeams = [...activeTeamsList].sort((a, b) => (b.score_total || 0) - (a.score_total || 0));
        
        const advancingTeams = sortedTeams.slice(0, numShortlist);
        const eliminatedTeams = sortedTeams.slice(numShortlist);
        
        if (eliminatedTeams.length > 0) {
          const eliminatedIds = eliminatedTeams.map(t => t.id);
          await eliminateTeams(eliminatedIds);
        }
        
        for (const team of advancingTeams) {
          await updateTeamStatus(team.id, 'waiting');
        }

        hackathon = await updateHackathon(hackathonId, { 
          current_round: hackathon.current_round + 1 
        });
        await createAnnouncement(hackathonId, `Round ${hackathon.current_round} has started!`, 'important');
        await refreshData(mainEl);
        showToast({ title: 'Round Advanced', message: `Now on Round ${hackathon.current_round}`, type: 'success' });
      } catch (err) {
        showToast({ title: 'Error', message: err.message, type: 'urgent' });
      }
    });

    // ---- Drag and Drop Reordering ----
    let draggedTeamId = null;
    let draggedTeamPos = null;

    mainEl.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.team-item');
      if (!item || item.parentElement.id !== 'team-list-queue') return;
      draggedTeamId = item.dataset.teamId;
      draggedTeamPos = item.dataset.pos;
      item.style.opacity = '0.5';
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });

    mainEl.addEventListener('dragend', (e) => {
      const item = e.target.closest('.team-item');
      if (item) item.style.opacity = '1';
      draggedTeamId = null;
      draggedTeamPos = null;
    });

    mainEl.addEventListener('dragover', (e) => {
      const item = e.target.closest('.team-item');
      if (!item || item.parentElement.id !== 'team-list-queue') return;
      e.preventDefault();
      item.style.borderTop = '2px solid var(--accent-primary)';
    });

    mainEl.addEventListener('dragleave', (e) => {
      const item = e.target.closest('.team-item');
      if (item) item.style.borderTop = '';
    });

    mainEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      const item = e.target.closest('.team-item');
      if (item) item.style.borderTop = '';
      
      if (!draggedTeamId || !item || item.parentElement.id !== 'team-list-queue') return;
      
      const targetTeamId = item.dataset.teamId;
      const targetTeamPos = item.dataset.pos;
      
      if (draggedTeamId === targetTeamId) return;
      
      try {
        await updateTeamPosition(draggedTeamId, parseInt(targetTeamPos));
        await updateTeamPosition(targetTeamId, parseInt(draggedTeamPos));
        // Real-time will refresh data automatically
      } catch (err) {
        showToast({ title: 'Error', message: 'Failed to reorder', type: 'urgent' });
      }
    });

    // Export CSV
    mainEl.querySelector('#btn-export-csv')?.addEventListener('click', () => {
      let csvContent = "Sr. No,Team ID,Team Name,Team Leader Name,Innovation & Originality (20),Accuracy Reliability & Performance (20),User Interface Experience & Compatibility (20),Privacy Documentation & Scalability (20),Community Engagement & Demonstration / Presentation (20),Total (100),Notes\n";
      
      teams.forEach((team, i) => {
        const row = [
          i + 1,
          team.id,
          `"${team.name.replace(/"/g, '""')}"`, // Escape quotes in team name
          "", // Team Leader Name (Not collected)
          team.score_innovation || 0,
          team.score_accuracy || 0,
          team.score_ui || 0,
          team.score_privacy || 0,
          team.score_community || 0,
          team.score_total || 0,
          `"${(team.eval_notes || '').replace(/"/g, '""')}"`
        ];
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${hackathon.name.replace(/\s+/g, '_')}_evaluations.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast({ title: 'Exported', message: 'CSV downloaded successfully', type: 'success' });
      announceToSR('Evaluation scores exported to CSV');
    });

    // Enable keyboard list navigation on the queue
    const queueList = mainEl.querySelector('#team-list-queue');
    if (queueList) {
      enableListNavigation(queueList, '.team-item', {
        onSelect: (item) => {
          const evaluateBtn = item.querySelector('[data-action="evaluate"]');
          if (evaluateBtn) evaluateBtn.click();
        },
      });
    }

    const doneList = mainEl.querySelector('#team-list-done');
    if (doneList) {
      enableListNavigation(doneList, '.team-item');
    }
  }

  // ---- Copy join code ----
  async function copyJoinCode() {
    if (!hackathon) return;
    try {
      await navigator.clipboard.writeText(hackathon.join_code);
      showToast({ title: 'Copied!', message: `Join code: ${hackathon.join_code}`, type: 'success', duration: 2000 });
      announceToSR('Join code copied to clipboard');
    } catch {
      showToast({ title: 'Join Code', message: hackathon.join_code, type: 'info' });
    }
  }

  // ---- Copy organizer key ----
  async function copyOrganizerKey() {
    if (!hackathon) return;
    try {
      await navigator.clipboard.writeText(hackathon.id);
      showToast({ title: 'Copied!', message: 'Secret Organizer Key copied to clipboard.', type: 'success', duration: 3000 });
      announceToSR('Organizer key copied to clipboard');
    } catch {
      showToast({ title: 'Organizer Key', message: hackathon.id, type: 'info', duration: 10000 });
    }
  }

  // ---- Refresh data & re-render ----
  async function refreshData(mainEl) {
    try {
      hackathon = await getHackathon(hackathonId);
      teams = await getTeams(hackathonId);
      announcements = await getAnnouncements(hackathonId);

      // Save focus state before replacing innerHTML
      const activeElement = document.activeElement;
      let focusId = null;
      let focusCrit = null;
      let selectionStart = null;
      let selectionEnd = null;

      if (activeElement) {
        if (activeElement.id) focusId = activeElement.id;
        if (activeElement.dataset && activeElement.dataset.crit) focusCrit = activeElement.dataset.crit;
        if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
          selectionStart = activeElement.selectionStart;
          selectionEnd = activeElement.selectionEnd;
        }
      }

      renderDashboard(mainEl);

      // Update header
      const codeEl = document.getElementById('header-code');
      if (codeEl) codeEl.textContent = hackathon.join_code;

      // Restore focus state
      let elToFocus = null;
      if (focusId) elToFocus = document.getElementById(focusId);
      else if (focusCrit) elToFocus = mainEl.querySelector(`input[data-crit="${focusCrit}"]`);

      if (elToFocus) {
        elToFocus.focus();
        if (selectionStart !== null && (elToFocus.tagName === 'INPUT' || elToFocus.tagName === 'TEXTAREA')) {
          elToFocus.setSelectionRange(selectionStart, selectionEnd);
        }
      }

    } catch (err) {
      console.error('Refresh error:', err);
    }
  }

  // ---- Real-time subscriptions ----
  function setupRealtimeSubscriptions(mainEl) {
    subscribeToHackathon(hackathonId, {
      onTeamChange: () => refreshData(mainEl),
      onAnnouncement: (payload) => {
        const ann = payload.new;
        showToast({
          title: 'New Announcement',
          message: ann.message,
          type: ann.priority === 'urgent' ? 'urgent' : 'info',
        });
        refreshData(mainEl);
      },
      onHackathonChange: () => refreshData(mainEl),
    });
  }

  // ---- Keyboard shortcuts ----
  function setupKeyboardShortcuts(mainEl) {
    clearPageShortcuts();

    registerShortcut('a', 'New announcement', () => {
      const form = mainEl.querySelector('#announcement-form');
      const input = mainEl.querySelector('#input-announcement');
      if (form) {
        form.style.display = 'block';
        input?.focus();
      }
    }, 'Organizer');

    registerShortcut('d', 'Submit current evaluation', async () => {
      const activeBtn = mainEl.querySelector('.team-item--current [data-action="submit-eval"]');
      if (activeBtn) activeBtn.click();
    }, 'Organizer');

    registerShortcut('Delete', 'Delete most recent announcement', async () => {
      const latestDeleteBtn = mainEl.querySelector('.announcement [data-action="delete-announcement"]');
      if (latestDeleteBtn) latestDeleteBtn.click();
    }, 'Organizer');

    registerShortcut('n', 'Next round', () => {
      mainEl.querySelector('#btn-next-round')?.click();
    }, 'Organizer');

    registerShortcut('w', 'Mark focused team as away', () => {
      let activeItem = document.activeElement;
      if (!activeItem || !activeItem.classList.contains('team-item')) {
        // Fallback to currently evaluating team
        activeItem = mainEl.querySelector('.team-item--current');
      }
      if (activeItem) {
        const btn = activeItem.querySelector('[data-action="mark-away"]');
        if (btn) btn.click();
      }
    }, 'Organizer');

    registerShortcut('b', 'Bring focused team back to queue', () => {
      const activeItem = document.activeElement;
      if (activeItem && activeItem.classList.contains('team-item')) {
        const btn = activeItem.querySelector('[data-action="reset-waiting"]');
        if (btn) btn.click();
      }
    }, 'Organizer');

    registerShortcut('k', 'Copy join code', copyJoinCode, 'Organizer');

    registerShortcut('[', 'Move focused team UP', async () => {
      const activeItem = document.activeElement;
      if (activeItem && activeItem.classList.contains('team-item') && activeItem.parentElement.id === 'team-list-queue') {
        const prevItem = activeItem.previousElementSibling;
        if (prevItem) {
          try {
            await updateTeamPosition(activeItem.dataset.teamId, parseInt(prevItem.dataset.pos));
            await updateTeamPosition(prevItem.dataset.teamId, parseInt(activeItem.dataset.pos));
          } catch (e) {
            showToast({ title: 'Error', message: 'Failed to reorder', type: 'urgent' });
          }
        }
      }
    }, 'Organizer');

    registerShortcut(']', 'Move focused team DOWN', async () => {
      const activeItem = document.activeElement;
      if (activeItem && activeItem.classList.contains('team-item') && activeItem.parentElement.id === 'team-list-queue') {
        const nextItem = activeItem.nextElementSibling;
        if (nextItem) {
          try {
            await updateTeamPosition(activeItem.dataset.teamId, parseInt(nextItem.dataset.pos));
            await updateTeamPosition(nextItem.dataset.teamId, parseInt(activeItem.dataset.pos));
          } catch (e) {
            showToast({ title: 'Error', message: 'Failed to reorder', type: 'urgent' });
          }
        }
      }
    }, 'Organizer');

    registerShortcut('Escape', 'Close / Cancel', () => {
      const form = mainEl.querySelector('#announcement-form');
      if (form && form.style.display !== 'none') {
        form.style.display = 'none';
        mainEl.querySelector('#input-announcement').value = '';
      }
    }, 'Global');
  }
}
