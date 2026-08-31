# ExpendiTracker

A mobile app that helps users track daily expenses and see how their spending compares to regional cost-of-living benchmarks — turning abstract financial literacy into a concrete, actionable comparison. Built for Filipino users, using real regional benchmark data from the Philippine Statistics Authority's Family Income and Expenditure Survey (FIES 2023).

Full project rationale, user stories, design decisions, risks, and sprint plan: see [`docs/PROJECT-PLAN.md`](docs/PROJECT-PLAN.md).

## Tech stack

- **Backend**: FastAPI (Python), JWT authentication, layered architecture (routers → services → models)
- **Database**: PostgreSQL, SQLAlchemy ORM
- **Mobile frontend**: React Native (Expo, Expo Router), TypeScript
- **Testing**: pytest (30+ backend tests covering auth, expenses, comparisons)
- **Containerization**: Docker (see `Dockerfile`) — builds and runs correctly against a real Postgres database; see [Deployment Status](#deployment-status) below

## Architecture overview

**Backend** follows a layered, MVC-inspired structure:
- **Routers** — thin HTTP layer; parse requests, call services, translate exceptions to HTTP status codes
- **Services** — business logic (auth, expenses, comparisons, budgets); no HTTP concerns
- **Models** — SQLAlchemy ORM models, normalized schema (regions/categories as lookup tables)
- **Schemas** — Pydantic request/response contracts, deliberately separate from DB models (e.g., password hashes never leave the service layer)

Auth uses JWT access tokens (not server-side sessions), since a mobile client has no automatic cookie handling. See `docs/PROJECT-PLAN.md` for the full reasoning behind this and other key decisions (password hashing library choice, region/benchmark fallback logic, offline sync design, etc.).

**Mobile app** talks to the backend exclusively over REST, with:
- A shared `axios` client (`api/client.js`) that automatically attaches the JWT to every request
- Route-level auth gating via Expo Router's `Stack.Protected`, so unauthenticated users can't reach any tab
- An offline-first expense queue (`AsyncStorage`) that auto-syncs the moment connectivity returns

## Project structure

```
ExpendiTracker/
├── src/
│   ├── main.py               # FastAPI app entrypoint
│   ├── routers/               # API route handlers (controllers)
│   ├── services/               # Business logic
│   ├── models/                  # SQLAlchemy DB models
│   ├── schemas/                  # Pydantic request/response schemas
│   └── db/                        # DB connection/session setup
├── data/                          # Scripts + data for loading regional benchmarks
├── tests/                          # pytest tests
├── mobile/                          # React Native (Expo) app
│   ├── app/                          # Screens (Expo Router file-based routing)
│   │   ├── (auth)/                    # Login/register (unauthenticated)
│   │   └── (tabs)/                    # Home, Add Expense, Dashboard, Settings
│   ├── api/                          # Backend API client wrappers
│   ├── context/                      # App-wide state (auth)
│   └── lib/                          # Offline queue, connectivity, reminders
├── docs/
│   └── PROJECT-PLAN.md              # Full SE documentation: overview, user stories, design decisions, risks, sprint plan
├── Dockerfile
├── .dockerignore
├── requirements.txt
└── .env.example
```

## Setup (backend)

```bash
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # fill in your local DB credentials
uvicorn src.main:app --reload --host 0.0.0.0
```

`--host 0.0.0.0` is required if you want to test against the mobile app on a physical device — without it, the backend only accepts connections from `localhost`, which the phone can't reach over Wi-Fi.

Once running, the API is available at `http://127.0.0.1:8000`, with interactive docs at `http://127.0.0.1:8000/docs`.

## Setup (mobile)

```bash
cd mobile
npm install
cp .env.example .env           # set EXPO_PUBLIC_API_URL to your machine's LAN IP + port, e.g. http://192.168.x.x:8000
npx expo start
```

Scan the QR code with **Expo Go** (SDK 54) on your phone. Your phone and computer must be on the same Wi-Fi network, and `EXPO_PUBLIC_API_URL` must point at your computer's actual LAN IP (not `localhost`) — check the `Metro:` line in the `expo start` output if you're unsure of your current IP.

## Running with Docker

```bash
docker build -t expenditracker-backend .
docker run -p 8000:8000 --env-file .env.docker expenditracker-backend
```

`.env.docker` is a separate, gitignored env file (copy `.env.example` and fill it in) — it must use `DATABASE_URL=postgresql://...@host.docker.internal:5432/...` rather than `localhost`, since `localhost` inside a container refers to the container itself, not your host machine running Postgres.

## Running tests

```bash
python -m pytest
```

(Not `pytest` alone — the project root needs to be on the Python path for the `src` imports to resolve; `python -m pytest` handles this correctly.)

Tests run against an isolated `expenditracker_test` database, configured via `TEST_DATABASE_URL` in `.env`.

## Screenshots

<!-- Add screenshots or a demo GIF here before submission. Suggested: Login,
     Home (with budget cards), Add Expense (batch entry), Dashboard (KPIs +
     charts), Settings. -->

## User stories → shipped features

| Priority | User story | Status | Sprint |
|---|---|---|---|
| Must-Have | User registration & login | ✅ Shipped | 2 |
| Must-Have | Expense logging (CRUD) | ✅ Shipped | 2 |
| Must-Have | Cost of Living Dashboard (benchmark comparison) | ✅ Shipped | 3 |
| Should-Have | Manual location setting | ✅ Shipped | 7 |
| Should-Have | End-of-day reminder notifications | ✅ Shipped (simplified scope — see PROJECT-PLAN) | 7 |
| Nice-to-Have | Offline expense logging | ✅ Shipped | 8 |
| Nice-to-Have | Previous vs. current month comparison | ✅ Shipped | 8 |
| Beyond original scope | Monthly & per-category budgets, PSA benchmark autofill | ✅ Shipped | — |
| Beyond original scope | Dashboard KPIs (avg daily spend, projected total, top category, biggest mover, savings rate) | ✅ Shipped | — |
| Beyond original scope | 12-month spending trend chart | ✅ Shipped | — |

Every Must-Have, Should-Have, and Nice-to-Have from the original project plan is implemented and tested. See `docs/PROJECT-PLAN.md` for full acceptance criteria and any documented scope adjustments.

## Deployment status

The backend is **containerized and verified working**: `docker build` completes cleanly, and the resulting container starts, connects to a real PostgreSQL database, and serves real data end-to-end (confirmed via `GET /categories` returning live results from inside the container).

**Live cloud deployment (Render + Neon) was deliberately deferred**, not abandoned due to a blocker — for an in-person defense, the local setup used throughout development (laptop running the backend, phone connected over the same Wi-Fi) is sufficient and has been the proven, reliable setup for every demo and test in this project. Cloud deployment remains a natural next step post-submission, and the Dockerfile means it's a small, well-understood step away rather than unstarted work.

## Known limitations

- No JWT refresh token mechanism — access tokens are valid for 7 days with no revocation; a reasonable scope tradeoff for this project's timeline (see PROJECT-PLAN)
- Notification delivery timing is subject to Android OS-level battery optimization (particularly MIUI devices) — scheduling logic is confirmed correct, but exact delivery time can vary by a few minutes
- Comparison chart's "% of Benchmark" and "vs. Previous Month" visuals hit a `victory-native` library bug around ordinal-axis label rendering on bar charts; "vs. Previous Month" was rebuilt with plain React Native views to work around it
- Savings Rate KPI requires the user to set their monthly income in Settings; shows a prompt rather than a number until they do

## Sprint tracking

Development is tracked via [GitHub Issues](../../issues) and [Milestones](../../milestones), organized by sprint. See the Kanban board under the Projects tab for current status.