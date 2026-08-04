# WE-FORGE Platform — Architecture, Features & Changelog

> **Living document.** Updated every time the codebase, features, or architecture decisions change. If you changed it in code, change it here.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 14+** (App Router, Server + Client Components) |
| Database | **MongoDB** via **Mongoose** ODM |
| Object Storage | **Cloudflare R2** (S3-compatible API) for images & videos |
| Auth | Custom JWT + cookie session (`/api/auth/[...nextauth]`, `/api/auth/login`, `/api/auth/check`) |
| Styling | Vanilla CSS with CSS variables, flex/grid, glassmorphism (`backdrop-filter`), micro-animations |
| Animations | **GSAP** (ScrollTrigger), **Framer Motion** |
| Image Crop | **react-image-crop** |
| Icons | **lucide-react** |
| Calendar/Time | **react-day-picker** + custom `ModernDateTimePicker` |
| Hosting | Dockerized (see `Dockerfile`), deployed via Coolify |

---

## 2. Application Map

```
app/
├── layout.jsx                    # Root layout (Navbar + Footer + global CSS)
├── page.jsx                      # Landing page (Hero, FeaturedGallery, AppleCardsCarousel)
├── globals.css                   # Global sticky-footer layout + design tokens
├── [memberId]/page.jsx           # Dynamic member profile (left-side avatar + bio)
├── admin/
│   ├── page.jsx                  # Admin login page
│   └── dashboard/
│       ├── page.jsx              # Thin shell — auth + sidebar + section router (~230 LOC)
│       └── AdminDashboard.css    # Shared admin layout/styles
├── api/                          # All REST endpoints (see §6)
├── contests/                     # Public contest catalog + permanent [slug] route
├── domains/                      # Club departments page (GSAP ScrollTrigger)
├── events/                       # Public events list + detail pages
├── faculties/, faq/, join/, login/, notices/, profile/, projects/, team/
└── join-us/                      # Legacy recruitments alias
src/
├── components/                   # Reusable UI (HeroSection, MagicBento, ProfileCard, ...)
├── services/                     # API client wrappers
└── components/admin/             # 7 modular admin section components (see §3)
lib/
├── auth.js, contestEngine.js, db.js, permissions.js, r2.js, slug.js, uploadHelper.js
└── models/                       # Mongoose schemas (see §7)
```

---

## 3. Admin Dashboard (Modular)

The dashboard is a **thin shell** (`app/admin/dashboard/page.jsx`, ~230 LOC) that handles auth, sidebar nav, and state distribution. Each section is a fully self-contained component under `src/components/admin/`:

| Component | Responsibility |
|---|---|
| `MembersSection.jsx` | Team table, hierarchy sort, domain filters, CSV export, edit modal trigger |
| `MemberEditModal.jsx` + `.css` | Shared member edit modal (~10k LOC — projects, achievements, schools, certifications, CGPA, socials) |
| `EventsSection.jsx` | Event CRUD + **ReactCrop** poster editor + registrations viewer + access controls |
| `ContestsSection.jsx` | Contest template manager, **Custom Form Builder**, **Declare Winners Studio**, cycle history inspector, schedule editor |
| `ProjectsSection.jsx` | Open-source project list, GitHub/demo links, tech stack tags |
| `NoticesSection.jsx` | Announcements list + priority badges |
| `MediaSection.jsx` | R2 media gallery, multi-file upload queue, **folder creation dialog**, bulk actions, layout toggles |
| `RecruitmentsSection.jsx` | Drive OPEN/CLOSED toggle, hero banner editor, applicants table, candidate detail modal |

### 3.1 Admin Authentication
- `/api/auth/check` → returns `{ authenticated, signedIn, role, isElite, ... }`
- Non-admins see **Access Denied** screen; `isElite` (Zero Order) unlocks extra endpoints (e.g. `members/me/*`).

---

## 4. Public Pages

