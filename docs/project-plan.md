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
  
# Design Decisions

## Dashboard Aggregation Strategy
The dashboard screen combines two independent comparisons — regional benchmark 
comparison and previous-vs-current month comparison — into a single view of 
KPI cards and charts. Rather than having the backend pre-aggregate both into 
one combined API response, the mobile app issues two separate calls to 
ComparisonService (one per comparison type) and merges the results 
client-side for display. This keeps each backend method focused on a single 
comparison type (matching the two acceptance-criteria-defined use cases), 
at the cost of two round-trips instead of one on dashboard load.

**Region naming convention: full names over abbreviations**

- Chose to store full region names (`"National Capital Region"`,
  `"Cordillera Administrative Region"`, `"Bangsamoro Autonomous Region in
  Muslim Mindanao"`) rather than common abbreviations (NCR, CAR, BARMM) in
  the `Region` lookup table and `REGION_CODE_MAP`.
- Decided before database initialization, avoiding a naming mismatch between
  `aggregate_fies.py`'s output and the seeded `Region` table that would have
  caused silent join failures in `load_benchmarks.py`.

**Password hashing: pwdlib over passlib**

- Nearly every FastAPI tutorial defaults to `passlib`, but it's effectively
  unmaintained (last release several years ago) and has known compatibility
  issues with newer versions of `bcrypt`, where it fails to read bcrypt's
  version string and logs an error on every hash operation.
