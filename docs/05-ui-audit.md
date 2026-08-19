# DiligenceOS Frontend UI/UX Audit Report

> [!IMPORTANT]
> **Audit Status**: Complete Read-Only UI/UX Audit  
> **Target Package**: `apps/web` (Next.js 16 App Router, React 19, Tailwind CSS v4, Lucide Icons)  
> **Purpose**: External design review and comprehensive baseline audit for UI/UX redesign. No source code was modified during this audit.

---

## Executive Summary

This report documents the actual visual and technical UI/UX implementation of the **DiligenceOS** frontend application as of August 2026. DiligenceOS is designed as an institutional due-diligence and financial evidence retrieval platform. While `DESIGN.md` outlines an aesthetic vision of "Quiet Confidence" and "Modern Institutional Glassmorphism", the actual codebase exhibits a blend of custom glassmorphic tokens and leftover default `shadcn/ui` utility styling.

---

## 1. Inventory of Routes and Pages

Every page in `apps/web/app` uses the root layout defined in [`app/layout.tsx`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/layout.tsx), which injects global font variables (`--font-outfit`, `--font-inter`, `--font-jetbrains-mono`), applies a dark background (`bg-[#0b0f19]`), and wraps the application in [`AuthProvider`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/lib/auth-context.tsx).

