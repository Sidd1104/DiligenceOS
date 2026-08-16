---
name: DiligenceOS
colors:
  surface: '#0f131d'
  surface-dim: '#0f131d'
  surface-bright: '#353944'
  surface-container-lowest: '#0a0e18'
  surface-container-low: '#171b26'
  surface-container: '#1c1f2a'
  surface-container-high: '#262a35'
  surface-container-highest: '#313540'
  on-surface: '#dfe2f1'
  on-surface-variant: '#c3c6d7'
  inverse-surface: '#dfe2f1'
  inverse-on-surface: '#2c303b'
  outline: '#8d90a0'
  outline-variant: '#434655'
  surface-tint: '#b4c5ff'
  primary: '#2563eb'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#eeefff'
  secondary: '#10b981'
  on-secondary: '#003824'
  secondary-container: '#065f46'
  tertiary: '#f59e0b'
  on-tertiary: '#451a03'
  tertiary-container: '#78350f'
  error: '#ef4444'
  on-error: '#450a0a'
  error-container: '#7f1d1d'
  background: '#0b0f19'
  on-background: '#f8fafc'
  surface-variant: '#131b2e'
typography:
  headline-xl:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  table-data:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  mono-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1600px
  edge-margin: 2rem
  gutter: 1rem
  panel-gap: 1px
  unit: 4px
---

# DiligenceOS Design System — Institutional Due Diligence Platform

## Brand & Style Direction
The design system is engineered for high-stakes institutional decision-making. It prioritizes information density and clarity over decorative flair, evoking a sense of **quiet confidence** and **unshakeable authority**.

The aesthetic is a hybrid of **Modern Institutional Corporate** and **Restrained Glassmorphism**, specifically tailored for a dark-only enterprise environment. It utilizes ultra-thin 1px glass borders (`border-white/10`) and subtle tonal layering to organize complex datasets without visual clutter. The interface feels like a precision instrument—highly responsive, dense with data, yet breathable through rigorous grid alignment and restrained use of color.

---

## 1. Color Palette Tokens

- **Base Background**: Deep Obsidian Slate (`#0B0F19`) — Global backdrop reducing eye strain during deep analysis.
- **Panel & Surface Levels**:
  - Level 0 (Global Base): `#0B0F19`
  - Level 1 (Panels / Containers): `#131B2E`
  - Level 2 (Hover States / Modals): `#1C273E` with 5% light overlay
- **Primary Accent**: Institutional Sapphire Blue (`#2563EB`) — The sole color for primary actions, active navigation, and focus rings.
- **Semantic Financial Health Colors**:
  - **Positive / Confirmed**: Emerald Growth (`#10B981`) — Completed extractions, verified statements, positive risk scores.
  - **Warning / Risk Factor**: Amber Risk (`#F59E0B`) — Queued status, moderate risk flags, pending review.
  - **Critical / Alert**: Crimson Flag (`#EF4444`) — High-risk flags, malware/corrupt PDF alerts, failed extractions.
- **Text & Foreground Tokens**:
  - Primary Text: Crisp Silver White (`#F8FAFC`)
  - Muted Text / Secondary: Muted Slate (`#94A3B8`)
  - Borders: 1px Solid Glass Edge (`rgba(255, 255, 255, 0.1)`)

---

## 2. Typography Strategy

A dual-font system balancing visual authority with dense legibility:
- **Heading Font**: `Outfit` — Used for page titles, section headers, and high-level KPIs. Delivers modern institutional character.
- **Body & Data Font**: `Inter` — Workhorse font for all data grids, financial statements, and body text. High x-height ensures maximum clarity at small font sizes (11px–14px).
- **Monospace Font**: `JetBrains Mono` — Used for ticker symbols, financial metrics, page counters, and cosine similarity percentages.

---

## 3. Depth, Elevation & Micro-interactions

- **Tonal Elevation**: Surfaces elevate via color shifts rather than heavy drop shadows.
- **Borders**: All cards, modals, and panel containers feature a 1px glass border (`rgba(255, 255, 255, 0.1)`).
- **Shadows**: Single ambient shadow for floating overlays/modals: `0 20px 40px rgba(0,0,0,0.4)`.
- **Hero 3D Parallax Moment**: Restricted strictly to the Dashboard telemetry hero section (3D glassmorphic analytics widget). All other screens maintain flat, hyper-dense operational focus.

---

## 4. Screen Breakdown & Component Specs

1. **Dashboard (Company Workspace List)**:
   - Institutional Portfolio Telemetry hero section with 3D glassmorphic telemetry widget.
   - Company grid/table with ticker symbols, industry chips, total document counts, extraction health indicators, and risk score badges.
2. **Company Overview (Documents & Extraction Health)**:
   - Header with company metadata (Ticker, Market Cap, Sector) and primary CTA button "Launch AI Research".
   - Drag-and-drop PDF upload dropzone with 50MB size validation.
   - Document repository table with live status chips: `QUEUED` (amber pulse), `PROCESSING` (blue spinner), `COMPLETED` (emerald check), `FAILED` (crimson flag).
3. **Document Upload & Processing State**:
   - Extraction pipeline telemetry drawer showing real-time multi-stage pipeline: Malware Check -> PyMuPDF Page Text Extraction -> Semantic Chunking -> Voyage AI Embeddings & pgvector sync.
4. **AI Research (Chat-style RAG Q&A with Citations)**:
   - Left sidebar with research sessions, central Q&A message thread, grounded response cards with interactive Citation Pills (`📄 Page 14 • Stark_10K.pdf`).
   - Citation preview panel showing exact snippet text, cosine similarity match score, and "Open Document Viewer" CTA.
5. **Analyst Document Viewer (PDF with Page Navigation)**:
   - Top sticky toolbar with back link, document title, document type badge, page controls (`Prev`, `<input>`, `Next`, `Total Pages`), zoom controls, and download link.
   - Page-accurate PDF renderer jumping directly to cited page `N` on load.
