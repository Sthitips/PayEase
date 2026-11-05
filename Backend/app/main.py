from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.database.connection import get_db
from sqlalchemy.orm import Session
from sqlalchemy import text

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Backend is running!"}

@app.get("/api/health")
def health_check():
    return {
        "success": True,
        "message": "React is connected to FastAPI!"
    }

@app.get("/api/db-test")
def db_test(db: Session = Depends(get_db)):
    try:
        result= db.execute(text("SELECT current_database();"))
        database_name = result.scalar()
        return {
            "success": True,
            "message": f"Database connection successful! Connected to database: {database_name}"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Database connection failed: {str(e)}"
        }

