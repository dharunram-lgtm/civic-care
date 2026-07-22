# CIVIC CARE — Project TODO

## Project Setup
- [x] package.json with all dependencies
- [x] .env configuration
- [x] server.js with Express + MongoDB

## Backend
- [x] Models: User, Department, Complaint (Mongoose)
- [x] Auth Middleware (JWT, role-based)
- [x] Auth Routes (register, login, me)
- [x] Complaints Controller (CRUD, stats)
- [x] AI Processing Service (YOLOv8 sim, NLP, priority, routing)
- [x] Deduplication Service (MongoDB $near geospatial)
- [x] Complaints Routes (+ multer upload)
- [x] Departments Controller/Routes

## Frontend — Landing Page (index.html)
- [x] WebGL Three.js particle background
- [x] Hero section with frostglass CTA card
- [x] "How it works" claymorphism step cards
- [x] Live Stats Strip (glassmorphism) with animated counters
- [x] Department Showcase (claymorphism badges)
- [x] Footer CTA (frostglass)
- [x] Count-up animations on scroll (IntersectionObserver)
- [x] Parallax / mouse-tilt on frostglass card
- [x] Smooth scroll and reveal animations

## Frontend — Citizen Report (citizen-report.html)
- [x] Drag-and-drop image upload with preview
- [x] GPS auto-fetch with skeleton loader
- [x] Manual coordinate input fallback
- [x] Description textarea with char count
- [x] Multi-step form with progress indicator
- [x] Terminal-style loading animation (async delays)
- [x] Result modal (success / duplicate / error)
- [x] Report another flow

## Frontend — Officer Dashboard (officer-dashboard.html)
- [x] Sidebar navigation layout
- [x] Top bar with live stats pills
- [x] Leaflet.js map with OpenStreetMap tiles
- [x] Pulse-dot colored markers by priority
- [x] Incoming ticket queue with filters
- [x] Ticket cards (glassmorphism) with priority badges
- [x] Accept / Dispatch buttons
- [x] Stats grid (total, resolved, critical, pending)

## Design System (surfaces.css)
- [x] Glassmorphism (.glass-card) — data-dense cards
- [x] Frostglass (.frostglass-card) — hero CTAs, modals
- [x] Claymorphism (.clay-card) — step cards, badges
- [x] Dark/Light mode via data-theme attribute
- [x] Theme toggle button on all pages

## Polish
- [x] WebGL Three.js smooth particle field
- [x] Theme toggle (dark/light) with CSS variables
- [x] CSS animations (pulse-dot, float, fadeInUp, shimmer)
- [x] Scroll reveal animations
- [x] Responsive layout (mobile-friendly)
- [ ] Add more mock data for dashboard
- [ ] Seed script for demo data
- [ ] WebSocket real-time updates
- [ ] Unit tests

## Run
- [x] start.bat script
- [x] Static fallback when MongoDB is unavailable
