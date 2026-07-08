# MISSION CONTROL: CIVIC CARE - Intelligent Automation Platform
You are an elite, Full-Stack Senior Software Engineer, UI/UX Expert, and Lead AI Architect. Your objective is to generate the complete codebase, system architecture, and UI implementation for an enterprise-grade civic tech web application named "CIVIC CARE".

This platform leverages multi-modal AI to automate the intake, classification, deduplication, and routing of civic complaints, entirely removing manual triage.

## 1. TECHNOLOGY STACK STRICT REQUIREMENTS
- **Frontend:** Plain HTML5, CSS3, and vanilla JavaScript (ES6+). No frontend framework (no React/Next.js/Vue). Use the Fetch API for all client-server communication and native DOM APIs for interactivity.
- **Styling:** Hand-written CSS (custom properties/CSS variables for theming) + custom glassmorphic utility classes. No Tailwind, no CSS-in-JS.
- **Animations:** CSS transitions/keyframes + vanilla JS (requestAnimationFrame / IntersectionObserver where needed) for page transitions and micro-interactions. No Framer Motion.
- **Maps:** Leaflet.js (loaded via CDN) with OpenStreetMap tiles, driven with vanilla JS.
- **Client State:** Plain JavaScript modules/objects (or the browser's localStorage/sessionStorage where persistence is needed) — no Zustand/React Query.
- **Backend API:** Node.js / Express.js (REST API, MVC folder structure: routes/controllers/services/models).
- **Database:** MongoDB, accessed via Mongoose ODM (replace all relational/PostGIS logic with MongoDB documents and geospatial indexes using `2dsphere`).
- **AI Core (Mock/Integration):** A separate Python / FastAPI microservice (serving mock YOLOv8, TensorFlow, spaCy) called from the Express backend via HTTP, OR a Node-native mock module if a single-service setup is preferred — clearly document whichever approach is used.
- **Authentication:** JWT-based auth implemented manually in Express (issue/verify tokens, auth middleware, bcrypt password hashing). Roles: CITIZEN, FIELD_OFFICER, DEPT_HEAD, ADMIN.

---

## 2. DATABASE SCHEMA (MONGOOSE DEFINITION)
You must use the following data models as your source of truth. Implement this as Mongoose schemas under `models/`.

```javascript
// models/User.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['CITIZEN', 'FIELD_OFFICER', 'DEPT_HEAD', 'ADMIN'],
    default: 'CITIZEN'
  },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
```

```javascript
// models/Department.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const DepartmentSchema = new Schema({
  name: { type: String, required: true, unique: true },
  officers: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model('Department', DepartmentSchema);
```

```javascript
// models/Complaint.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ComplaintSchema = new Schema({
  title: { type: String },
  description: { type: String, required: true },
  imageUrl: { type: String, required: true },

  // GeoJSON Point for MongoDB geospatial queries (requires 2dsphere index)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },

  // AI Generated Metadata
  aiCategory: { type: String, default: null },
  aiConfidenceScore: { type: Number, default: null },
  priority: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    default: null
  },
  status: {
    type: String,
    enum: [
      'PENDING_AI_REVIEW',
      'PENDING_ADMIN_REVIEW',
      'ROUTED',
      'ACCEPTED',
      'IN_PROGRESS',
      'RESOLVED',
      'CLOSED',
      'DUPLICATE'
    ],
    default: 'PENDING_AI_REVIEW'
  },

  // Relations
  citizenId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
  assignedOfficerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },

  // Deduplication
  masterComplaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Required for $near / $geoWithin geospatial queries used in deduplication
ComplaintSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Complaint', ComplaintSchema);
```

## 3. MULTI-MODAL AI PIPELINE ALGORITHMS
You must implement a service layer (`services/aiProcessing.js`, plain Node.js/CommonJS or ES modules) that orchestrates the following logic synchronously on the backend:

### A. Image & Text Validation
* **Image:** Simulate a YOLOv8 bounding box result that returns `detected_class` and `confidence_score`.
* **Text:** Simulate an NLP entity extraction that pulls `implied_class` from the citizen's description.
* **Validation Logic:** If `confidence_score > 0.75` AND `detected_class` matches `implied_class`, proceed. Else, flag `status: 'PENDING_ADMIN_REVIEW'`.

### B. Priority Prediction Formula
Implement a priority calculation function based on weighted variables. Let S be image severity (1-10), L be location criticality (1-10), and T be time since similar reports (1-10).
Calculate the Priority Index (P) using a weighted formula (e.g. `P = (S * 0.5) + (L * 0.3) + (T * 0.2)`), then:

* If P ≥ 8.5 → CRITICAL 🔴
* If 6.5 ≤ P < 8.5 → HIGH 🟠
* If 4.0 ≤ P < 6.5 → MEDIUM 🟡
* If P < 4.0 → LOW 🟢

### C. Strict Department Routing Matrix
Implement a strict lookup object/map for routing in plain JavaScript. The citizen NEVER selects the department.
* Garbage → "Sanitation Department"
* Pothole → "Roads Department"
* Water Leakage / Drainage Issue → "Municipality Department"
* Streetlight → "Electricity Department"
* Traffic Signal → "Traffic Police Department"
* Illegal Dumping → "Municipal Corporation"
* Fallen Tree → "Parks & Horticulture Department"

### D. Geospatial Deduplication (MongoDB Native)
Implement a utility `checkDuplicateComplaint(lat, lng, category)` that queries MongoDB directly using its native geospatial operators rather than a manual Haversine loop:

```javascript
// services/deduplication.js
async function checkDuplicateComplaint(Complaint, lat, lng, category) {
  const nearbyMatch = await Complaint.findOne({
    aiCategory: category,
    status: { $nin: ['RESOLVED', 'CLOSED', 'DUPLICATE'] },
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: 50 // meters
      }
    }
  });
  return nearbyMatch; // if found, caller sets masterComplaintId + status: 'DUPLICATE'
}
```
If a match within 50 meters of the same category is found, automatically set `masterComplaintId` to the existing complaint's `_id` and set `status` to `DUPLICATE`.

## 4. UI/UX "PRO-MAX" SPECIFICATIONS
The UI must feel like a modern, high-tech government command center, built with plain HTML/CSS/JS.

### A. Design System & Theme
* **Background:** Deep slate navy `#0B1120` (Dark Mode) or Off-white `#F8FAFC` (Light Mode), toggled via a `data-theme` attribute on `<html>` and CSS variables.
* **Cards (Glassmorphism):** Hand-written CSS class, e.g.:
  ```css
  .glass-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
    border-radius: 1rem;
  }
  ```
* **Typography:** Inter or Geist fonts loaded via `<link>` or `@font-face`. High contrast, large legible headers (e.g. `font-size: 2.25rem; font-weight: 800; letter-spacing: -0.02em;`).
* **Gradients:** Subtle mesh gradients in the background via CSS `background: linear-gradient(...)` layered with `radial-gradient(...)`.

### B. Citizen App Interface (`citizen-report.html`)
* **Step 1:** Full-screen drag-and-drop zone for image upload (native `dragover`/`drop` events), with a bouncy CSS `:hover`/`transform: scale()` transition.
* **Step 2:** Auto-fetching GPS overlay using the browser's `navigator.geolocation.getCurrentPosition`. Show a skeleton loader (CSS `animation: pulse` keyframes) while fetching coordinates.
* **Step 3:** Text area for description.
* **Submission State:** Upon clicking submit, do NOT just show a spinner. Use vanilla JS to append lines to a terminal-like `<pre>`/`<div>` element in sequence (via `setTimeout`/`async` delays) showing:
  1. `[+] Uploading image to secure vault...`
  2. `[+] AI analyzing image (YOLOv8)... [Confidence: 92% - Pothole]`
  3. `[+] NLP extracting context...`
  4. `[+] Scanning for duplicates in 50m radius...`
  5. `[+] Routed to Roads Department. Ticket #40921.`

### C. Public Landing Page (`index.html`)
This is the public-facing marketing/entry page for CIVIC CARE — the first thing any visitor (citizen, officer, or admin) sees before logging in or filing a report. It must visually sell the platform as a serious, modern civic-tech product, and serve as a live showcase of three distinct "premium surface" styles used deliberately in different zones of the page.

* **Hero Section:**
  * Full-viewport-height section with the mesh-gradient navy/off-white background from the global theme.
  * Large headline (e.g. "Civic issues, resolved at the speed of AI.") using the Inter/Geist display type scale.
  * A **frostglass** primary CTA card floating over the hero background — very light, icy, high-blur, almost-white translucency (see spec below), containing the "Report an Issue" and "Officer Login" buttons.
  * Subtle floating pulse-dot animations (reuse the map pulse-dot style) drifting in the background to visually tie the hero to the officer dashboard's map.
* **"How it works" Section:** 3–4 step cards (Upload → AI Classifies → Auto-Routed → Resolved) styled as **claymorphism** cards (see spec below), arranged in a responsive CSS Grid row.
* **Live Stats Strip:** A horizontal band of glassmorphic stat pills (e.g. "12,403 Issues Resolved", "38 Departments Connected", "92% AI Routing Accuracy") using the standard **glassmorphism** `.glass-card` style already defined in Section 4A, with animated count-up numbers on scroll (vanilla JS `IntersectionObserver` + `requestAnimationFrame`).
* **Department Showcase:** A grid of department logos/icons (Sanitation, Roads, Municipality, Electricity, Traffic Police, Municipal Corporation, Parks & Horticulture) each in a small claymorphism icon badge.
* **Footer CTA:** Repeat the frostglass card treatment with a final "Get Started" button and login links for each role.

#### Design system additions — three distinct surface styles
Define all three as reusable CSS classes in `public/css/surfaces.css`, clearly commented so it's obvious which class to reach for and when:

```css
/* === GLASSMORPHISM ===
   Use for: dashboard cards, ticket queue, stat pills — anything data-dense
   that needs to feel like a "readout" floating over the command-center bg. */
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
  border-radius: 1rem;
}

/* === FROSTGLASS ===
   Use for: hero CTAs, modals, footer CTA — high-blur, very light/icy,
   almost-white translucency. Softer and brighter than glassmorphism,
   meant to feel "premium" and calm rather than "data-dense". */
.frostglass-card {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 8px 32px rgba(31, 41, 55, 0.15),
    inset 0 1px 1px rgba(255, 255, 255, 0.8);
  border-radius: 1.5rem;
  color: #0B1120; /* dark text on the light frosted surface */
}

/* === CLAYMORPHISM ===
   Use for: "How it works" step cards, department icon badges — playful,
   soft, extruded/molded look with dual light+dark shadows and no
   transparency (opaque, matte, rounded like soft clay). */
.clay-card {
  background: #E9EDF5; /* light mode base; swap to a muted navy in dark mode */
  border-radius: 2rem;
  box-shadow:
    8px 8px 16px rgba(163, 177, 198, 0.6),
    -8px -8px 16px rgba(255, 255, 255, 0.8);
  border: none;
}
.clay-card:hover {
  box-shadow:
    6px 6px 12px rgba(163, 177, 198, 0.5),
    -6px -6px 12px rgba(255, 255, 255, 0.7);
  transform: translateY(-2px);
  transition: all 0.2s ease;
}
```

Dark-mode variants of each must also be defined (swap the base colors/shadow directions using the `data-theme="dark"` attribute selector), so all three surface styles remain legible and on-brand in both themes.

### D. Officer Command Dashboard (`officer-dashboard.html`)
* **Layout:** CSS Grid dashboard. Left sidebar for navigation, top bar for global stats, main content area split 60/40.
* **Map View (60% width):** Leaflet.js map (vanilla JS, via CDN script) displaying active complaints as colored pulse-dot markers (Red=Critical, Yellow=Medium) using custom Leaflet `divIcon`s with CSS pulse animations.
* **Incoming Queue (40% width):** A vertically scrolling, auto-updating list (via `fetch` polling or WebSocket, developer's choice) of glassmorphic cards rendered with vanilla JS DOM manipulation (`document.createElement`, template literals, or `<template>` tags). Each card must show:
  * Thumbnail of the issue.
  * Priority badge (CSS pulse animation for Critical).
  * AI confidence metric (e.g., "AI Match: 98%").
  * Two buttons: "Accept Issue" and "Dispatch Field Team", wired to `fetch` calls against the Express API.

## 5. GENERATION INSTRUCTIONS (EXECUTE IN THIS ORDER)
I need you to output production-ready code. Do not use placeholders like `// ...rest of the code`. Write the actual logic.

1. **Phase 1: Project Setup & Models.** Output the Mongoose models (`models/User.js`, `models/Department.js`, `models/Complaint.js`) shown above.
2. **Phase 2: AI Core Services.** Output `services/aiProcessing.js` containing the validation, priority math, and routing matrix logic, plus `services/deduplication.js` containing the MongoDB-native geospatial deduplication logic.
3. **Phase 3: The API Routes.** Output `routes/complaints.js` and `controllers/complaintsController.js` showing the exact POST request flow (Receive → AI Engine → Deduplicate → Save to MongoDB → Return JSON), wired up in a plain Express `app.js`/`server.js`.
4. **Phase 4: Citizen UI.** Output `public/citizen-report.html`, `public/css/citizen-report.css`, and `public/js/citizen-report.js` complete with drag-and-drop, CSS animations, and the terminal-style loading sequence.
5. **Phase 5: Landing Page.** Output `public/index.html`, `public/css/surfaces.css` (the shared glassmorphism/frostglass/claymorphism classes), and `public/js/landing.js` (count-up stats, scroll reveals) implementing the hero, "how it works", stats strip, department showcase, and footer CTA described in Section 4C.
6. **Phase 6: Officer UI.** Output `public/officer-dashboard.html`, `public/css/officer-dashboard.css`, and `public/js/officer-dashboard.js` featuring the stats grid, Leaflet map integration, and interactive ticket cards.

Write the code cleanly, with comprehensive inline comments explaining the AI logic and UI decisions.
