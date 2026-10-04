import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Organizer from './pages/Organizer.jsx';
import Participant from './pages/Participant.jsx';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine if we should show header actions based on route
  const isHome = location.pathname === '/';

  return (
    <header id="app-header" role="banner">
      <nav className="app-header" aria-label="Main navigation">
        <div className="app-header__inner">
          <div className="app-header__brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <span className="app-header__logo" aria-hidden="true">
              <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </span>
            <span className="app-header__title">HackTrack</span>
          </div>

          {isHome && (
            <>
              <div className="app-header__links" style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginLeft: '2rem' }}>
                <a href="https://github.com/aditya-shah07/HackTrack-MLSC-Task" target="_blank" rel="noopener noreferrer" className="app-header__link" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'color 0.2s ease' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
                  GitHub Repo
                </a>
              </div>

              <div className="app-header__nav">
                <a href="#" className="app-header__login" onClick={(e) => e.preventDefault()}>Log in</a>
                <button className="app-header__cta-btn">Get Started</button>
              </div>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <main id="main-content" role="main" tabIndex="-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/organizer/:id" element={<Organizer />} />
          <Route path="/participant/:hackathonId/:teamId" element={<Participant />} />
        </Routes>
      </main>
    </>
  );
}