| Route | Description |
|---|---|
| `/` | Landing — animated hero, **FeaturedGallery** (favorited media), AppleCardsCarousel, MagicBento stats |
| `/[memberId]` | Dynamic profile with left-side hoverable avatar |
| `/contests` | Contest catalog with search, type/status chips, countdown timers |
| `/contests/[slug]` | **Permanent** contest URL — 5-tab experience (Overview, Submit, Rules, Winners, History) |
| `/events`, `/events/[id]` | Public event list + detail + registration |
| `/domains` | Department showcase (GSAP drop-in animations) |
| `/projects` | Open-source projects showcase |
| `/notices` | Public announcements |
| `/team` | Team page |
| `/faculties` | Faculty page |
| `/faq` | FAQ |
| `/join` | **Recruitments application** (KL University email gated) |
| `/profile` | Logged-in user's profile editor |
| `/login` | Microsoft login |

### 4.1 Global Sticky-Footer Layout
`app/globals.css` enforces `min-height: 100vh` on every page wrapper and `flex: 1 0 auto` on `<main>`, so the `<Footer />` always pins to the viewport bottom regardless of content height. **No more floating footer.**

---

## 5. Feature Modules

### 5.1 Media Library (Admin)

#### 5.1.1 Upload Flow
- **Wide 900px two-column upload dialog** — file picker + queue on the left, metadata (Tags, Title, Description, Folder, Favorite) on the right.
- **Multi-file queue** — each file row shows: thumbnail/icon, filename, size, live status (`Uploading…` → `✓ Done` / error), and a **✕ remove** button.
- Upload is **disabled only** when the queue is empty **or** tags are blank — never wrongly disabled.

#### 5.1.2 Folders
- Dedicated **`Folder` MongoDB model** (`lib/models/Folder.js`) with `name` (unique) and `createdAt`.
- **Custom dialog modal** (no browser `prompt`/`alert`) — form-wrapped so `Enter` submits, with styled Create/Cancel buttons.
- **Dashed "+ New Folder"** chip next to folder filters; clicking opens the dialog.
- Upload dialog uses a `<select>` dropdown populated from **both** media-derived folders **and** explicitly-created empty folders (state sourced from `mediaFolders` via `fetchMediaFolders()`).
- API: `GET/POST /api/media/folders`; delete handled client-side with cascade.

#### 5.1.3 Favorites
- **Optimistic toggle** — star flips gold instantly on click, no server lag.
- **Rollback on failure** — if `PATCH /api/media/[id]` errors (e.g. 401), the star reverts and an error toast appears.
- **Array guard** in `fetchMedia` — if `/api/media` returns an error object instead of an array, state stays `[]` (was the root cause of "everything resets" bug).
- **Auto-derived titles** — media with empty `title` in DB auto-derives a clean name from the S3 key filename at API read time (strips timestamp prefix, extensions, dashes/underscores).
- **Aggregate fallback** — folder counts now use `eventName` fallback when `folder` is null (legacy uploads still counted).

#### 5.1.4 Bulk Actions
- Zip download, mass favorite/unfavorite, batch move-to folder, bulk delete — all via `/api/media/bulk`.

#### 5.1.5 Real-Time Sync (No More Hard-Refresh)
- **Visibility refresh** — `visibilitychange` listener re-fetches media silently when tab regains focus.
- **`silentFetchMedia()`** — all 7 post-mutation handlers (favorite, upload, delete, move) use this so the grid updates invisibly in the background with no loading flicker.
- **`revalidatePath('/')`** — called after every favorite toggle/upload so the public landing page regenerates with latest favorites on next visit.

#### 5.1.6 UI Polish
- **Glassmorphic buttons** across Media tab — `backdrop-filter` blur, semi-transparent layers.
- **Micro-animations** — `translateY(-2px)` on hover, depress on click, soft expanding drop-shadows.

---

### 5.2 Recruitments ("Join Us")

