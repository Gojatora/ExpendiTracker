from fastapi import FastAPI

from src.routers import auth, expenses, comparison, categories, regions, budget

app = FastAPI(title="ExpendiTracker API")

app.include_router(auth.router)
app.include_router(expenses.router)
app.include_router(comparison.router)
app.include_router(categories.router)
app.include_router(regions.router)
app.include_router(budget.router)

@app.get("/")
def root():
    return {"status": "ExpendiTracker API is running"}