from fastapi import FastAPI

from src.routers import auth

app = FastAPI(title="ExpendiTracker API")

app.include_router(auth.router)


@app.get("/")
def root():
    return {"status": "ExpendiTracker API is running"}