#### 5.2.1 Candidate Flow (`/join`)
- **Auth gate** — requires `@kluniversity.in` login.
- **Auto year extraction** — roll number prefix → `Y24`, `Y25`, `Y23` etc.
- **Domain selection** — Primary (required) + Secondary (optional) across Tech & Innovation, Media & Content, Content & Creation, Operations, Speaking.
- **Motivation essay** (required) + **Work Links** dynamic manager (GitHub, Figma, Behance, Drive, LinkedIn).
- **Submitted state** — once submitted, the form is **completely hidden**. Candidate sees only a clean confirmation card with green checkmark, submission timestamp, and live status badge (`PENDING`, `SHORTLISTED`, `ACCEPTED`, `REJECTED`).
- **Closed drive view** — glassmorphic banner with domain preview chips and CTAs to `/projects` and `/notices`.

#### 5.2.2 Admin Flow
- **Drive Control** — OPEN/CLOSED toggle + hero banner editor (title, subtitle, description, image URL).
- **Applicant table** — search (name/roll/email/domain), filter by Domain/Year/Status, **stat cards** (Total/Pending/Shortlisted/Accepted/Rejected).
- **Candidate detail modal** — review motivation essay, click portfolio links, update status, write internal admin notes.
- **Delete applications** — Trash button in table row + "Remove Application" in detail modal, both with confirmation dialog.
- **CSV Export** — offline committee review.

#### 5.2.3 Models & API
- `RecruitmentSettings` (`isOpen`, hero copy + image)
- `RecruitmentApplication` (`memberId` unique, rollNumber, year, domains, workLinks, status, adminNotes)
- `GET/POST /api/recruitments/config`, `POST /api/recruitments/apply`, `GET/PATCH/DELETE /api/recruitments/applications`

---

### 5.3 Contests System

#### 5.3.1 Architecture (Template vs. Cycle)
- **`ContestTemplate`** — permanent config: slug, title, description, rules, eligibility, prizeInfo, tags, visibility, featured, schedule, **`customFields`**, `isPaused`, `isPublished`, `activeCycleId`.
- **`ContestCycle`** — generated per recurrence: `templateId`, `cycleNumber`, `cycleLabel` (e.g. *Week 31*, *August 2026*), `startTime`, `endTime`, `status` (`upcoming` / `active` / `submission_closed` / `judging` / `results_published`), participant count, winner podiums.
- **`ContestSubmission`** — candidate entries with `customAnswers`, score, judge remarks, work links.

#### 5.3.2 Permanent URLs
- Public route `/contests/[slug]` (e.g. `/contests/photography`) **never changes** across cycles.
- `?cycle=N` query param browses historical cycles via `History` tab.
- `lib/contestEngine.js → ensureActiveCycle()` resolves or spawns the right cycle on every request.

#### 5.3.3 Schedule Types
| Type | Behavior |
|---|---|
| `one_time` | Single edition between `schedule.startDate` and `schedule.endDate` |
| `immediate` | Starts now, ends at `schedule.endDate` |
| `recurring_weekly` | Repeats weekly based on `startDay`/`endDay` + `startTime`/`endTime` |
| `recurring_monthly` | Repeats monthly based on `startDayOfMonth`/`endDayOfMonth` |

Date inputs use the shared **`ModernDateTimePicker`** component (same one from event creation) for visual consistency.

#### 5.3.4 5-Tab Public UI
- **Overview** — description, banner, live countdown (`Starts In` / `Ends In`), prizes, eligibility
- **Submit** — dynamic form (see §5.3.5), work-link manager, withdrawal
- **Rules** — guidelines
- **Winners** — 🥇 1st / 🥈 2nd / 🥉 3rd + Special Mentions with judge notes
- **History** — interactive cycle timeline archive

#### 5.3.5 Full Custom Form Builder
Admins can build **any** submission form with **0 to N** custom fields via the **Custom Form Builder** in `ContestsSection.jsx`:

