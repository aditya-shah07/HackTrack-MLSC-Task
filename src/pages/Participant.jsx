import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { showToast, formatTime } from '../lib/utils.js';
import { getHackathon, getTeams, getAnnouncements, subscribeToHackathon, unsubscribeAll } from '../lib/store.js';
import { registerShortcut, clearPageShortcuts, toggleShortcutOverlay } from '../lib/keyboard.js';

export default function Participant() {
  const { hackathonId, teamId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hackathon, setHackathon] = useState(null);
  const [teams, setTeams] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Use refs to access latest state in real-time callbacks without dependency cycles
  const stateRef = useRef({ myTeamStatus: null, hackathonRound: null });

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
      return { h, t, a };
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return null;
    }
  }, [hackathonId]);

  useEffect(() => {
    loadData().then(data => {
      if (data) {
        const myTeam = data.t.find(team => team.id === teamId);
        stateRef.current.myTeamStatus = myTeam?.status;
        stateRef.current.hackathonRound = data.h?.current_round;
      }
    });

    // Refresh every 10 seconds
    const interval = setInterval(loadData, 10000);

    // Setup Real-time
    subscribeToHackathon(hackathonId, {
      onTeamChange: async () => {
        const data = await loadData();
        if (!data) return;
        const newTeam = data.t.find(t => t.id === teamId);
        const previousStatus = stateRef.current.myTeamStatus;
        
        if (newTeam && newTeam.status !== previousStatus) {
          stateRef.current.myTeamStatus = newTeam.status;
          if (newTeam.status === 'being_evaluated') {
            showToast({ title: "It's Your Turn!", message: 'Judges are coming to your table!', type: 'urgent', duration: 10000 });
          } else if (newTeam.status === 'evaluated') {
            showToast({ title: 'Evaluation Complete', message: 'Great job! Your evaluation is done.', type: 'success' });
          } else if (newTeam.status === 'waiting') {
            showToast({ title: 'Queue Updated', message: 'You are back in the evaluation queue.', type: 'info' });
          }
        }
      },
      onAnnouncement: async (payload) => {
        const ann = payload.new;
        showToast({
          title: 'Announcement',
          message: ann.message,
          type: ann.priority === 'urgent' ? 'urgent' : ann.priority === 'important' ? 'warning' : 'info',
          duration: ann.priority === 'urgent' ? 10000 : 5000,
        });
        await loadData();
      },
      onHackathonChange: async () => {
        const oldRound = stateRef.current.hackathonRound;
        const data = await loadData();
        if (data && data.h.current_round !== oldRound) {
          stateRef.current.hackathonRound = data.h.current_round;
          showToast({ title: 'New Round', message: `Round ${data.h.current_round} has started!`, type: 'warning', duration: 8000 });
        }
      }
    });

    // Keyboard Shortcuts
    clearPageShortcuts();
    registerShortcut('r', 'Refresh data', loadData, 'Participant');
    registerShortcut('h', 'Go to home', () => navigate('/'), 'Navigation');
    registerShortcut('?', 'Show Shortcuts', () => toggleShortcutOverlay(true), 'Global');

    return () => {
      clearInterval(interval);
      unsubscribeAll();
      clearPageShortcuts();
    };
  }, [hackathonId, teamId, loadData, navigate]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <div className="loading-screen__text">Loading your dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg></div>
        <div className="empty-state__title">Could not load hackathon</div>
        <div className="empty-state__desc">{error}</div>
        <button className="btn btn--primary" style={{ marginTop: 'var(--space-4)' }} onClick={() => navigate('/')}>Go Home</button>
      </div>
    );
  }

  const myTeam = teams.find(t => t.id === teamId);
  if (!myTeam) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
        <div className="empty-state__title">Team not found</div>
        <div className="empty-state__desc">Your team may have been removed from this hackathon.</div>
        <button className="btn btn--primary" style={{ marginTop: 'var(--space-4)' }} onClick={() => navigate('/')}>Go Home</button>
      </div>
    );
  }

  const waitingTeams = teams.filter(t => t.status === 'waiting');
  const activeTeam = teams.find(t => t.status === 'being_evaluated');
  const evaluatedTeams = teams.filter(t => t.status === 'evaluated');
  const totalInQueue = waitingTeams.length + (activeTeam ? 1 : 0);

  let queuePosition = 0;
  if (myTeam.status === 'waiting') {
    const waitingBefore = waitingTeams.filter(t => t.eval_position < myTeam.eval_position);
    queuePosition = waitingBefore.length + 1 + (activeTeam ? 1 : 0);
  } else if (myTeam.status === 'being_evaluated') {
    queuePosition = 0;
  }

  let heroIcon, heroTitle, heroSubtitle, heroClass, heroPosition;
  if (myTeam.is_eliminated) {
    heroIcon = <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
    heroTitle = 'Eliminated';
    heroSubtitle = 'Your team did not advance to the next round. Thank you for participating!';
    heroClass = 'status-hero--eliminated';
    heroPosition = '—';
  } else {
    switch (myTeam.status) {
      case 'waiting':
        heroIcon = <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14"></path><path d="M5 2h14"></path><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path></svg>;
        heroTitle = queuePosition <= 2 ? "You're almost up!" : 'In Queue';
        heroSubtitle = queuePosition === 1 ? "You're next! Get ready for your evaluation." : `${queuePosition - 1} team${queuePosition - 1 > 1 ? 's' : ''} ahead of you`;
        heroClass = 'status-hero--waiting';
        heroPosition = `#${queuePosition}`;
        break;
      case 'being_evaluated':
        heroIcon = <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>;
        heroTitle = "It's Your Turn!";
        heroSubtitle = "Judges are at your table. Show them what you've built!";
        heroClass = 'status-hero--active';
        heroPosition = <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>;
        break;
      case 'evaluated':
        heroIcon = <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
        heroTitle = 'Evaluation Complete';
        heroSubtitle = 'Your evaluation for this round is done. Great job!';
        heroClass = 'status-hero--done';
        heroPosition = '✓';
        break;
      case 'away':
        heroIcon = <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
        heroTitle = 'Marked as Away';
        heroSubtitle = 'The organizer marked your team as away from your spot.';
        heroClass = 'status-hero--waiting';
        heroPosition = '—';
        break;
      default:
        heroIcon = <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14"></path><path d="M5 2h14"></path><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path></svg>;
        heroTitle = 'Standby';
        heroSubtitle = 'Waiting for updates...';
        heroClass = 'status-hero--waiting';
        heroPosition = '—';
    }
  }

  return (
    <>
      <header id="app-header" role="banner">
        <nav className="app-header" aria-label="Participant navigation">
          <div className="app-header__inner">
            <div className="app-header__brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              <span className="app-header__logo" aria-hidden="true">
                <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              </span>
              <span className="app-header__title">HackTrack</span>
            </div>
            <div className="app-header__meta">
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>Team: {myTeam.name}</span>
            </div>
            <div className="app-header__nav">
              <button className="btn btn--ghost btn--sm" onClick={() => navigate('/')}>← Leave</button>
              <button className="app-header__shortcut-btn" onClick={() => toggleShortcutOverlay(true)}>?</button>
            </div>
          </div>
        </nav>
      </header>

      <div className="dashboard">
        <div className="page-title-area">
        <h1 className="page-title"><span className="page-title__accent">{hackathon.name}</span></h1>
      </div>

      <div className="card dashboard__full">
        <div className="card__header">
          <h2 className="card__title">Announcements</h2>
          <span className="badge badge--done">{announcements.length}</span>
        </div>
        <div className="announcement-feed">
          {announcements.length > 0 ? announcements.map(ann => (
            <div key={ann.id} className={`announcement ${ann.priority === 'urgent' ? 'announcement--urgent' : ann.priority === 'important' ? 'announcement--important' : ''}`} tabIndex="0" role="article">
              <div className="announcement__header">
                <span className={`announcement__priority announcement__priority--${ann.priority}`}>{ann.priority}</span>
                <span className="announcement__time">{formatTime(ann.created_at)}</span>
              </div>
              <div className="announcement__message">{ann.message}</div>
            </div>
          )) : (
            <div className="empty-state">
              <div className="empty-state__icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg></div>
              <div className="empty-state__title">No announcements yet</div>
              <div className="empty-state__desc">Stay tuned for updates from the organizer.</div>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard__full">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card__value">{hackathon.current_round}/{hackathon.total_rounds}</div>
            <div className="stat-card__label">Current Round</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value stat-card__value--warning">{totalInQueue}</div>
            <div className="stat-card__label">In Queue</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value stat-card__value--accent">{evaluatedTeams.length}</div>
            <div className="stat-card__label">Evaluated</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">{teams.length}</div>
            <div className="stat-card__label">Total Teams</div>
          </div>
        </div>
      </div>

      <div className="dashboard__full">
        <div className="round-indicator">
          <div className="round-label">Round {hackathon.current_round} / {hackathon.total_rounds}</div>
          <div className="round-steps">
            {Array.from({ length: hackathon.total_rounds }, (_, i) => {
              const num = i + 1;
              let cls = 'round-step';
              if (num < hackathon.current_round) cls += ' round-step--completed';
              else if (num === hackathon.current_round) cls += ' round-step--active';
              return <div key={num} className={cls}></div>;
            })}
          </div>
        </div>
      </div>

      <div className={`status-hero ${heroClass}`} role="status" aria-live="polite">
        <div className="status-hero__icon" aria-hidden="true">{heroIcon}</div>
        <h2 className="status-hero__title">{heroTitle}</h2>
        <p className="status-hero__subtitle">{heroSubtitle}</p>
        <div className="status-hero__position">{heroPosition}</div>
        <div className="status-hero__position-label">
          {myTeam.is_eliminated ? 'Status' : myTeam.status === 'waiting' ? 'Position in queue' : myTeam.status === 'being_evaluated' ? 'Currently being evaluated' : 'Status'}
        </div>
      </div>

      <div className="card dashboard__full">
        <div className="card__header">
          <h2 className="card__title">Live Queue</h2>
          <span className="badge badge--waiting">{totalInQueue} remaining</span>
        </div>
        {(activeTeam || waitingTeams.length > 0) ? (
          <ul className="team-list" role="list" aria-label="Evaluation queue">
            {activeTeam && (
              <li className={`team-item ${activeTeam.id === teamId ? 'team-item--you' : 'team-item--current'}`} tabIndex="0">
                <span className="team-item__position team-item__position--active">▶</span>
                <div className="team-item__info">
                  <div className="team-item__name">
                    {activeTeam.name} {activeTeam.id === teamId ? ' (You)' : ''}
                  </div>
                  {activeTeam.table_number && <div className="team-item__table">Table {activeTeam.table_number}</div>}
                </div>
                <span className="badge badge--active">Evaluating</span>
              </li>
            )}
            {waitingTeams.map((team, i) => (
              <li key={team.id} className={`team-item ${team.id === teamId ? 'team-item--you' : ''}`} tabIndex="0">
                <span className="team-item__position">#{i + 1 + (activeTeam ? 1 : 0)}</span>
                <div className="team-item__info">
                  <div className="team-item__name">
                    {team.name} {team.id === teamId ? ' (You)' : ''}
                  </div>
                  {team.table_number && <div className="team-item__table">Table {team.table_number}</div>}
                </div>
                <span className="badge badge--waiting">Waiting</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.8 11.3 2 22l10.7-3.79"></path><path d="M4 3h.01"></path><path d="M22 8h.01"></path><path d="M15 2h.01"></path><path d="M22 20h.01"></path><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"></path><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"></path><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"></path><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"></path></svg></div>
            <div className="empty-state__title">Queue is clear!</div>
            <div className="empty-state__desc">All teams have been evaluated.</div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
