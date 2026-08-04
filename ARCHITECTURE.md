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

### 3. Core Database Models (`lib/models/`)
- `Member.js`: Stores user details, roles, and slugs.
- `Media.js`: Tracks S3 keys, URLs, types (image/video), folders, and favorites.
- `Folder.js`: Stores explicitly created media folders.
- `Event.js`: Event metadata, dates, and poster URLs.
- `Project.js` & `Notice.js`: Content management models.

---

## 📝 Changelog & Recent Updates

### [August 2026]
- **Media Folders**: Added explicit `Folder.js` database model and API routes to allow creating empty folders in the Admin Media dashboard. Replaced native browser `prompt` with a custom-styled glassmorphic dialog modal.
- **Media Favorites Fix**: Implemented `PATCH` API route for `/api/media/favorites` to fix bulk favoriting. Favorited items now correctly sync with the public Landing Page Featured Gallery.
- **Dashboard UI Overhaul**: Upgraded admin buttons across the board to feature glassmorphism (`backdrop-filter`), smoother easing transitions (`cubic-bezier`), and micro-animations on hover/click.
- **Event Cropper Fix**: Resolved runtime error during Event creation by properly initializing `crop` and `completedCrop` state variables for the ReactCrop component.
- **Profile Avatars**: Restored the left-side hoverable profile image section on the individual member profile pages (`/[memberId]`).
- **Placeholder Cleanup**: Removed hardcoded placeholder names and roll numbers from the `MemberEditModal`.
