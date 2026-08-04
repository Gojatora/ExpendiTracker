from fastapi import FastAPI

from src.routers import auth, expenses, comparison, categories

app = FastAPI(title="ExpendiTracker API")

app.include_router(auth.router)
app.include_router(expenses.router)
app.include_router(comparison.router)
app.include_router(categories.router)


@app.get("/")
def root():
    return {"status": "ExpendiTracker API is running"}