- Chose `pwdlib` instead — built by the creator of FastAPI Users specifically
  as a modern replacement, and the library FastAPI's own official tutorial
  has since adopted. Used `PasswordHash.recommended()`, which defaults to
  Argon2 (OWASP's current top recommendation for password hashing), with
  bcrypt available as a documented fallback.

**JWT library: PyJWT over python-jose**

- `python-jose` is the other common tutorial default, but like `passlib`,
  its maintenance has slowed and community discussion increasingly flags it
  as the outdated choice.
- Chose `PyJWT` instead — actively maintained, minimal API scope (JWT
  encode/decode only, no unrelated bundled crypto features), and the
  direction FastAPI's own documentation has been moving toward.

**Session strategy: JWT access tokens over server-side sessions**

- Server-side sessions (cookie-based) are a natural fit for browser clients,
  where cookie handling is automatic - but React Native has no equivalent
  automatic cookie jar, making sessions an awkward fit for a mobile client.
- Chose JWT access tokens instead: issued on login, stored client-side, sent
  via the `Authorization` header on each request. Requires no server-side
  session storage, and is the standard, well-documented pattern for a
  mobile app + API backend architecture like this project's.
- Configuration: HS256 signing algorithm (single backend issuing and
  verifying its own tokens - no need for RS256's asymmetric key split,
  which solves a multi-service trust problem this project doesn't have),
  7-day token expiry, no refresh-token mechanism yet. Refresh tokens are a
  reasonable future improvement but out of scope for the current project
  timeline - noted here rather than built now. 

**Comparison endpoint: user_id and region handled differently, deliberately**

- Same reasoning as the expense history endpoint: `user_id` is never accepted
  from client input (query param or otherwise) - it's always derived from
  the verified JWT via `current_user.user_id`. Accepting a client-supplied
  `user_id` would let any authenticated user request another user's private
  spending data just by changing a number in the URL.
- `region`, by contrast, IS accepted as an explicit, optional query
  parameter - and this is not the same problem in disguise. Regional
  benchmark data is public reference data, not private to any user, so
  letting someone compare their spending against a different region's
  benchmark (e.g. "what would this look like if I lived in NCR?") doesn't
  expose anyone's personal information. Region resolution follows a
  three-tier fallback: explicit `region` param -> the user's own saved
  `region_id` -> `None`, which the service then treats as a signal to
  compute a national average across all regions instead of a single
  region's data.

**Benchmark year: most recent available, not current calendar year**

- `RegionalBenchmark` rows are all tagged with the FIES survey year they
  came from (currently 2023, from the only dataset loaded so far). Naively
  filtering benchmarks by the current calendar year would return zero rows
  for every category, since PSA doesn't publish FIES annually - it's
  released roughly every three years, not on a fixed yearly cycle.
- `ComparisonService` instead runs `MAX(year)` against `regional_benchmarks`
  to find whatever year's data is actually loaded, and compares against
  that. This also means the code requires no changes when a newer FIES
  release (e.g. FIES 2026, once published) is eventually loaded - it will
  automatically start being used as the latest available year.
- A live PSA API integration to auto-refresh this data was considered and
  explicitly deferred - PSA does not appear to expose a public API for FIES
  releases; new survey years require a manual CSV download and re-run of
  `aggregate_fies.py` / `load_benchmark.py`, which is an acceptable manual
  process given PSA's multi-year release cadence.

**Missing benchmark/spending data: shown explicitly, not hidden or errored**

- A user may spend money on a category with no matching benchmark row (e.g.
  a category added after the benchmark data was loaded), or have a
  benchmark for a category they haven't spent anything on this month. Both
  cases are valid, expected states, not error conditions.
- The comparison response includes every category from the union of "user
  has spending" and "benchmark exists," with `user_spent`, `benchmark_avg`,
  and `status` all nullable. `status` (`"above"` / `"below"` / `"equal"`)
  is only computed when both values are present - there is no meaningful
  above/below comparison when one side of the comparison doesn't exist.
- Rejected alternative: silently dropping categories missing one side of
  the comparison. This would hide genuinely useful information from the
  user (e.g. "you spent money here but we have no regional reference for
  it yet") without any error to signal why a category is missing.

**National-average calculation: rounded to match currency precision**

- The national-average branch computes `AVG(avg_monthly_spend)` across all
  regions per category using Postgres's `AVG()` aggregate. Postgres returns
  this at full computed precision (e.g. `385.6352941176470588`), not
  rounded to 2 decimal places like the underlying `Numeric(10,2)` columns.
- Caught via a failing unit test asserting an exact string match on a
  national-average value - the mismatch (`1000.0000000000000000` vs the
  expected `1000.00`) surfaced this rather than it being noticed by eye.
  Fixed by rounding with Python's `Decimal`-aware `round()` (not `float`
  rounding, which would reintroduce the imprecision `Numeric` columns are
  meant to avoid) before returning the value from the service layer.

**Daily reminder: scope reduced from conditional to simple recurring**

- Original ticket criteria included "skipped if user already logged an
  expense that day." This would have required re-evaluating whether an
  expense was logged and rescheduling/cancelling the day's notification
  at each app-foreground or expense-creation event, since locally
  scheduled notifications have no way to run a live conditional check
  at the exact moment they fire (no server, no background function
  invoked at delivery time without significantly more infrastructure).
- Deliberately simplified to a plain recurring daily reminder ("Have you
  logged your expenses yet?") with no expense-check logic. This was a
  scope decision, not a technical workaround - the conditional version
  was implementable but added meaningful complexity for a habit-reminder
  feature where a occasional redundant reminder has low real cost.
- Uses expo-notifications' local (on-device) scheduling exclusively -
  remote/push notifications were not considered, since they require a
  development build (unsupported in Expo Go as of SDK 53+ on Android)
  and would add a push-credential/server dependency for a feature that's
  fundamentally about on-device timing, with no external trigger needed.

**Known limitation: Android notification delivery timing is OS-controlled**

- During testing, scheduled reminder notifications fired with inconsistent
  timing (a few minutes early/late, and occasionally not at all within a
  reasonable window) despite confirmed-correct scheduling parameters sent
  to the OS (verified via `getAllScheduledNotificationsAsync()` showing
  the correct hour/minute on every test).
- This is a documented, widely-known Android OS behavior, particularly
  aggressive on MIUI (Xiaomi) devices, which throttle/batch background
  notification delivery for battery optimization unless an app is
  manually exempted. This is outside what application code controls -
  not a bug in this project's implementation.
- No code-level fix exists for this within Expo Go. Documented here as a
  known constraint rather than something to keep debugging indefinitely.

  **Schema change: added manually via SQL, not through create_all()**

- `monthly_budget` column on `users` and the new `category_budgets` table
  were added after real data already existed in the database - the first
  time this project needed a schema change post-launch, unlike Sprint 1
  where all tables were created fresh.
- Applied via manual ALTER TABLE / CREATE TABLE in DBeaver rather than
  introducing a migration tool (Alembic) for one small, purely additive
  change. If further schema changes are needed later, revisit this
  decision - accumulating undocumented manual SQL changes doesn't scale.
- Exact SQL run:
```sql
  ALTER TABLE users ADD COLUMN monthly_budget NUMERIC(10, 2);

  CREATE TABLE category_budgets (
      budget_id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(user_id),
      category_id INTEGER NOT NULL REFERENCES categories(category_id),
      amount NUMERIC(10, 2) NOT NULL,
      CONSTRAINT uq_user_category_budget UNIQUE (user_id, category_id)
  );
```

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

**[RESOLVED] Regional benchmark data: unverified region code mapping**

- **Original risk**: `REGION_CODE_MAP` in `aggregate_fies.py` mapped FIES 2023's
  numeric `W_REGN` codes (1–14, 16, 17, 19) to Philippine region names based on
  standard PSGC numbering convention. PSA's own PSADA catalog metadata page for
  `w_regn` did not publish text labels for these codes, so the mapping was an
  informed guess, not independently confirmed from an authoritative source.
- **Why it mattered**: An incorrect mapping would silently mislabel every
  household's regional benchmark data — the aggregation script would run
  without error, but every downstream comparison in the app would be wrong.
- **Resolution**: Verified against `fies_2023_vol1_metadata_dictionary_.xlsx`
  (PSA's FIES 2023 data dictionary, sheet `fies_2023_v1_valueset`, field
  `W_REGN_VS1`), which contains the actual value-label lookup PSA omitted from
  the web-facing metadata page. All 17 mapped codes matched the original
  PSGC-convention guess exactly, including the non-obvious gap at codes 15
  and 18 (code 15 is ARMM's retired code, superseded by BARMM at 19; code 18
  is Negros Island Region, tracked via a separate `W_REGN_NIR` variable rather
  than the main `W_REGN`).
- **Takeaway**: The initial guess was correct, but treating it as unverified
  until checked against a primary source was the right call — this class of
  error (silent mislabeling with no runtime error) is exactly the kind that's
  expensive to catch after the fact.
---

## Database Normalization Review
1NF (First Normal Form)

Every column in every table holds a single, atomic value. No column stores comma-separated lists, JSON blobs, or repeating groups (e.g., a user's expenses are separate rows in the expenses table, not a list embedded in the users row).

2NF (Second Normal Form)

No partial dependency on a composite key. This is automatically satisfied here since every table uses a single-column surrogate primary key (id) rather than a composite key, so there's no possibility of an attribute depending on only part of the key.

3NF (Third Normal Form) — the key design decision

No non-key attribute depends transitively on another non-key attribute. This is the reasoning behind splitting regions and categories into their own lookup tables rather than storing them as raw strings directly on users, expenses, and regional_benchmarks.

Example of the anomaly this avoids: if region were stored as a plain string column on both users and regional_benchmarks, renaming a region (e.g., correcting a typo, or a data source updating its regional naming convention) would require updating every row referencing that string across multiple tables — a classic update anomaly. By storing region_id as a foreign key pointing to a single regions table, the region name is stored exactly once, and any change to it automatically applies everywhere it's referenced.

The same reasoning applies to categories.

Trade-off acknowledged

This normalization adds a small amount of query complexity — retrieving an expense with its category name now requires a join rather than reading a single column. Given this project's scale (a handful of tables, no high-throughput requirement), the data-integrity benefit of normalization clearly outweighs the minor query complexity cost.

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

## Regional Benchmark Data Source
This project uses PSA's FIES 2023 Volume 1 microdata (not included in this
repo due to file size — ~160k rows, >100MB). To reproduce the aggregation:
1. Download `FIES_PUF_2023_Volume1.CSV` from the PSADA catalog:
   https://psada.psa.gov.ph/catalog/318
2. Place it at `data/raw/FIES_PUF_2023_Volume1.CSV`
3. Run `python -m data.aggregate_fies` to regenerate the benchmark CSV
4. Run `python -m data.load_benchmark` to load it into your local DB