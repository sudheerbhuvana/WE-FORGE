# WE-FORGE Platform Architecture & Features

This document serves as a living record of the WE-FORGE platform's features, architecture, and technical decisions. It should be updated whenever significant changes are made to the codebase.

## 🏗 Tech Stack & Architecture
- **Framework**: Next.js 14+ (App Router)
- **Database**: MongoDB (via Mongoose)
- **Object Storage**: Cloudflare R2 (S3-compatible API) for media and image hosting
- **Styling**: Vanilla CSS with modern practices (CSS variables, flex/grid, glassmorphism)
- **Animations**: GSAP (ScrollTrigger) and Framer Motion for micro-animations and scroll effects
- **Authentication**: Custom JWT/Cookie-based auth system

---

## ✨ Key Features & Modules

### 1. Admin Dashboard (`/admin/dashboard`)
A centralized control panel for managing the entire platform. Protected by role-based authentication.
- **Member Management**: Add, edit, and organize club members. Tracks roles, contact info, and generates dynamic profile pages.
- **Media Library**: 
  - Upload images and videos directly to Cloudflare R2.
  - **Folders**: Explicitly create and manage custom folders, or dynamically group media by event tags.
  - **Favorites**: Star media to push them to the public Landing Page Featured Gallery.
  - **Bulk Actions**: Select multiple files to delete, move, or favorite at once.
- **Event Management**: Create and schedule events. Includes a built-in image cropper (`ReactCrop`) for event posters. Tracks user registrations.
- **Projects Showcase**: Document open-source projects, link to GitHub/Live Demos, and list tech stacks.
- **Notices**: Publish announcements or important notices to the platform.

### 2. Public Interface
- **Landing Page**: Features a stunning, animation-heavy intro. Includes the `FeaturedGallery` which dynamically pulls "favorited" media from the database, and an `AppleCardsCarousel` for high-end UI feel.
- **Dynamic Member Profiles (`/[memberId]`)**: Personalized pages for every club member, featuring hoverable profile avatars, social links, and bio information.
- **Domains (`/domains`)**: Visual breakdown of the club's departments (Tech, Media, Content, Operations, Speaking) using GSAP ScrollTrigger for drop-in animations.
- **Events (`/events`)**: Public-facing event listings.

### 4. Recruitments System ("Join Us" - `/join` & `/join-us`)
- **Candidate Application Workflow**:
  - Requires Microsoft authentication (`@kluniversity.in`).
  - Auto-extracts applicant year from student roll number (e.g. `24...` $\rightarrow$ `Y24`, `25...` $\rightarrow$ `Y25`).
  - Dynamic domain selection: Applicants pick a **Primary Domain** (required) and optional **Secondary Domain**.
  - Detailed motivation statement ("Why this domain?").
  - Work Links manager allowing applicants to attach portfolio links (GitHub, Figma, Behance, Drive, etc.).
  - Real-time application status tracking (`Pending Review`, `Shortlisted`, `Accepted`, `Rejected`).
- **Admin Recruitment Management**:
  - **Drive Control**: Toggle recruitment status (`Open` vs `Closed`) and customize page hero banner image/copy.
  - **Review Dashboard**: Filter applicants by Domain, Year (Y24, Y25...), and Status (`pending`, `shortlisted`, `accepted`, `rejected`).
  - **Candidate Detail Modal**: Review motivation essays, click portfolio links, update status, and write internal admin review notes.
  - **CSV Export**: Export all applicant data for offline committee review.

### 5. Contest System (`/contests` & `/contests/[slug]`)
- **Template vs Cycle Architecture**:
  - `ContestTemplate`: Stores permanent metadata, rules, prize info, and schedule rules (One-Time, Immediate with Deadline, Weekly Recurring, Monthly Recurring).
  - `ContestCycle`: Generated per recurrence (e.g. *Week 31*, *August 2026*). Holds participant entries, submission counts, deadline status, and winner podiums.
  - `ContestSubmission`: Tracks candidate entries, work links (GitHub, Figma, Live Link), score, and judge remarks.
- **Permanent Contest URLs**:
  - The public route `/contests/[slug]` (e.g. `/contests/photography`) **never changes** across recurring cycles.
  - Automatic `contestEngine.js` resolves the active cycle or lets users browse historical cycle archives via `?cycle=N`.
- **Multi-Tab Experience**:
  - `Overview`: Live countdown timer (*Starts In* / *Ends In*), prize details, eligibility, rules.
  - `Submit`: Participant entry submission form with work link manager and withdrawal options.
  - `Rules`: Contest guidelines.
  - `Winners`: Podium showcase for 🥇 1st Place, 🥈 2nd Place, 🥉 3rd Place, and Special Mentions with judge notes.
  - `History`: Interactive cycle archive timeline.
- **Admin Contest Studio**:
  - Template creator/editor, pause/resume toggle, submissions & judging inspector, and Declare Winners studio.

---

## 🛠 Recent Changelog & System Updates
- **Admin Dashboard Modularization**: Refactored the monolithic `app/admin/dashboard/page.jsx` file into 7 modular section components (`MembersSection.jsx`, `EventsSection.jsx`, `ContestsSection.jsx`, `ProjectsSection.jsx`, `NoticesSection.jsx`, `MediaSection.jsx`, `RecruitmentsSection.jsx`) inside `src/components/admin/`.
- **Contest Module**: Added `ContestTemplate`, `ContestCycle`, and `ContestSubmission` models, automated recurrence engine (`contestEngine.js`), `/api/contests/*` API endpoints, permanent URL routing at `/contests/[slug]`, 5-tab public UI, and Admin Dashboard Contest Control Center.
- **Recruitments Feature**: Added `/join` candidate application workflow, `RecruitmentSettings` & `RecruitmentApplication` models, `/api/recruitments/*` API routes, and Admin Dashboard recruitments tab.
- **Folder Management**: Added explicit `Folder` model, multi-file queue-based upload modal with per-file status & remove controls, and folder select dropdowns.
- **Favorites & Caching**: Added `revalidatePath('/')` and optimistic UI updates for favorite toggling.


---

## 📝 Changelog & Recent Updates

### [August 2026]
- **Media Folders**: Added explicit `Folder.js` database model and API routes to allow creating empty folders in the Admin Media dashboard. Replaced native browser `prompt` with a custom-styled glassmorphic dialog modal.
- **Media Favorites Fix**: Implemented `PATCH` API route for `/api/media/favorites` to fix bulk favoriting. Favorited items now correctly sync with the public Landing Page Featured Gallery.
- **Dashboard UI Overhaul**: Upgraded admin buttons across the board to feature glassmorphism (`backdrop-filter`), smoother easing transitions (`cubic-bezier`), and micro-animations on hover/click.
- **Event Cropper Fix**: Resolved runtime error during Event creation by properly initializing `crop` and `completedCrop` state variables for the ReactCrop component.
- **Profile Avatars**: Restored the left-side hoverable profile image section on the individual member profile pages (`/[memberId]`).
- **Placeholder Cleanup**: Removed hardcoded placeholder names and roll numbers from the `MemberEditModal`.
