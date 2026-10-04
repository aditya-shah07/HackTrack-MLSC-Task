import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { showToast, formatTime } from '../lib/utils.js';
import {
  getHackathon, getTeams, getAnnouncements, updateTeamStatus,
  createAnnouncement, deleteAnnouncement, submitEvaluation,
  updateHackathon, subscribeToHackathon, unsubscribeAll,
  updateTeamPosition, eliminateTeams
} from '../lib/store.js';
import { registerShortcut, clearPageShortcuts, toggleShortcutOverlay, enableListNavigation } from '../lib/keyboard.js';

export default function Organizer() {
  const { id: hackathonId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [hackathon, setHackathon] = useState(null);
  const [teams, setTeams] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const [announcementFormVisible, setAnnouncementFormVisible] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState('normal');

  const [evalScores, setEvalScores] = useState({
    innovation: 0, accuracy: 0, ui: 0, privacy: 0, community: 0, notes: ''
  });

  const [draggedTeam, setDraggedTeam] = useState(null);
  
  // Use a ref to hold the queue list for keyboard navigation
  const queueListRef = useRef(null);
  const doneListRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [h, t, a] = await Promise.all([
        getHackathon(hackathonId),
        getTeams(hackathonId),
        getAnnouncements(hackathonId)
      ]);
      setHackathon(h);
      setTeams(t);
      setAnnouncements(a);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    loadData();

    const interval = setInterval(loadData, 15000);

    subscribeToHackathon(hackathonId, {
      onTeamChange: loadData,
      onAnnouncement: loadData,
      onHackathonChange: loadData
    });

    clearPageShortcuts();
    registerShortcut('?', 'Show shortcuts', () => toggleShortcutOverlay(true), 'Global');

    return () => {
      clearInterval(interval);
      unsubscribeAll();
      clearPageShortcuts();
    };
  }, [hackathonId, loadData]);

  // Handle Keyboard List Navigation
  useEffect(() => {
    if (queueListRef.current) {
      enableListNavigation(queueListRef.current, '.team-item', {
        onSelect: (item) => {
          const evaluateBtn = item.querySelector('[data-action="evaluate"]');
          if (evaluateBtn) evaluateBtn.click();
        }
      });
    }
    if (doneListRef.current) {
      enableListNavigation(doneListRef.current, '.team-item');
    }
  }, [teams, loading]);

  const copyJoinCode = async () => {
    if (!hackathon) return;
    try {
      await navigator.clipboard.writeText(hackathon.join_code);
      showToast({ title: 'Copied!', message: `Join code: ${hackathon.join_code}`, type: 'success', duration: 2000 });
    } catch {
      showToast({ title: 'Code', message: hackathon.join_code, type: 'info' });
    }
  };

  const handleAction = async (action, teamId) => {
    try {
      if (action === 'evaluate') {
        setEvalScores({ innovation: 0, accuracy: 0, ui: 0, privacy: 0, community: 0, notes: '' });
        await updateTeamStatus(teamId, 'being_evaluated');
      } else if (action === 'cancel-eval') {
        await updateTeamStatus(teamId, 'waiting');
      } else if (action === 'mark-done') {
        await updateTeamStatus(teamId, 'evaluated');
      } else if (action === 'mark-away') {
        await updateTeamStatus(teamId, 'away');
      } else if (action === 'reset-waiting') {
        await updateTeamStatus(teamId, 'waiting');
      } else if (action === 'delete-announcement') {
        if (window.confirm('Are you sure you want to delete this announcement?')) {
          await deleteAnnouncement(teamId); // 'teamId' is actually announcementId here
        }
      } else if (action === 'submit-eval') {
        const total = evalScores.innovation + evalScores.accuracy + evalScores.ui + evalScores.privacy + evalScores.community;
        await submitEvaluation(teamId, { ...evalScores, total });
      }
      await loadData();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, type: 'urgent' });
    }
  };

  const handleNextRound = async () => {
    if (hackathon.current_round >= hackathon.total_rounds) {
      showToast({ title: 'Final round', message: 'This is already the last round.', type: 'warning' });
      return;
    }
    const numInput = window.prompt("How many top teams should advance to the next round?");
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
        await eliminateTeams(eliminatedTeams.map(t => t.id));
      }
      for (const team of advancingTeams) {
        await updateTeamStatus(team.id, 'waiting');
      }
      const updatedHack = await updateHackathon(hackathonId, { current_round: hackathon.current_round + 1 });
      await createAnnouncement(hackathonId, `Round ${updatedHack.current_round} has started!`, 'important');
      await loadData();
      showToast({ title: 'Round Advanced', message: `Now on Round ${updatedHack.current_round}`, type: 'success' });
    } catch (err) {
      showToast({ title: 'Error', message: err.message, type: 'urgent' });
    }
  };

  const handleSendAnnouncement = async (e) => {
    e?.preventDefault();
    if (!announcementMessage.trim()) return;
    try {
      await createAnnouncement(hackathonId, announcementMessage, announcementPriority);
      setAnnouncementFormVisible(false);
      setAnnouncementMessage('');
      await loadData();
      showToast({ title: 'Sent', message: 'Announcement published', type: 'success' });
    } catch (err) {
      showToast({ title: 'Error', message: err.message, type: 'urgent' });
    }
  };

  const exportCSV = () => {
    let csvContent = "Sr. No,Team ID,Team Name,Team Leader Name,Innovation & Originality (20),Accuracy Reliability & Performance (20),User Interface Experience & Compatibility (20),Privacy Documentation & Scalability (20),Community Engagement & Demonstration / Presentation (20),Total (100),Notes\n";
    teams.forEach((team, i) => {
      const row = [
        i + 1, team.id, `"${team.name.replace(/"/g, '""')}"`, "",
        team.score_innovation || 0, team.score_accuracy || 0, team.score_ui || 0,
        team.score_privacy || 0, team.score_community || 0, team.score_total || 0,
        `"${(team.eval_notes || '').replace(/"/g, '""')}"`
      ];
      csvContent += row.join(",") + "\n";
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${hackathon.name.replace(/\s+/g, '_')}_evaluations.csv`;
    link.click();
    showToast({ title: 'Exported', message: 'CSV downloaded successfully', type: 'success' });
  };

  const handleEvalChange = (field, value) => {
    let val = parseInt(value, 10);
    if (isNaN(val)) val = 0;
    if (val > 20) val = 20;
    if (val < 0) val = 0;
    setEvalScores(prev => ({ ...prev, [field]: val }));
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-screen">
          <div className="spinner"></div>
          <div className="loading-screen__text">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error || !hackathon) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg></div>
        <div className="empty-state__title">Could not load hackathon</div>
        <div className="empty-state__desc">{error}</div>
        <button className="btn btn--primary" style={{ marginTop: 'var(--space-4)' }} onClick={() => navigate('/')}>Go Home</button>
      </div>
    );
  }

  const activeTeamsList = teams.filter(t => !t.is_eliminated);
  const waitingTeams = activeTeamsList.filter(t => t.status === 'waiting');
  const activeTeam = activeTeamsList.find(t => t.status === 'being_evaluated');
  const evaluatedTeams = activeTeamsList.filter(t => t.status === 'evaluated');
  const awayTeams = activeTeamsList.filter(t => t.status === 'away');

  const evalTotal = evalScores.innovation + evalScores.accuracy + evalScores.ui + evalScores.privacy + evalScores.community;

  return (
    <>
      <div className="dashboard" style={{ paddingTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button className="app-header__code" title="Click to copy join code" onClick={copyJoinCode}>
            <span className="app-header__code-label">Code</span>
            <span>{hackathon.join_code}</span>
          </button>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn--ghost btn--sm" onClick={() => navigate('/')}>← Home</button>
            <button className="app-header__shortcut-btn" onClick={() => toggleShortcutOverlay(true)}>?</button>
          </div>
        </div>

        <div className="page-title-area">
          <div>
            <h1 className="page-title"><span className="page-title__accent">{hackathon.name}</span></h1>
          </div>
          <div className="page-actions" style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button className="btn btn--ghost btn--sm" onClick={exportCSV}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'text-bottom' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export Scores
            </button>
            <button className="btn btn--secondary btn--sm" onClick={handleNextRound}>Next Round</button>
          </div>
        </div>

        <div className="dashboard__full">
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-card__value">{teams.length}</div><div className="stat-card__label">Total Teams</div></div>
            <div className="stat-card"><div className="stat-card__value stat-card__value--warning">{waitingTeams.length}</div><div className="stat-card__label">In Queue</div></div>
            <div className="stat-card"><div className="stat-card__value stat-card__value--success">{activeTeam ? 1 : 0}</div><div className="stat-card__label">Evaluating</div></div>
            <div className="stat-card"><div className="stat-card__value stat-card__value--accent">{evaluatedTeams.length}</div><div className="stat-card__label">Completed</div></div>
          </div>
        </div>

        <div className="dashboard__full">
          <div className="round-indicator">
            <div className="round-label">Round {hackathon.current_round} / {hackathon.total_rounds}</div>
            <div className="round-steps">
              {Array.from({ length: hackathon.total_rounds }, (_, i) => {
                const num = i + 1;
                return <div key={num} className={`round-step ${num < hackathon.current_round ? 'round-step--completed' : num === hackathon.current_round ? 'round-step--active' : ''}`} />;
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <div>
              <h2 className="card__title">Evaluation Queue</h2>
              <div className="card__subtitle">Use ↑↓ to navigate, Drag to reorder</div>
            </div>
            <span className="badge badge--waiting">{waitingTeams.length + (activeTeam ? 1 : 0)} remaining</span>
          </div>
          <div>
            {activeTeam && (
              <div className="team-item team-item--current" style={{ marginBottom: 'var(--space-3)', flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-4)', background: 'rgba(30,30,45,0.6)', padding: 'var(--space-4)', border: '1px solid var(--accent-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <span className="team-item__position team-item__position--active">▶</span>
                  <div className="team-item__info" style={{ flex: 1 }}>
                    <div className="team-item__name" style={{ fontSize: 'var(--text-lg)' }}>{activeTeam.name}</div>
                    {activeTeam.table_number && <div className="team-item__table">Table {activeTeam.table_number}</div>}
                  </div>
                  <span className="badge badge--active">Evaluating</span>
                </div>
                
                <div className="eval-form" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 'var(--space-4)', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {[
                        { key: 'innovation', label: 'Innovation & Originality' },
                        { key: 'accuracy', label: 'Accuracy & Performance' },
                        { key: 'ui', label: 'UI/UX & Compatibility' },
                        { key: 'privacy', label: 'Privacy & Scalability' },
                        { key: 'community', label: 'Community & Demo' }
                      ].map(crit => (
                        <div key={crit.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
                          <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>{crit.label} <span style={{ opacity: 0.5, fontSize: '0.85em' }}>(20)</span></label>
                          <input type="number" max="20" min="0" className="form-input eval-input" value={evalScores[crit.key]} onChange={(e) => handleEvalChange(crit.key, e.target.value)} style={{ width: '70px', padding: '4px 8px', textAlign: 'center' }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Evaluation Notes (Optional)</label>
                      <textarea className="form-textarea eval-notes" placeholder="Jot down quick thoughts..." value={evalScores.notes} onChange={e => setEvalScores(prev => ({ ...prev, notes: e.target.value }))} style={{ flex: 1, resize: 'none', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', lineHeight: 1.5 }}></textarea>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-2)', background: 'rgba(0,0,0,0.2)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontWeight: 600, fontSize: '1.1em', color: 'var(--text-primary)' }}>Total Score: <span className="eval-total" style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>{evalTotal}</span>/100</div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button className="btn btn--sm btn--ghost" onClick={() => handleAction('cancel-eval', activeTeam.id)}>Cancel</button>
                      <button className="btn btn--sm btn--primary" onClick={() => handleAction('submit-eval', activeTeam.id)}>Submit Evaluation</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {waitingTeams.length > 0 ? (
              <ul className="team-list" role="listbox" id="team-list-queue" ref={queueListRef}>
                {waitingTeams.map((team, i) => (
                  <li key={team.id} className="team-item" draggable="true" role="option" tabIndex={i === 0 && !activeTeam ? '0' : '-1'}
                      onDragStart={(e) => { setDraggedTeam(team); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragEnd={() => setDraggedTeam(null)}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderTop = '2px solid var(--accent-primary)'; }}
                      onDragLeave={(e) => e.currentTarget.style.borderTop = ''}
                      onDrop={async (e) => {
                        e.preventDefault(); e.currentTarget.style.borderTop = '';
                        if (!draggedTeam || draggedTeam.id === team.id) return;
                        try {
                          await updateTeamPosition(draggedTeam.id, team.eval_position);
                          await updateTeamPosition(team.id, draggedTeam.eval_position);
                          loadData();
                        } catch (err) {}
                      }}>
                    <span className="team-item__position">#{team.eval_position}</span>
                    <div className="team-item__info">
                      <div className="team-item__name">{team.name}</div>
                      {team.table_number && <div className="team-item__table">Table {team.table_number}</div>}
                    </div>
                    <span className="badge badge--waiting">Waiting</span>
                    <div className="team-item__actions">
                      <button className="btn btn--sm btn--primary" data-action="evaluate" onClick={() => handleAction('evaluate', team.id)}>Evaluate</button>
                      <button className="btn btn--sm btn--ghost" onClick={() => handleAction('mark-away', team.id)}>Away</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (!activeTeam && (
              <div className="empty-state">
                <div className="empty-state__icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.8 11.3 2 22l10.7-3.79"></path><path d="M4 3h.01"></path><path d="M22 8h.01"></path><path d="M15 2h.01"></path><path d="M22 20h.01"></path><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"></path><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"></path><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"></path><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"></path></svg></div>
                <div className="empty-state__title">Queue is clear!</div>
                <div className="empty-state__desc">All teams have been evaluated for this round.</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <h2 className="card__title">Announcements</h2>
            <button className="btn btn--sm btn--secondary" onClick={() => setAnnouncementFormVisible(true)}>+ New</button>
          </div>
          
          {announcementFormVisible && (
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                <textarea className="form-textarea" placeholder="Type your announcement..." rows="3" value={announcementMessage} onChange={(e) => setAnnouncementMessage(e.target.value)}></textarea>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                <select className="form-select" style={{ flex: '0 0 auto' }} value={announcementPriority} onChange={(e) => setAnnouncementPriority(e.target.value)}>
                  <option value="normal">Normal</option>
                  <option value="important">Important</option>
                  <option value="urgent">Urgent</option>
                </select>
                <div style={{ flex: 1 }}></div>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAnnouncementFormVisible(false)}>Cancel</button>
                <button type="button" className="btn btn--primary btn--sm" onClick={handleSendAnnouncement}>Send</button>
              </div>
            </div>
          )}

          <div className="announcement-feed">
            {announcements.length > 0 ? announcements.map(ann => (
              <div key={ann.id} className={`announcement ${ann.priority === 'urgent' ? 'announcement--urgent' : ann.priority === 'important' ? 'announcement--important' : ''}`}>
                <div className="announcement__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div>
                    <span className={`announcement__priority announcement__priority--${ann.priority}`}>{ann.priority}</span>
                    <span className="announcement__time">{formatTime(ann.created_at)}</span>
                  </div>
                  <button className="btn btn--ghost btn--sm" onClick={() => handleAction('delete-announcement', ann.id)} style={{ padding: '4px', height: 'auto' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
                <div className="announcement__message">{ann.message}</div>
              </div>
            )) : (
              <div className="empty-state">
                <div className="empty-state__icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg></div>
                <div className="empty-state__title">No announcements yet</div>
              </div>
            )}
          </div>
        </div>

        {(evaluatedTeams.length > 0 || awayTeams.length > 0) && (
          <div className="card dashboard__full">
            <div className="card__header">
              <h2 className="card__title">Completed & Away</h2>
              <span className="badge badge--done">{evaluatedTeams.length} done</span>
            </div>
            <ul className="team-list" role="list" ref={doneListRef}>
              {evaluatedTeams.map(team => (
                <li key={team.id} className="team-item" tabIndex="0">
                  <span className="team-item__position" style={{ opacity: 0.4 }}>#{team.eval_position}</span>
                  <div className="team-item__info">
                    <div className="team-item__name">{team.name}</div>
                    {team.table_number && <div className="team-item__table">Table {team.table_number}</div>}
                  </div>
                  <span className="badge badge--done">Done</span>
                  <button className="btn btn--sm btn--ghost" onClick={() => handleAction('reset-waiting', team.id)}>Reset</button>
                </li>
              ))}
              {awayTeams.map(team => (
                <li key={team.id} className="team-item" tabIndex="0">
                  <span className="team-item__position" style={{ opacity: 0.4 }}>#{team.eval_position}</span>
                  <div className="team-item__info">
                    <div className="team-item__name">{team.name}</div>
                    {team.table_number && <div className="team-item__table">Table {team.table_number}</div>}
                  </div>
                  <span className="badge badge--away">Away</span>
                  <button className="btn btn--sm btn--ghost" onClick={() => handleAction('reset-waiting', team.id)}>Bring Back</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