| Field Type | Properties |
|---|---|
| Text | label, required, placeholder |
| Writeup (textarea) | label, required, placeholder |
| Number | label, required |
| Image upload/URL | label, required, `maxCount`, `maxSizeMB` |
| Video upload/URL | label, required, `maxCount`, `maxSizeMB` |
| File (PDF/Zip) | label, required, `maxSizeMB` |
| Work Links | label, required, `maxCount` |
| Dropdown Select | label, required, `options[]` |

Each field can be **reordered ↑/↓**, deleted, and has per-field size/count limits. The public Submit tab dynamically renders the form based on `contest.customFields`.

#### 5.3.6 Admin Contest Control Center
- **Create / Edit Contest** — full metadata + schedule + custom fields editor.
- **Duplicate** — clones a template as "Copy of [Title]" with a fresh slug.
- **Publish / Unpublish** — toggle visibility.
- **Archive / Unarchive** — soft-archive templates.
- **Pause / Resume** — stops/starts automatic cycle resets for recurring contests.
- **Extend Deadline (+24h)** — instant active cycle extension from the table row.
- **End Cycle Early** — closes submissions immediately, transitions to `judging`.
- **Submissions & Judging Inspector** — modal with all `customAnswers` per participant, score entry, judge remarks.
- **Declare Winners Studio** — pick 1st/2nd/3rd + special mentions, write announcement copy, publish to live `Winners` tab.
- **Cycle History Inspector** — browse all past cycles, inspect submissions and winner podiums.
- **Advanced filters** — search by title/slug, filter by Published/Drafts/Paused/Archived and frequency type.

---

### 5.4 Members
- Hierarchy-sorted team table, CSV import/export (`forge_members.csv`, `import_members.mjs`).
- Dynamic profile pages at `/[memberId]` with left-side hoverable avatar, socials, projects, achievements, schools, certifications, CGPA.
- Self-service endpoints under `/api/members/me/*` for elite users.

### 5.5 Events
- CRUD with **ReactCrop** poster editor (fixed `crop`/`completedCrop` state initialization).
- Built-in **registrations viewer** (`/api/events/[id]/registrations`).
- Public detail page with registration form.

### 5.6 Projects
- Open-source showcase with GitHub/demo links, tech-stack tags.

### 5.7 Notices
- Public announcements with priority badges.

### 5.8 Domains
- Visual department showcase using **GSAP ScrollTrigger** drop-in animations.

---

## 6. REST API Surface

```
/api/auth/[...nextauth]    POST   Microsoft OAuth callback
/api/auth/login            POST   Email-based login
/api/auth/check            GET    Session probe + role/elite flags
/api/auth/logout           POST   Clear session

/api/members               GET/POST            list / create
/api/members/[id]          GET/PATCH/DELETE    individual CRUD
/api/members/by-slug/[slug] GET                 resolve by slug
/api/members/bulk-order    POST                reorder hierarchy
/api/members/reorder/list  POST                bulk reorder
/api/members/me            GET/PATCH           self profile
/api/members/me/{achievements,certifications,cgpas,projects,registrations,schools}/*   self-managed collections

/api/events                GET/POST            list / create
/api/events/[id]           GET/PATCH/DELETE
/api/events/[id]/register  POST                user registration
/api/events/[id]/registrations GET              admin viewer

/api/media                 GET/POST            list / upload
/api/media/[id]            GET/PATCH/DELETE    individual + favorite toggle
/api/media/upload          POST                R2 multipart upload
/api/media/bulk            POST                bulk delete/move/favorite
/api/media/favorites       PATCH               bulk favorites
/api/media/folders         GET/POST/DELETE     explicit folder CRUD

/api/contests              GET/POST            list / create templates
/api/contests/[slug]       GET                 single template + active cycle
/api/contests/[slug]/submit POST                submit entry
/api/contests/[slug]/actions POST                admin actions (extend, end, pause, ...)
/api/contests/[slug]/results  POST              declare winners

/api/recruitments/config       GET/PATCH      drive settings + hero
/api/recruitments/apply        POST           submit application
/api/recruitments/applications GET/PATCH/DELETE admin manage

/api/projects              GET/POST
/api/projects/[id]         GET/PATCH/DELETE

/api/notices               GET/POST
/api/notices/[id]          GET/PATCH/DELETE

/api/domains               GET/POST
/api/domains/[id]          GET/PATCH/DELETE
```

