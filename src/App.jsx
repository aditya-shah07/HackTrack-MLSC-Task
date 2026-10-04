import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Organizer from './pages/Organizer.jsx';
import Participant from './pages/Participant.jsx';

export default function App() {
  return (
    <main id="main-content" role="main" tabIndex="-1">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/organizer/:id" element={<Organizer />} />
        <Route path="/participant/:hackathonId/:teamId" element={<Participant />} />
      </Routes>
    </main>
  );
}
