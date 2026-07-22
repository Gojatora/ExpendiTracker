# ExpendiTracker
A project developed by yours truly that delivers monthly expense report and tracking

# Overview
  Financial literacy is one of the essential life skills needed for financial stability and peace of mind, yet it remains underdeveloped among Filipino students. A House of Representatives bill (HB 2270) cites Philippine Statistics Authority data showing that in 2020, the majority of Filipino students had limited access to formal financial education, with only a small fraction receiving structured lessons on budgeting, saving, or responsible borrowing. This gap in early financial education contributes to poor money management in adulthood — difficulty tracking expenses, managing debt, and building savings — ultimately leading to financial insecurity.

  This project proposes a mobile application that addresses this gap by combining personal budgeting tools with real-time, data-driven spending insights. Rather than simply logging expenses, the app compares a user's spending against regional benchmarks derived from public economic data, helping users understand not just what they spent, but whether their spending is reasonable relative to their peers — turning an abstract financial literacy problem into a concrete, actionable comparison.

# User Stories & Acceptance Criteria

## Must-Have

### I. User Registration & Login
> As a user, I want to create an account and log in, so that my expense data is saved and private to me.

**Acceptance Criteria:**
- User can register with email and password
- User can log in with valid credentials and is rejected with an error message for invalid ones
- Passwords are stored securely (hashed, never plaintext)

### II. Expense Logging
> As a user, I want to log my daily expenses, so that I can track my spending.

**Acceptance Criteria:**
- User can enter an amount, category, date, and optional note
- Logged expense appears immediately in the user's expense history
- User can edit or delete a previously logged expense

### III. Cost of Living Dashboard Report
> As a user, I want to see a monthly cost-of-living report comparing my spending to regional benchmarks, so that I can use it as a reference for my monthly budgeting.

**Acceptance Criteria:**
- Dashboard shows the user's total spending per category for the current month
- Each category shows the regional benchmark average alongside the user's actual spending
- User can see at a glance whether they're above or below the benchmark per category

---

## Should-Have

### I. Manual Location Setting
> As a user, I want to set my location, so that my cost-of-living dashboard is compared against benchmarks for my specific region.

**Acceptance Criteria:**
- User can select their region/state from a list during onboarding or in settings
- Dashboard benchmark data updates to reflect the selected region
- If no location is set, dashboard falls back to a national average rather than showing no data

### II. End-of-Day Reminder Notification
> As a user, I want to receive a reminder notification, so that I can build a habit of logging my expenses daily.

**Acceptance Criteria:**
- User receives a push notification at a configurable time each day
- Notification is skipped if the user has already logged an expense that day
- User can disable the reminder in settings

---

## Nice-to-Have

### I. Offline Expense Logging
> As a user, I want to log expenses without an internet connection, so that I can continue tracking daily spending even when offline.

**Acceptance Criteria:**
- Expenses logged offline are stored locally on the device
- Once connectivity is restored, offline entries automatically sync to the backend
- User is shown a visual indicator for entries pending sync

### II. Previous vs. Current Month Spending Comparison
> As a user, I want to see a comparison between my previous and current month's spending, so that I can identify changes in my spending habits.

**Acceptance Criteria:**
- User can view a side-by-side or delta view of spending per category across two months
- Percentage change is shown per category (e.g., "+12% on food vs. last month")
- Comparison updates automatically as the current month progresses
  
# Risks & Assumptions