---

## 7. Database Models (`lib/models/`)

| Model | Purpose |
|---|---|
| `Member.js` | Team members, hierarchy, socials, year |
| `Event.js` | Events with poster, schedule, registrations |
| `Project.js` | Open-source projects |
| `Notice.js` | Announcements |
| `Media.js` | R2 media metadata, `favorite`, `folder`, `eventName`, `tags`, `title`, `description` |
| `Folder.js` | Explicit persistent folders (unique name) |
| `Domain.js` | Club departments |
| `ContestTemplate.js` | Permanent contest config + `customFields[]` + schedule |
| `ContestCycle.js` | Per-recurrence cycle (start/end/status/winners) |
| `ContestSubmission.js` | Candidate entries with `customAnswers` |
| `RecruitmentSettings.js` | Drive OPEN/CLOSED + hero copy/image |
| `RecruitmentApplication.js` | Per-member application (unique on `memberId`) |
| `Registration.js` | Event registrations |

---

## 8. Engine: `lib/contestEngine.js`
Stateless helpers + DB orchestrator:
- `getWeeklyRecurrenceDates(schedule, refDate)` → computes start/end for current weekly cycle.
- `getMonthlyRecurrenceDates(schedule, refDate)` → same for monthly.
- `ensureActiveCycle(template)` → called by every public contest fetch:
  1. Transitions `active → submission_closed` if past deadline.
  2. Promotes `upcoming → active` if inside window.
  3. Returns existing valid cycle.
  4. **Spawns next cycle** when none exists and template is published + not paused, with the correct `cycleLabel` (`Week N`, `Month Year`, `Edition #1`).

---

## 9. Recent Changelog

### [August 2026]

#### Media Library
- **Multi-file queue upload** — each file shows live status + ✕ remove button; disabled only when queue empty or tags blank.
- **Custom "Create Folder" dialog** — replaced browser `prompt` with glassmorphic form-wrapped modal (Enter submits).
- **Folder select dropdown** in upload dialog (no more free-text).
- **`Folder` model + `/api/media/folders`** — explicit persistent empty folders.
- **Folder chips sourced from `mediaFolders` state** — empty folders now visible after `fetchMediaFolders()` refresh.
- **Optimistic favorite toggle** with rollback on PATCH failure + error toast.
- **`Array guard` in `fetchMedia`** — defensive check that fixed "media resets to `{}`" bug.
- **Auto-derived media titles** from S3 key filename at API read time (no DB migration needed).
- **Folder aggregate fallback** to `eventName` — legacy uploads now counted.
- **`silentFetchMedia()`** for all post-mutation refreshes (no loading flicker).
- **`visibilitychange` listener** — silent background refresh when tab regains focus.
- **`revalidatePath('/')`** after favorite/upload — landing page auto-updates, no hard refresh needed.
- **Glassmorphic + micro-animated buttons** across Media tab and admin dashboard.

#### Events
- **ReactCrop import + CSS** restored — poster cropper now works without runtime error.
- `crop` / `completedCrop` state initialization fixed.

#### Recruitments
- **`/join` feature**: KL University email gate, auto year extraction, primary/secondary domain, motivation essay, work links manager, real-time status tracking.
- **Submitted screen** — form completely hidden after submission; only confirmation card with live status visible.
- **Admin delete** — Trash button in table row + Remove Application in detail modal with confirmation.
- **Closed drive view** — glassmorphic banner with domain chips and CTAs.
- **CSV export** for committee review.

