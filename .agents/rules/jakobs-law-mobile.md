# Mobile UX Standards — Jakob's Law Directive

> **Principle:** *"Users spend most of their time on other sites/apps. This means that users prefer your mobile app/site to work the same way as all the other apps they already know."* — Jakob Nielsen

All mobile viewports, mobile web experiences, progressive web apps (PWAs), Flutter, and native mobile shells across all projects must strictly comply with standard mobile platform design patterns and conventions.

---

## 1. Navigation & Information Architecture

- **Bottom Navigation Bar (Thumb Zone):**
  - Use a bottom navigation bar for 3 to 5 core top-level destinations.
  - Active tabs must be unmistakably highlighted with filled icons/accent color and text labels.
- **Top App Bar / Header:**
  - Left icon: Contextual Back Arrow (`←` / `chevron-left`) for subpages or Hamburger/Menu icon for top-level drawers.
  - Title: Clear, concise screen title (truncated with ellipsis if long).
  - Right icons: 1–2 high-frequency actions (e.g., Search, Profile, More `...`).
- **Predictable Back Navigation:**
  - Back button navigation must follow hierarchical stack history without dead ends or trapped modals.
  - Support native swipe-to-go-back gesture on iOS/mobile browsers.

---

## 2. Touch Targets & Ergonomics

- **Minimum Touch Target Size:**
  - Interactive elements (buttons, icons, list items, chips, checkboxes) must be at least **48×48 dp/px** (44×44 pt minimum on iOS) with at least 8px spacing.
- **Natural Thumb Zone Optimization:**
  - Primary call-to-actions (CTAs), submit buttons, and floating action buttons (FAB) must reside in the bottom third of the screen.
  - Destructive or rarely used actions belong inside menus or modal sheets, away from accidental thumb taps.
- **Safe Area Insets:**
  - Respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` for device notches, dynamic islands, and home indicator bars.

---

## 3. Modals, Drawers & Overlays

- **Bottom Sheets over Centered Dialogs:**
  - For options, filters, share menus, and context menus, use **Bottom Sheets** (swipe-down dismissable with drag indicator handle) instead of tiny centered desktop popup modals.
- **Full-Screen Modals for Multi-Step Tasks:**
  - For complex flows (editor, checkout, search filters), use full-screen views with a standard top-left Close (`X`) or Cancel button and top-right primary action (e.g., "Done" / "Save").

---

## 4. Search, Inputs & Virtual Keyboard

- **Recognizable Search Experience:**
  - Search bar placed at the top or sticky below the app bar with magnifying glass icon and instant clear (`X`) button.
  - Auto-focusing search should offer recent searches and instant filtering results.
- **Mobile Keyboard Optimization (`inputmode` & `autocomplete`):**
  - Always specify the semantic `inputmode` and `type` (`email`, `tel`, `numeric`, `decimal`, `url`, `search`) so the OS displays the correct on-screen keyboard.
  - Provide standard `autocomplete` attributes (`name`, `email`, `current-password`, `one-time-code`) for password managers and OS autofill.

---

## 5. Universal Iconography & Feedback

- **Standard Icon Metaphors:**
  - Search: Magnifying glass 🔍
  - Navigation / Menu: 3-line hamburger ☰
  - Settings: Gear ⚙️
  - Bookmarks / Favorites: Bookmark or Heart 🔖 / ❤️
  - Share: Standard share node / arrow 🔗 / ↗️
  - Notifications: Bell 🔔
  - Close / Dismiss: X ✕
  - Delete / Remove: Trash can 🗑️
- **Instant Touch Feedback:**
  - Visual touch states (active scale, ripple, or opacity change) and loading skeletons (shimmer) rather than blank screens during async fetches.
  - Use transient bottom Snackbars / Toast banners with optional action (e.g., "Undo") for confirmation messages.
