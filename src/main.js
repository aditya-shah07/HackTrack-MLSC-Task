/**
 * HackTrack — Main Entry Point
 * Real-time hackathon command center
 */
import './style.css';
import { route, initRouter } from './lib/router.js';
import { initKeyboard, registerShortcut } from './lib/keyboard.js';
import { homePage } from './pages/home.js';
import { organizerPage } from './pages/organizer.js';
import { participantPage } from './pages/participant.js';

// Initialize keyboard system
initKeyboard();

// Register global shortcuts
registerShortcut('Escape', 'Close dialog / overlay', () => {}, 'Global');

// Register routes
route('/', () => homePage());
route('/organizer/:id', (params) => organizerPage(params));
route('/participant/:hackathonId/:teamId', (params) => participantPage(params));

// Start routing
initRouter();

// Console branding
console.log(
  '%cHackTrack%c — Live Hackathon Dashboard',
  'color: #7c6aff; font-weight: bold; font-size: 16px;',
  'color: #9d9bb0; font-size: 14px;'
);
console.log(
  '%cFully keyboard accessible — press ? for shortcuts',
  'color: #6b6880; font-size: 12px;'
);
