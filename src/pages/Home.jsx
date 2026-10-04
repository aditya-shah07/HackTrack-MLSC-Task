import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession } from '../lib/utils.js';
import { createHackathon, getHackathonByCode, registerTeam } from '../lib/store.js';
import { showToast } from '../lib/utils.js';

export default function Home() {
  const navigate = useNavigate();
  const [session, setSessionState] = useState(null);
  const [isOrganizer, setIsOrganizer] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  const [createName, setCreateName] = useState('');
  const [createRounds, setCreateRounds] = useState(3);
  const [isCreating, setIsCreating] = useState(false);

  const [joinCode, setJoinCode] = useState('');
  const [joinTeamName, setJoinTeamName] = useState('');
  const [joinTableNum, setJoinTableNum] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const s = getSession();
    setSessionState(s);
    setIsOrganizer(s && s.role === 'organizer' && s.hackathonId);
  }, []);

  const handleCreate = async () => {
    if (!createName) return;
    setIsCreating(true);
    try {
      const hackathon = await createHackathon(createName, createRounds);
      const { setSession } = await import('../lib/utils.js');
      setSession({
        hackathonId: hackathon.id,
        role: 'organizer',
        joinCode: hackathon.join_code,
      });
      navigate(`/organizer/${hackathon.id}`);
    } catch (err) {
      console.error(err);
      showToast({ title: 'Error', message: err.message, type: 'urgent' });
      setIsCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode || joinCode.length < 6 || !joinTeamName) return;
    setIsJoining(true);
    try {
      const hackathon = await getHackathonByCode(joinCode);
      const team = await registerTeam(hackathon.id, joinTeamName, joinTableNum ? parseInt(joinTableNum) : null);
      const { setSession } = await import('../lib/utils.js');
      setSession({
        hackathonId: hackathon.id,
        teamId: team.id,
        role: 'participant',
        teamName: team.name,
      });
      navigate(`/participant/${hackathon.id}/${team.id}`);
    } catch (err) {
      console.error(err);
      showToast({ title: 'Error', message: 'Invalid code or could not join.', type: 'urgent' });
      setIsJoining(false);
    }
  };

  return (
    <>
      <header id="app-header" role="banner">
        <nav className="app-header" aria-label="Main navigation">
          <div className="app-header__inner">
            <div className="app-header__brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              <span className="app-header__logo" aria-hidden="true">
                <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              </span>
              <span className="app-header__title">HackTrack</span>
            </div>

            <div className="app-header__links" style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginLeft: '2rem' }}>
              <a href="https://github.com/aditya-shah07/HackTrack-MLSC-Task" target="_blank" rel="noopener noreferrer" className="app-header__link" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'color 0.2s ease' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
                GitHub Repo
              </a>
            </div>
          </div>
        </nav>
      </header>

      <div className="home">
        <div className="home__brand">
          <span className="home__icon" aria-hidden="true"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></span>
          <h1 className="home__title">HackTrack</h1>
          <p className="home__subtitle">
            Say goodbye to hackathon chaos! Track evaluations, hype up your teams, and run your event with a smile ✨
          </p>
          <div className="home__cta-group">
            <button className="home__cta-primary">Explore Dashboard</button>
          </div>
        </div>

        <div className="home__actions" role="group" aria-label="Choose your role">
          {isOrganizer && (
            <button className="home__action-card" 
                    tabIndex="0"
                    style={{ gridColumn: '1 / -1', borderColor: 'var(--accent-secondary)' }}
                    onClick={() => navigate(`/organizer/${session.hackathonId}`)}>
              <div className="home__action-icon" aria-hidden="true" style={{ color: 'var(--accent-secondary)' }}>
                <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"></path><path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path></svg>
              </div>
              <div className="home__action-content">
                <div className="home__action-title">Resume Active Event</div>
                <div className="home__action-desc">Re-enter the dashboard for your currently active hackathon.</div>
              </div>
            </button>
          )}

          <button className="home__action-card" onClick={() => setCreateModalOpen(true)}>
            <div className="home__action-icon" aria-hidden="true"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg></div>
            <div className="home__action-content">
              <div className="home__action-title">Create Hackathon</div>
              <div className="home__action-desc">Set up your event and get a join code for participants.</div>
            </div>
          </button>

          <button className="home__action-card" onClick={() => setJoinModalOpen(true)}>
            <div className="home__action-icon" aria-hidden="true"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg></div>
            <div className="home__action-content">
              <div className="home__action-title">Join Hackathon</div>
              <div className="home__action-desc">Enter your team code and track your evaluation status live.</div>
            </div>
          </button>
        </div>
      </div>

      {createModalOpen && (
        <div className="modal-backdrop modal-backdrop--active" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) setCreateModalOpen(false); }}>
          <div className="modal">
            <div className="modal__header">
              <h2 className="modal__title">Create Hackathon</h2>
            </div>
            <div className="modal__body">
              <div className="form-group">
                <label className="form-label">Hackathon Name</label>
                <input className="form-input" value={createName} onChange={(e) => setCreateName(e.target.value)} type="text" placeholder="e.g. MLSC WebDev" />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setCreateModalOpen(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleCreate} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {joinModalOpen && (
        <div className="modal-backdrop modal-backdrop--active" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) setJoinModalOpen(false); }}>
          <div className="modal">
            <div className="modal__header">
              <h2 className="modal__title">Join Hackathon</h2>
            </div>
            <div className="modal__body">
              <div className="form-group">
                <label className="form-label">Join Code</label>
                <input className="form-input" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength="6" type="text" />
              </div>
              <div className="form-group">
                <label className="form-label">Team Name</label>
                <input className="form-input" value={joinTeamName} onChange={(e) => setJoinTeamName(e.target.value)} type="text" />
              </div>
              <div className="form-group">
                <label className="form-label">Table Number (optional)</label>
                <input className="form-input" value={joinTableNum} onChange={(e) => setJoinTableNum(e.target.value)} type="number" />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setJoinModalOpen(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleJoin} disabled={isJoining}>
                {isJoining ? 'Joining...' : 'Join Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