| Route Path | Page File | Purpose & Functionality | Layout & Header Shell |
| :--- | :--- | :--- | :--- |
| `/` | [`app/page.tsx`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/page.tsx) | **Auth Gatekeeper / Splash Redirect**: Checks session state via `useAuth()`. Redirects authenticated users to `/dashboard` and unauthenticated users to `/login`. Displays centered logo mark and spinner. | Root Layout (`app/layout.tsx`), Full-screen centered canvas. |
| `/login` | [`app/login/page.tsx`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/login/page.tsx) | **Enterprise Login Screen**: Form with work email and password inputs, error alert banner, submit CTA button, and link to account registration. | Root Layout + [`AuroraBackground`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/components/ui/aurora-background.tsx), centered auth container (`max-w-md`). |
| `/register` | [`app/register/page.tsx`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/register/page.tsx) | **Enterprise Registration Screen**: Form with full name, work email, and password inputs, error banner, submit CTA button, and link to login. | Root Layout + [`AuroraBackground`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/components/ui/aurora-background.tsx), centered auth container (`max-w-md`). |
| `/dashboard` | [`app/dashboard/page.tsx`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/dashboard/page.tsx) | **Portfolio Workspace Dashboard**: Main entry page after login. Features portfolio telemetry hero section, target company cards grid, empty state, and "New Company" creation modal dialog. | Root Layout + Sticky Top Navigation Header Bar (`h-16`, `backdrop-blur-md`). |
| `/companies/[id]` | [`app/companies/[id]/page.tsx`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/companies/%5Bid%5D/page.tsx) | **Company Overview & Document Management**: Displays company metadata, primary "AI Research Assistant" CTA button, drag-and-drop PDF upload dropzone (50MB validation), document repository table with live status badges (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`), and retry actions. | Root Layout + Sticky Top Header with Back Navigation Link (`< Back to Dashboard`). |
| `/companies/[id]/documents/[documentId]` | [`app/companies/[id]/documents/[documentId]/page.tsx`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/companies/%5Bid%5D/documents/%5BdocumentId%5D/page.tsx) | **Analyst Document Viewer**: Page-accurate PDF document canvas with sticky control bar (back link, doc filename, doc type badge, page controls with prev/next/input, zoom controls `-`/`+`/reset, "Ask AI Research" CTA, and "Open Original" download link). | Root Layout + Sticky Control Header + Full-height viewport PDF canvas (`iframe`). |
| `/companies/[id]/research` | [`app/companies/[id]/research/page.tsx`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/companies/%5Bid%5D/research/page.tsx) | **AI Research Assistant**: Multi-session RAG Q&A chat interface. Features sticky top header bar, left research sessions sidebar, main chat area with suggested queries, word/chunk streaming animation, radar retrieval ring pulse, amber "No relevant evidence" card (REQ-RAG-05), grounded citation pills (`📄 Page N`), citation excerpt preview modal, and sticky bottom prompt textarea with stop button. | Root Layout + Sticky Top Header + Split 2-Column Sidebar/Main Chat Layout. |

---

## 2. Design Tokens Actually in Use

### 2.1 Colors Applied in Code

Tailwind CSS v4 is used with custom variables defined in [`app/globals.css`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/globals.css) and inline CSS utility classes across components:

* **Global Surface Base**: `#0b0f19` (Deep Obsidian Slate) — Applied to body, root background, page backgrounds.
* **Level 1 Container / Card Surface**: `#131b2e` (Dark Navy Slate) — Applied to cards, auth panels, header bars, dialogs, session sidebar.
* **Level 2 Sub-surface / Form Input Base**: `#080b14` (Deep Charcoal Input Base) / `#1c273e` (Muted Hover Surface).
* **Primary Accent**: `#2563eb` (Institutional Sapphire Blue) — Used for primary action buttons, active navigation, focus rings, brand icons, and citation links. Hover state: `#1d4ed8`.
* **Secondary / Positive Accent**: `#10b981` (Emerald Growth / Verified) — Used for completed document badges, active user status dot, positive stats. Background tint: `rgba(16, 185, 129, 0.15)` or `bg-emerald-500/10`.
* **Warning / Risk Accent**: `#f59e0b` (Amber Risk / Interrupted) — Used for queued status badges, "No matching evidence" cards, stream stop buttons, interrupted response chips. Background tint: `rgba(245, 158, 11, 0.1)` or `bg-amber-500/10`.
* **Critical / Error Accent**: `#ef4444` (Crimson Flag / Alert) — Used for error alerts, failed document badges, destructive buttons. Background tint: `rgba(239, 68, 68, 0.1)` or `bg-destructive/10`.
* **Primary Text**: `#f8fafc` (Crisp Silver White) — Used for page titles, primary body text, active headings.
* **Secondary / Muted Text**: `#94a3b8` (Muted Slate) — Used for subheaders, labels, metadata, timestamps.
* **Glass Border**: `rgba(255, 255, 255, 0.1)` (`border-white/10`) — 1px glass border applied to cards, modals, headers, inputs.
* **Input Border**: `rgba(255, 255, 255, 0.12)` (`--input`).

> [!WARNING]
> **Flagged Color Inconsistencies & Leftover Default shadcn/ui Colors**:
> 1. **Mixed Color Strategies**: Components alternate between explicit hex values (`#0b0f19`, `#131b2e`, `#2563eb`, `#94a3b8`, `#f8fafc`) and generic Tailwind/shadcn utility tokens (`bg-card/50`, `bg-muted/60`, `text-muted-foreground`, `bg-secondary/80`, `border-ring`, `bg-destructive/10`, `text-destructive`).
> 2. **Dashboard Card Palette Mismatch**: In [`app/dashboard/page.tsx`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/dashboard/page.tsx#L233-L285), empty states and company cards rely on `bg-card/50`, `bg-muted/60`, `text-muted-foreground`, and `bg-secondary/80`, whereas the telemetry hero card and top header use hardcoded hex values (`#131b2e`, `#080b14/60`, `#f8fafc`).
> 3. **Document Status Badge Color Splintering**: In [`app/companies/[id]/page.tsx`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/companies/%5Bid%5D/page.tsx#L210-L248), status chips use default Tailwind palette classes (`bg-amber-500/10 text-amber-600 dark:text-amber-400`, `bg-blue-500/10 text-blue-600 dark:text-blue-400`, `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`) instead of the tokenized CSS custom variables.
> 4. **Skeleton Color Fallback**: [`components/ui/skeleton.tsx`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/components/ui/skeleton.tsx#L9) uses default `bg-muted/60 dark:bg-muted/40` instead of a glassmorphic pulse gradient.

---

### 2.2 Typography Token Usage

Three Google Fonts are loaded in [`app/layout.tsx`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/layout.tsx):

1. **Outfit** (`var(--font-outfit)`, `.font-heading`):
   * **Usage**: Page titles (`h1`, `text-3xl`), modal titles, card headers (`CardTitle`), section headings (`h2`, `h3`).
   * **Style**: Semi-bold (`font-semibold`), tight tracking (`tracking-tight`).
2. **Inter** (`var(--font-inter)`):
   * **Usage**: Default body text, paragraph descriptions, button text, form inputs, dialog text.
   * **Style**: Regular (`font-normal`), Medium (`font-medium`) at 13px–16px.
3. **JetBrains Mono** (`var(--font-jetbrains-mono)`, `.font-mono`):
   * **Usage**: Ticker symbols, IDs (`ID: c1111111...`), telemetry metrics ("1024-d"), status badges ("Processing pipeline active..."), page numbers ("Page 1 of 42"), citation pill page numbers ("📄 Page 14"), elapsed response times ("1.4s"), section label caps.

---

### 2.3 Spacing and Layout Containers

* **Max Container Widths**:
  * `max-w-7xl` (1280px): Dashboard main container and Company Overview container.
  * `max-w-6xl` (1152px): Document Viewer PDF canvas card wrapper.
  * `max-w-3xl` (768px): AI Research message thread and prompt input container.
  * `max-w-md` (448px): Auth cards (Login and Register) and modal dialogs.
* **Padding Patterns**:
  * Page gutters: `px-4 sm:px-6 lg:px-8` on main container shell.
  * Card padding: `p-6` or `p-8` on major containers; `p-4` or `p-3.5` on list items and metric boxes.
  * Top navigation bar: `h-16` (64px height) with `px-4` to `px-8`.
* **Border Radii**:
  * Outer cards & modals: `rounded-2xl` (16px).
  * Inner list boxes & dropzones: `rounded-xl` (12px).
  * Buttons & inputs: `rounded-lg` (8px).
  * Badges & pills: `rounded-full` (9999px).

---

### 2.4 Border, Shadow & Glass Treatments

* **Glass Border**: All primary cards, modals, dropdowns, and input boxes feature a 1px glass border `border border-white/10` (`rgba(255, 255, 255, 0.1)`).
* **Backdrop Blur**:
  * `backdrop-blur-md`: Top navigation header bars (`bg-[#0b0f19]/80 backdrop-blur-md`), login/register auth cards (`bg-[#131b2e] backdrop-blur-md`).
  * `backdrop-blur-xl`: Dialog popup backdrop and content overlay.
  * `backdrop-blur-xs`: Telemetry stat metric boxes (`bg-[#080b14]/60 backdrop-blur-xs`).
* **Shadows**: `shadow-xl` on auth cards and telemetry hero; `shadow-2xl` on modal dialogs; `shadow-xs` / `shadow-sm` on buttons; primary button hover glow `hover:shadow-[0_0_15px_rgba(37,99,235,0.3)]`.

> [!WARNING]
> **Components Lacking Glass Treatment**:
> 1. **Dashboard Empty State**: [`app/dashboard/page.tsx`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/dashboard/page.tsx#L233) uses a flat `border-dashed` border and `bg-card/50` without glass edge or backdrop blur.
> 2. **Company Overview Document Table**: [`app/companies/[id]/page.tsx`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/companies/%5Bid%5D/page.tsx#L440) uses flat container `bg-[#080b14]/40` without backdrop blur.
> 3. **Document Viewer Canvas Frame**: [`app/companies/[id]/documents/[documentId]/page.tsx`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/companies/%5Bid%5D/documents/%5BdocumentId%5D/page.tsx#L294) uses solid `bg-[#131b2e]` wrapper without backdrop blur.
> 4. **Research Assistant Sessions Sidebar**: [`app/companies/[id]/research/page.tsx`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/companies/%5Bid%5D/research/page.tsx#L454) uses solid dark background `bg-[#0d1322]` without glass styling.

---

## 3. Navigation Structure & Page Shells

```mermaid
flowchart TD
    Login["/login (Auth)"] -->|Submit Login| Dashboard["/dashboard (Portfolio)"]
    Register["/register (Auth)"] -->|Register| Dashboard
    Dashboard -->|Select Company| Overview["/companies/[id] (Overview & Docs)"]
    Overview -->|Click View Doc| Viewer["/companies/[id]/documents/[docId] (Viewer)"]
    Overview -->|Launch AI Research| Research["/companies/[id]/research (AI RAG Chat)"]
    Viewer -->|Ask AI Research| Research
    Research -->|Click Citation Pill| Viewer
```

### Detailed Page Navigation Elements:

1. **Login & Register Pages**:
   * No top header nav or sidebar.
   * Floating centered auth card with bottom toggle text links (`<Link href="/register">` / `<Link href="/login">`).
2. **Dashboard (`/dashboard`)**:
   * **Top Sticky Header**: Brand logo (`ShieldCheck` icon + "DiligenceOS" title), subtitle ("Institutional Analyst Workspace"), user email badge with active green pulse dot (`user.email`), and "Logout" button (`<LogOut className="h-4 w-4">`).
   * **Page Content**: Direct card link navigation to `/companies/[id]`.
3. **Company Overview (`/companies/[id]`)**:
   * **Top Sticky Header**: Left back link (`< ArrowLeft Back to Dashboard`), brand mark (`ShieldCheck` + "DiligenceOS").
   * **Sub-Header Actions**: "AI Research Assistant" CTA button (`/companies/[id]/research`) and live processing pipeline indicator chip.
   * **Document List Items**: Direct links to document viewer (`/companies/[id]/documents/[documentId]`).
4. **Analyst Document Viewer (`/companies/[id]/documents/[docId]`)**:
   * **Top Sticky Header**: Left back link (`< ArrowLeft Overview`), document icon + filename, company name & doc type badge; center pagination controls (`<`, `Page [N] of [Total]`, `>`); right toolbar with zoom out `-`, percentage display, zoom in `+`, reset zoom, "Ask AI Research" button (`/companies/[id]/research`), and "Open Original" PDF download link.
5. **AI Research Assistant (`/companies/[id]/research`)**:
   * **Top Sticky Header**: Left back link (`< ArrowLeft Back to Overview`), brain icon + page title ("AI Research Assistant"), company badge.
   * **Left Sidebar**: "New Research Session" CTA button and scrollable list of past research sessions.
   * **Main Chat Workspace**: Interactive citation pills (`📄 Page 14 • Stark_Annual_Report.pdf`) linking directly to `/companies/[id]/documents/[docId]?page=N`, excerpt preview modal with "Open Document Viewer" CTA.

---

## 4. Animation & Motion Inventory

| Animation Name | Keyframe Definition / Utility Class | Target Trigger & Component Location | Visual Behavior |
| :--- | :--- | :--- | :--- |
| **Aurora Slow Drift** | `animate-aurora-slow` ([`globals.css`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/globals.css#L127)) | [`AuroraBackground`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/components/ui/aurora-background.tsx) on `/login` and `/register`. | 50s infinite smooth drift of Sapphire Blue gradient blob (`translate(50px, 35px) scale(1.08)`). |
| **Aurora Reverse Drift** | `animate-aurora-reverse` ([`globals.css`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/globals.css#L131)) | [`AuroraBackground`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/components/ui/aurora-background.tsx) on `/login` and `/register`. | 60s infinite reverse drift of Emerald Growth gradient blob (`translate(-40px, -30px) scale(1.06)`). |
| **Aurora Sub-surface Pulse** | `animate-aurora-pulse` ([`globals.css`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/globals.css#L135)) | [`AuroraBackground`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/components/ui/aurora-background.tsx) on `/login` and `/register`. | 40s infinite opacity and scale pulse of deep sapphire base glow (`opacity: 0.15` to `0.25`). |
| **Radar Ring Pulse** | `animate-radar-ring` ([`globals.css`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/globals.css#L167)) | `RadarIndicator` on `/companies/[id]/research`. | Concentric sonar rings scaling 0.5 to 2.2 and fading opacity during document retrieval phase. |
| **Blinking Cursor** | `animate-blink` ([`globals.css`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/globals.css#L151)) | `StreamingCursor` on `/companies/[id]/research`. | Terminal-style 1s step-start infinite opacity toggle (1 to 0) rendered at end of streaming text. |
| **Word Chunk Fade-In** | `animate-chunk-in` ([`globals.css`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/globals.css#L191)) | Assistant message text stream on `/companies/[id]/research`. | 120ms ease-out fade-slide up (`translateY(3px)` to `0`) applied to live text tokens. |
| **Citation Stagger** | `animate-citation-in` ([`globals.css`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/globals.css#L207)) | Grounded citation pills on `/companies/[id]/research`. | 220ms ease-out fade-slide up (`translateY(6px)` to `0`) with 65ms per-pill staggered delay. |
| **Status Pulse Dot** | `animate-pulse` | Dashboard header user status; Company Overview queued document badge clock icon. | Infinite opacity pulse signaling live background connections or queued jobs. |
| **Loading Spinners** | `animate-spin` | `Loader2` icons on auth buttons, document upload dropzone, viewer loading state, research initialization. | Continuous rotation during asynchronous requests. |
| **Card Hover Lift & Glow** | `hover:-translate-y-0.5`, `hover:border-[#2563eb]/40` | All [`Card`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/components/ui/card.tsx) instances. | 200ms ease transition lifting card by 2px with sapphire border highlight. |
| **Button Glow** | `hover:shadow-[0_0_15px_rgba(37,99,235,0.3)]` | Default primary [`Button`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/components/ui/button.tsx). | Subtle blue ambient shadow glow on hover. |

---

## 5. Icon Usage Inventory

All icons are imported from `lucide-react` (v1.31.0):

| Icon Component | Usage Locations & Components | Semantic Function |
| :--- | :--- | :--- |
| `ShieldCheck` | Home splash (`/`), `/login`, `/register`, `/dashboard` top nav, `/companies/[id]` header, `/companies/[id]/documents/[docId]` header. | Core DiligenceOS platform security brand mark. |
| `Loader2` | Auth buttons, document processing status badges, file upload progress, document viewer loading, research assistant initial load. | Asynchronous progress indicator. |
| `ArrowRight` | Auth form submit buttons (`Log in to Workspace`, `Create Account`), Dashboard company card hover indicator. | Primary action directional indicator. |
| `ArrowLeft` | Header back links on `/companies/[id]`, `/companies/[id]/documents/[docId]`, and `/companies/[id]/research`. | Backwards hierarchy navigation. |
| `Lock` | Password input field adornment in Login and Register forms. | Credential security indicator. |
| `Mail` | Work email input field adornment in Login and Register forms. | User identity field indicator. |
| `User` | Full name input adornment in Register form; User message bubble avatar in Research Assistant. | User identity & message sender avatar. |
| `Plus` | "New Company" button on Dashboard; "Create your first company" empty state CTA; "New Research Session" sidebar button. | Creation action trigger. |
| `Building2` | Dashboard empty state icon for zero target companies. | Entity representation. |
| `LogOut` | Dashboard top header right navigation button. | User session termination. |
| `Sparkles` | Telemetry hero card badge ("INSTITUTIONAL TELEMETRY"); Document viewer "Ask AI Research" button; AI Research welcome state icon. | AI intelligence features. |
| `AlertCircle` | Auth error banners, Dashboard error alert, Company not found state, Document viewer error card, Form validation messages. | Critical system error feedback. |
| `AlertTriangle` | Zero processed documents warning banner; Interrupted stream response chip in Research Assistant. | Non-fatal warning feedback. |
| `UploadCloud` | "Upload Target Document" card header and drag-and-drop dropzone on Company Overview. | Document upload action. |
| `FileText` | Company Overview document list header; document item icon; Document Viewer header; Citation pill icon & excerpt modal header. | Document asset representation. |
| `CheckCircle2` | Completed document status badge icon in Company Overview document list. | Successful extraction indicator. |
| `Clock` | Queued document status badge icon in Company Overview document list. | In-queue job indicator. |
| `FileType` | Document repository empty state icon on Company Overview. | Empty file repository representation. |
| `RefreshCw` | Processing pipeline active indicator; Retry failed document button; Retry interrupted research answer button. | Retry & sync action trigger. |
| `Brain` | "AI Research Assistant" CTA button on Company Overview; Top header title icon on Research Assistant page; Initial loading sonar icon. | RAG AI engine representation. |
| `ChevronLeft` / `ChevronRight` | Document Viewer page navigation controls; Research sidebar session arrow. | Pagination & list traversal. |
| `ZoomIn` / `ZoomOut` / `Maximize2` | Document Viewer top sticky utility toolbar. | PDF canvas zoom manipulation. |
| `Download` | Document Viewer "Open Original" PDF download button. | Original file export. |
| `ExternalLink` | Citation excerpt modal "Open Document Viewer" CTA button. | Cross-page deep link. |
| `Bot` | Assistant message bubble avatar icon; Radar retrieval indicator avatar. | AI assistant avatar. |
| `MessageSquare` | Research session list items in left sidebar. | Conversation thread item. |
| `SearchX` | "No Matching Evidence" amber card icon in Research Assistant (REQ-RAG-05). | Evidence retrieval miss indicator. |
| `Send` | Prompt input submit button icon in Research Assistant. | Query transmission trigger. |
| `Square` | Active streaming response "Stop generating" button icon in Research Assistant. | Stream cancellation trigger. |
| `X` | Dialog modal close button. | Modal dismiss action. |

---

## 6. Visual State Descriptions & Screen Audits

### 6.1 Screen 1: Login Page (`/login`)

![Login Page Screen Screenshot](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/docs/screenshots/01-login.png)

* **Layout Structure**: Single centered card (`max-w-md`) vertically centered on a full-viewport [`AuroraBackground`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/components/ui/aurora-background.tsx) canvas with subtle starfield radial overlay.
* **Prominent Visual Elements**:
  * High-contrast branding mark: Glowing Sapphire Blue icon wrapper (`bg-[#2563eb]/10`) containing `ShieldCheck`.
  * Heading text in Outfit font ("DiligenceOS"), subtitle in Inter ("Institutional due-diligence & evidence retrieval portal").
  * Glass card container (`bg-[#131b2e] border-white/10 rounded-2xl shadow-xl backdrop-blur-md`).
  * Dark input fields (`bg-[#080b14] border-white/10`) with left-aligned icons (`Mail`, `Lock`).
  * Sapphire Blue submit CTA button with right arrow (`Log in to Workspace →`).
* **Unfinished / Plain Characteristics**:
  * Form labels rely on small text (`text-xs text-[#94a3b8]`) without distinctive upper-case tracking or micro-badging.
  * Absence of enterprise SSO / SAML login options (only email/password present).

---

### 6.2 Screen 2: Register Page (`/register`)

![Register Page Screen Screenshot](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/docs/screenshots/02-register.png)

* **Layout Structure**: Identical centered card layout (`max-w-md`) on full-viewport [`AuroraBackground`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/components/ui/aurora-background.tsx) canvas.
* **Prominent Visual Elements**:
  * Branding mark header matching login page for consistency.
  * Three stacked input groups: Full Name (`User` icon), Work Email (`Mail` icon), and Password (`Lock` icon).
  * Sapphire Blue submit CTA button (`Create Enterprise Workspace →`).
  * Bottom border divider (`border-t border-white/10`) with link to login.
* **Unfinished / Plain Characteristics**:
  * Form height is slightly tall for smaller laptop displays, requiring subtle vertical centering adjustments.
  * Lack of real-time password strength meter or institutional email domain validation indicator.

---

### 6.3 Screen 3: Dashboard / Company Workspace List (`/dashboard`)

![Dashboard Page Screen Screenshot](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/docs/screenshots/03-dashboard.png)

* **Layout Structure**: Sticky top navigation bar (`h-16`), followed by a `max-w-7xl` container with three distinct vertical zones: (1) Institutional Telemetry Hero Card, (2) Target Companies Header with "New Company" CTA, and (3) 3-Column Company Cards Grid.
* **Prominent Visual Elements**:
  * **Top Header**: Sapphire logo mark, title "DiligenceOS", user identity pill (`user.email`) with active animated emerald pulse dot (`bg-[#10b981] animate-pulse`), and ghost logout button.
  * **Telemetry Hero Section**: Deep gradient card (`from-[#131b2e] via-[#0f1525] to-[#0b0f19] border-white/10`) featuring an "INSTITUTIONAL TELEMETRY" monospace pill with `Sparkles` icon, 3D background glow, and 3 KPI metric tiles (Entities count, Active Pipeline status, 1024-d Embeddings dimension).
  * **Company Cards Grid**: Multi-column grid showcasing target company cards with title, industry tag, description, creation date, and truncated UUID badge (`ID: c1111111...`).
* **Unfinished / Plain Characteristics**:
  * **Color Token Mismatch**: The company cards and empty state use default `shadcn/ui` utility classes (`bg-card/50`, `bg-muted/60`, `text-muted-foreground`, `bg-secondary/80`) which conflict with the custom hex palette (`#131b2e`, `#080b14`) used in the hero card and top nav bar.
  * **Empty State Plainness**: When zero companies exist, the dashed border box (`border-dashed bg-card/50`) looks basic and lacks glass backdrop blur.

---

### 6.4 Screen 4: Company Overview (`/companies/[id]`)

![Company Overview Screen Screenshot](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/docs/screenshots/04-company-overview.png)

* **Layout Structure**: Sticky top header with back navigation link (`< Back to Dashboard`), followed by a header banner (company name, industry pill, description, "AI Research Assistant" CTA button), and a 2-column asynchronous layout (Left: Upload dropzone card, Right: Document repository list card).
* **Prominent Visual Elements**:
  * Large title header in Outfit font ("Stark Industries Corp") with industry pill ("Defense & Tech").
  * Primary CTA button with `Brain` icon ("AI Research Assistant").
  * PDF Drag-and-Drop Dropzone with dotted border, upload cloud icon, size validation text (50MB max), and interactive file input.
  * Document repository list featuring document type icons, filenames, file size in KB/MB, upload date, status chips (`COMPLETED` check, `QUEUED` pulse clock, `PROCESSING` spinner, `FAILED` alert), and action buttons ("View", "Retry").
* **Unfinished / Plain Characteristics**:
  * Left and right cards use solid dark slate (`bg-[#131b2e]`) without backdrop blur effects.
  * Financial metadata chips (Ticker, Market Cap, Sector) specified in `DESIGN.md` Section 4 are missing from the rendered company header.

---

### 6.5 Screen 5: Document Upload & List Section (`/companies/[id]`)

![Document Upload and List Screenshot](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/docs/screenshots/05-document-upload-list.png)

* **Layout Structure**: 2-column detailed view focusing on the Drag-and-Drop Dropzone (Left: 1 column) and Document Repository Table (Right: 2 columns).
* **Prominent Visual Elements**:
  * Dotted border upload dropzone with hover glow (`hover:border-[#2563eb]/50`).
  * Live status chips with distinct semantic colors (`COMPLETED` in emerald green, `QUEUED` in amber pulse).
  * Hover state on document rows (`hover:bg-white/5 transition-colors`).
* **Unfinished / Plain Characteristics**:
  * The extraction telemetry drawer showing real-time multi-stage pipeline stages (Malware Check -> PyMuPDF -> Semantic Chunking -> Vector Sync) specified in `DESIGN.md` Section 4.3 is rendered as a minimal inline spinner chip rather than a full slide-out telemetry drawer.

---

### 6.6 Screen 6: AI Research Assistant (`/companies/[id]/research`)

![AI Research Assistant Screen Screenshot](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/docs/screenshots/06-ai-research.png)

* **Layout Structure**: Split-view layout with a sticky top header bar, left collapsible past research sessions sidebar (`w-72`), main chat scroll area (`max-w-3xl`), and sticky bottom query input textarea.
* **Prominent Visual Elements**:
  * **Top Header**: Left back link (`< Back to Overview`), brain icon, page title, company badge.
  * **Left Sidebar**: "New Research Session" button with `Plus` icon, scrollable past sessions list with `MessageSquare` icons and active state border.
  * **Chat Thread**: User bubbles (`bg-[#2563eb] text-white`), Assistant bubbles (`bg-[#131b2e] border-white/10 text-[#f8fafc]`).
  * **Grounded Citation Pills**: Interactive pills (`📄 Page 14 • Stark_Industries_2025_Annual_Report.pdf`) with hover border highlight, click-to-preview excerpt button, and direct navigation links to the document viewer.
  * **Sticky Bottom Input**: Multi-line textarea (`bg-[#080b14] border-white/10`) with `Send` CTA button and active stream "Stop generating" button.
* **Unfinished / Plain Characteristics**:
  * Left sidebar background (`bg-[#0d1322]`) is flat and lacks glass backdrop blur.
  * Suggested query pills in empty chat welcome state use standard dark buttons without subtle animated hover shimmers.

---

### 6.7 Screen 7: Analyst Document Viewer (`/companies/[id]/documents/[documentId]`)

![Document Viewer Screen Screenshot](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/docs/screenshots/07-document-viewer.png)

* **Layout Structure**: Full-viewport document canvas with top sticky control header (`h-16 bg-[#0b0f19]/95 backdrop-blur`), center page navigation controls, right utility toolbar, and centered PDF document `iframe` canvas.
* **Prominent Visual Elements**:
  * **Top Control Header**:
    * Left: Back to Overview link (`< Overview`), PDF icon, document title, document type badge ("ANNUAL REPORT").
    * Center: Page pagination box (`Page [ 1 ] of 42`) with `ChevronLeft` and `ChevronRight` buttons and direct page number text input.
    * Right: Zoom controls (`ZoomOut` `-`, scale percentage `100%`, `ZoomIn` `+`, reset zoom), "Ask AI Research" CTA button, and "Open Original" PDF download link.
  * **Document Canvas**: High-contrast dark container (`bg-[#131b2e] border-white/10 rounded-2xl shadow-2xl`) hosting the embedded PDF view.
* **Unfinished / Plain Characteristics**:
  * The PDF viewer currently relies on browser native `iframe` PDF rendering (`#page=N`), which causes browser scrollbar duplication inside the dark app wrapper.
  * Lack of a native canvas text highlight overlay for grounded citation excerpts.

---

## 7. Explicit Discrepancy & Intent Gaps Audit

> [!WARNING]
> The following explicit flags highlight where the current rendered codebase diverges from the design intent documented in `DESIGN.md` or retains default `shadcn/ui` styles.

### 7.1 Default `shadcn/ui` Styling Remnants

1. **Dashboard Empty State & Cards**: [`app/dashboard/page.tsx`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/app/dashboard/page.tsx#L233) uses raw shadcn utility classes (`bg-card/50`, `bg-muted/60`, `text-muted-foreground`, `bg-secondary/80`, `border-ring`) rather than the custom dark obsidian palette tokens.
2. **Skeleton Component**: [`components/ui/skeleton.tsx`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/components/ui/skeleton.tsx#L9) relies on default `bg-muted/60 dark:bg-muted/40 animate-pulse` without glassmorphic treatment.
3. **Dialog Overlay & Close Button**: [`components/ui/dialog.tsx`](file:///c:/Users/asus/OneDrive/Desktop/PROJECTS/DiligenceOS/apps/web/components/ui/dialog.tsx#L49) uses default shadcn classes (`ring-offset-background`, `data-[state=open]:bg-accent`, `data-[state=open]:text-muted-foreground`).

### 7.2 Cross-Page Visual Inconsistencies

1. **Header Bar Divergence**:
   * Dashboard header uses `bg-[#0b0f19]/80 backdrop-blur-md` with user email chip and logout button.
   * Company Overview header uses `bg-[#0b0f19]/80 backdrop-blur-md` with simple back link.
   * Document Viewer header uses `bg-[#0b0f19]/95 backdrop-blur` with center pagination controls.
   * Research Assistant header uses `bg-[#0b0f19]/95 backdrop-blur` with right company badge.
   * *Issue*: Header height (`h-16`) is consistent, but backdrop opacity (`/80` vs `/95`), font styling, and logo icon alignment differ across pages.
2. **Document Status Chips**:
   * Company Overview page uses Tailwind default palette classes (`bg-amber-500/10 text-amber-600`, `bg-blue-500/10 text-blue-600`, `bg-emerald-500/10 text-emerald-600`).
   * Research page and auth pages use custom hex tokens (`#10b981`, `#f59e0b`, `#ef4444`).

### 7.3 `DESIGN.md` Intent vs. Rendered Code Gaps

| `DESIGN.md` Specification | Actual Rendered Code Baseline | Audit Gap Flag |
| :--- | :--- | :--- |
| **Section 1 Color Palette**: Level 1 Panel `#131B2E`, Level 2 Hover `#1C273E`. | Code mixes `#131b2e` with `#080b14` for input backgrounds and `bg-card/50` for dashboard cards. | Inconsistent surface depth mapping. |
| **Section 3 Elevation**: Tonal elevation only; single ambient shadow `0 20px 40px rgba(0,0,0,0.4)` for modals. | Buttons use `shadow-sm`, `shadow-xs`, and hover glow `shadow-[0_0_15px_rgba(37,99,235,0.3)]`; cards use `shadow-xl` and `shadow-2xl`. | Multiple un-tokenized shadow styles in active use. |
| **Section 4.1 Company Overview Header**: Company metadata including Ticker, Market Cap, and Sector chips. | Company Overview header renders company name, industry tag, and description, but omits Ticker and Market Cap metadata fields. | Missing corporate metadata chips. |
| **Section 4.3 Upload & Pipeline**: Real-time multi-stage pipeline telemetry drawer (Malware Check -> PyMuPDF -> Semantic Chunking -> Vector Sync). | Document pipeline status is rendered as inline status chips (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`) without a dedicated multi-stage drawer. | Pipeline telemetry drawer not implemented as specified. |
| **Section 4.5 Document Viewer**: Page-accurate PDF renderer jumping directly to cited page `N` on load with toolbar. | Document viewer embeds standard browser `iframe` with hash navigation (`#page=N`). Zoom controls scale iframe CSS container. | Native PDF canvas renderer absent; relies on browser iframe fallback. |

---

## 8. Summary Checklist for External Design Team

- [x] **Page Inventory**: 7 routes cataloged and documented.
- [x] **Design Tokens**: Colors, typography, spacing, depth, and glass treatments mapped.
- [x] **Navigation Structure**: Shells, top headers, back links, and sidebars audited.
- [x] **Motion & Animations**: Keyframes and micro-interactions cataloged across 11 visual behaviors.
- [x] **Icon Inventory**: Complete mapping of 28 `lucide-react` icons.
- [x] **Screen Capture**: 7 high-resolution desktop screenshots generated and embedded.
- [x] **Audit Flags**: Default `shadcn/ui` remnants and `DESIGN.md` gaps explicitly flagged for redesign.

*End of Report `docs/05-ui-audit.md`*