## Assumptions
- Users have basic smartphone literacy and are comfortable using mobile apps for daily tasks.
- Users are willing to manually log expenses regularly (no automatic bank-linking in this version).
- Publicly available regional cost-of-living/expenditure data (e.g., from government statistics agencies) is accurate enough to serve as a meaningful benchmark.
- Users have intermittent but eventual internet access (relevant for the Offline Logging feature — data doesn't need to sync in real time, just eventually).
- The target user base primarily resides in areas covered by available regional benchmark data; users in unmapped areas will rely on a national average fallback.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Users abandon the app after a few days due to logging fatigue | High | High | Prioritize low-friction expense entry (minimal required fields); use the End-of-Day Reminder to build habit formation |
| Regional benchmark data is outdated or too coarse-grained to feel relevant to users | Medium | Medium | Clearly label data source and time period; set expectations in-app that comparisons are regional, not hyper-local |
| Manual expense logging leads to incomplete/inaccurate spending data, undermining the comparison feature | High | Medium | Keep entry friction low; consider lightweight validation (e.g., flag unusually large entries) rather than blocking submission |
| Offline sync conflicts (e.g., same expense logged twice, or edited differently offline vs. online) | Medium | Low | Use timestamps and unique local IDs to deduplicate on sync; last-write-wins is acceptable for a first version |
| Push notification fatigue causes users to disable reminders entirely | Medium | Low | Make reminder time configurable and easy to snooze/disable without leaving the app |
| Scope creep from Nice-to-Have features delays Must-Have delivery before the project deadline | Medium | High | Strictly timebox Must-Have features first; treat Should/Nice-to-Have as stretch goals only if ahead of schedule |
| Single developer (or small team) bandwidth limits given the fixed graduation deadline | High | High | Sequence work by priority tier (Must → Should → Nice); build in buffer weeks; cut Nice-to-Have features first if behind schedule |

---

# Plan

## Timeline Overview

| Phase | Duration | Focus |
|---|---|---|
| Foundations | Weeks 1–4 | Git workflow, APIs, SQL/database design, Docker & deployment basics |
| Backend Core | Weeks 5–7 | Auth, expense CRUD, regional benchmark data ingestion |
| Comparison Feature | Weeks 8–9 | Dashboard comparison logic, testing |
| Mobile Frontend Ramp-Up | Weeks 10–11 | React Native/Expo fundamentals, navigation |
| Mobile Frontend Build | Weeks 12–15 | Core screens: Home, Add Expense, Comparison, Settings |
| Should-Have Features | Weeks 16–17 | Manual location setting, end-of-day reminders |
| Nice-to-Have Features (if ahead of schedule) | Weeks 18–19 | Offline logging, month-over-month comparison |
| Polish, Testing, Deployment | Weeks 20–21 | Bug fixes, documentation, app packaging, deployment |
| Buffer / Contingency | Weeks 22–23 | Unresolved issues, final QA |

## Sprint Breakdown (2-week sprints)

**Sprint 1 — Foundations**
- Set up repo structure, Git workflow
- Design database schema (users, expenses, benchmarks)
- Load initial regional benchmark dataset

**Sprint 2 — Auth & Expense Logging**
- User registration & login (Must-Have I)
- Expense logging CRUD endpoints (Must-Have II)

**Sprint 3 — Cost of Living Dashboard**
- Comparison logic: user spending vs. benchmark (Must-Have III)
- Unit tests for comparison calculations

**Sprint 4 — Mobile Ramp-Up**
- React Native/Expo environment setup
- Navigation structure (tab/stack navigators)
- Connect app shell to backend API

**Sprint 5 — Core Screens**
- Home/Dashboard screen
- Add Expense screen

**Sprint 6 — Comparison Screen & Auth UI**
- Comparison screen with charts
- Login/registration screens

**Sprint 7 — Should-Have Features**
- Manual location setting (Should-Have I)
- End-of-day reminder notifications (Should-Have II)

**Sprint 8 — Nice-to-Have Features (conditional)**
- Offline expense logging (Nice-to-Have I)
- Previous vs. current month comparison (Nice-to-Have II)

**Sprint 9 — Polish & Deployment**
- Bug fixes, UI polish
- Deploy backend, package mobile build
- Finalize documentation

**Sprint 10 — Buffer**
- Address unresolved issues from QA
- Final testing pass before submission/graduation deadline

---

# Expected Outcomes

By project completion, the application is expected to deliver:

- A **fully functional mobile app** (React Native/Expo) allowing users to register, log in, and securely track daily expenses.
- A **Cost of Living Dashboard** that compares a user's monthly spending per category against regional benchmark data, giving users an actionable reference point for budgeting.
- **Region-aware benchmarking**, allowing comparisons to reflect the user's actual location rather than a generic national figure.
- Support features (reminders, offline logging, month-over-month comparison) delivered to the extent time allows, without compromising the Must-Have feature set.
- A **deployed, demoable system**: live backend API, packaged/installable mobile build, and documentation (README, architecture overview, setup instructions) suitable for a portfolio and academic submission.
- Evidence of sound software engineering practice: version-controlled history, tested core logic (especially the comparison feature), and a documented requirements-to-implementation trail (user stories → acceptance criteria → sprint delivery).
- A **learning outcome** for the developer: hands-on experience across the full stack — backend API design, database modeling, mobile development, and deployment — directly applicable to entry-level software developer or data-adjacent engineering roles after graduation.
