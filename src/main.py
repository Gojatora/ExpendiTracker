from fastapi import FastAPI

from src.routers import auth, expenses

app = FastAPI(title="ExpendiTracker API")

app.include_router(auth.router)
app.include_router(expenses.router)


@app.get("/")
def root():
    return {"status": "ExpendiTracker API is running"}