# ExpendiTracker

A mobile app that helps users track daily expenses and see how their spending compares to regional cost-of-living benchmarks — turning abstract financial literacy into a concrete, actionable comparison.

Full project rationale, user stories, risks, and sprint plan: see [`docs/PROJECT-PLAN.md`](docs/PROJECT-PLAN.md).

## Tech stack

- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL, SQLAlchemy ORM
- **Mobile frontend**: React Native (Expo)
- **Deployment**: TBD (Render/Railway for backend, Expo EAS Build for mobile)

## Project structure

```
ExpendiTracker/
├── src/
│   ├── main.py           # FastAPI app entrypoint
│   ├── routers/           # API route handlers (controllers)
│   ├── services/           # Business logic
│   ├── models/              # SQLAlchemy DB models
│   ├── schemas/             # Pydantic request/response schemas
│   └── db/                    # DB connection/session setup
├── data/                    # Scripts + data for loading regional benchmarks
├── tests/                    # pytest tests
├── docs/
│   └── PROJECT-PLAN.md   # Full SE documentation: overview, user stories, risks, sprint plan
├── requirements.txt
└── .env.example
```

## Setup (backend)

```bash
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # fill in your local DB credentials
uvicorn src.main:app --reload
```

Once running, the API is available at `http://127.0.0.1:8000`, with interactive docs at `http://127.0.0.1:8000/docs`.

## Running tests

```bash
pytest
```

## Sprint tracking

Development is tracked via [GitHub Issues](../../issues) and [Milestones](../../milestones), organized by sprint. See the Kanban board under the Projects tab for current status.
