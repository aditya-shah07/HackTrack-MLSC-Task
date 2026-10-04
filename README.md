# ⚡ HackTrack — Live Hackathon Command Center

A real-time hackathon dashboard that fixes the chaos of evaluation day. Track evaluations, coordinate teams, and push announcements — all live, all keyboard-accessible.

## The Annoyance

During hackathons, participants are constantly anxious — *"When are the judges coming?" "Which round are we in?" "Where's Team 7?"* — and organizers are overwhelmed trying to relay information to 20+ teams simultaneously. Everyone is in the dark, and it kills the experience.

**Who it annoys:** Every hackathon participant and organizer. We've experienced this firsthand at multiple events.

## Constraint: #4 — No Mouse

The entire app is fully usable with **only a keyboard**. No mouse required.

- **Tab / Shift+Tab** to navigate between elements
- **Arrow keys** for list navigation
- **Enter / Space** to select / activate
- **Keyboard shortcuts** for every major action (press `?` to see all)
- **Visible focus indicators** — glowing purple outlines on every focused element
- **Skip-to-content link** for screen readers
- **ARIA labels & live regions** for screen reader announcements
- **Focus trapping** in modals/overlays

## Features

### For Organizers
- 🎛️ **Control Panel** — Manage evaluation queue, mark teams as evaluating/done/away
- 📢 **Announcements** — Push real-time announcements with priority levels (Normal, Important, Urgent)
- 🔄 **Round Management** — Advance rounds, auto-reset all teams to queue
- 📊 **Stats** — At-a-glance view of total/waiting/evaluating/completed teams
- 🔑 **Join Code** — Share a 6-character code for teams to join

### For Participants
- 🔥 **Live Status Hero** — Big, prominent card showing your current status
- 📍 **Queue Position** — Know exactly where you are and how many teams are ahead
- 📢 **Real-time Alerts** — Toast notifications when it's your turn or new announcements drop
- 📋 **Live Queue** — Watch the evaluation queue move in real-time

## Tech Stack

- **Frontend:** Vite + Vanilla JS + Vanilla CSS
- **Backend/DB:** Supabase (PostgreSQL + Real-time subscriptions)
- **No frameworks** — pure DOM manipulation for performance
- **No build dependencies** beyond Vite and Supabase client

## Run it locally

### Prerequisites
- Node.js 18+
- A Supabase account (free tier works)

### Setup

```bash
# 1. Clone and install
git clone <your-repo-url>
cd hacktrack
npm install

# 2. Set up Supabase
#    - Create a new project at https://supabase.com
#    - Go to SQL Editor and run the contents of supabase-schema.sql
#    - Go to Settings > API to get your URL and anon key

# 3. Create .env file
cp .env.example .env
# Edit .env and fill in your Supabase credentials

# 4. Run the dev server
npm run dev
```

### Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key |

## AI Usage

- Used AI (Antigravity/Claude) for scaffolding the project structure, CSS design system, and component code generation
- **Fixed manually:** Router param extraction bug where nested routes (`/participant/:hackathonId/:teamId`) weren't matching correctly — had to fix the pattern matching logic
- AI-generated CSS required manual tuning for focus indicator contrast ratios to meet WCAG 2.1 AA standards

## Not Done / Half-Working

- Browser notifications (requested but not granted in most browsers by default)
- Drag-to-reorder queue (conflicts with no-mouse constraint — intentionally excluded)
- Team deletion from organizer panel
- Persistent login across sessions (by design — constraint #4 focuses on keyboard, not auth)

## The Two Testers

*(Fill in after testing with two people)*

- **Tester 1:** ...
- **Tester 2:** ...