#### Contests
- **Template vs. Cycle architecture** with `contestEngine.js` automatic recurrence.
- **Permanent URLs** at `/contests/[slug]` across all cycles.
- **4 schedule types**: One-Time, Immediate, Weekly Recurring, Monthly Recurring.
- **5-tab public UI**: Overview, Submit, Rules, Winners, History.
- **Full Custom Form Builder** — 0-to-N custom fields with reorder/delete + per-field size & count limits.
- **Admin actions**: Duplicate, Publish/Unpublish, Archive, Pause/Resume, Extend Deadline (+24h), End Cycle Early.
- **Declare Winners Studio** modal with 1st/2nd/3rd + special mentions.
- **Cycle History Inspector** for browsing past cycles and submissions.
- **Advanced admin filters**: search, status, frequency.
- **`ModernDateTimePicker`** integration replacing native datetime inputs.
- **Trailing EOF markers removed** from `app/contests/page.css` and `app/contests/[slug]/page.css`.
- **Direct file uploads in submissions** — `image` / `video` / `file` fields now accept direct uploads (no more URL paste). Enforces per-field `maxSizeMB` and `maxCount` server-side and client-side. Files stored in R2 under `contests/<slug>/cycle_<n>/<memberId>/`. Schema upgraded to `submission.files[]` (legacy `fileUrl` retained for backward compat). Admin judging inspector previews uploaded images inline.
- **Submit button fix** — removed the `!subTitle.trim()` check from the submit button's `disabled` prop. Title is optional; the server already auto-fills it from the first non-empty custom-field answer or defaults to `Contest Entry`.
- **Link-field required validation fix** — server now accepts `workLinks[]` (top-level) as fulfilling a required `link`-type custom field (previously the validator only checked `customAnswers[].value`, which the link UI never wrote to). Also fixed `Contest Not Found` page-shell bug where any submit error threw the user to the not-found screen; errors now stay inline above the form.

#### Admin Dashboard
- **Modularized** — monolithic `app/admin/dashboard/page.jsx` (3,444 LOC) split into **7 section components** under `src/components/admin/`:
  `MembersSection`, `EventsSection`, `ContestsSection`, `ProjectsSection`, `NoticesSection`, `MediaSection`, `RecruitmentsSection`.
- Dashboard shell reduced to **~230 LOC** (auth, sidebar, state distribution).
- **Layout fix** — restored top-level `<aside>` + `<main>` as direct flex children of `.admin-dash` (removed rogue `<div className="admin-dash__body">` wrapper that broke sidebar layout).
- Each section component imports `AdminDashboard.css` + its own modal CSS so styling is self-contained.

#### Layout / Global
- **Sticky footer** — every page wrapper has `min-height: 100vh` + `<main>` has `flex: 1 0 auto`. Footer pinned to viewport bottom on all pages (`/`, `/join`, `/contests`, `/events`, `/projects`, `/notices`, `/team`, `/faq`, `/profile`).
- **Wide 900px two-column upload dialog** — file queue + metadata side by side, single-column on mobile.

#### Members
- **Left-side hoverable avatar** restored on `/[memberId]` profile pages.
- Hardcoded placeholder names/roll numbers removed from `MemberEditModal`.

---

## 10. Conventions

- **API responses** use `{ success: boolean, data?, error? }` shape.
- **Auth** always via cookie session — every protected endpoint calls `getAuthFromCookies()`.
- **Optimistic UI** + **rollback** pattern used everywhere mutations happen (favorites, status updates).
- **No browser `alert`/`prompt`/`confirm`** — always custom-styled dialogs.
- **Folder chip filter** `null` value = "All".
- **Contest cycle labels**: `Week N` (weekly), `Month Year` (monthly), `Edition #1` (one-time/immediate).
- **Date pickers** always use `ModernDateTimePicker` for visual consistency.

---

> When you make a change, append a bullet under §9 with the date. Keep this doc the source of truth.