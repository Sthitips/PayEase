from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import httpx
from app.database.connection import get_db
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException
from app.services.paypal_service import get_paypal_access_token, create_paypal_order, capture_paypal_order
from app.routes.auth import router as auth_router
from app.routes.groups import router as groups_router
from app.routes import expenses
from app.routes import settlement_payments
from app.schemas.paypal import PayPalOrderRequest 

app = FastAPI()
app.include_router(auth_router)
app.include_router(groups_router)
app.include_router(expenses.router)
app.include_router(settlement_payments.router)

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

@app.get("/api/paypal/test")
def paypal_test():
    from app.core.config import settings
    return {
        "configured": bool(settings.PAYPAL_CLIENT_ID and settings.PAYPAL_CLIENT_SECRET),
        "message": "PayPal configuration is set up correctly." if settings.PAYPAL_CLIENT_ID and settings.PAYPAL_CLIENT_SECRET else "PayPal configuration is missing. Please check your .env file."
    }

@app.get("/api/paypal/token-test")
async def paypal_token_test():
    try:
        token = await get_paypal_access_token()

        return {
            "success": True,
            "message": "Successfully authenticated with PayPal Sandbox!",
            "token_received": bool(token)
        }

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail="PayPal authentication failed. Check your credentials."
        )

    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to PayPal Sandbox."
        )

@app.post("/api/paypal/create-order")
async def create_order(request: PayPalOrderRequest):
    try:
        order = await create_paypal_order(
            amount=f"{request.amount:.2f}",
            group_id=request.group_id
        )

        if not order["approval_url"]:
            raise HTTPException(
                status_code=502,
                detail="PayPal did not return an approval URL."
            )

        return {
            "success": True,
            **order
        }

    except httpx.HTTPStatusError as e:
        print("PayPal HTTP Status:", e.response.status_code)
        print("PayPal Error Response:", e.response.text)
        print("Request URL:", e.request.url)
        print("Redirect Location:", e.response.headers.get("location"))
        raise HTTPException(
            status_code=502,
            detail={
                "message": "PayPal could not create the order.",
                "paypal_status": e.response.status_code,
                "paypal_error": e.response.text
            }
        )

    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to PayPal."
        )

@app.post("/api/paypal/capture-order/{order_id}")
async def capture_order(order_id: str):
    try:
        capture_data = await capture_paypal_order(order_id)

        return {
            "success": True,
            "order_status": capture_data.get("status"),
            "capture_details": capture_data.get(
                "purchase_units", []
            )[0].get("payments", {}).get("captures", [])
        }

    except httpx.HTTPStatusError as e:
        print("PayPal HTTP Status:", e.response.status_code)
        print("PayPal Error Response:", e.response.text)

        raise HTTPException(
            status_code=502,
            detail={
                "message": "PayPal capture failed",
                "paypal_status": e.response.status_code,
                "paypal_error": e.response.json()
            }
        )

    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to PayPal."
        )

from fastapi.responses import RedirectResponse

@app.get("/api/paypal/return")
def paypal_return(token: str, group_id: int):
    return RedirectResponse(
        url=(
            f"http://localhost:5173/group/{group_id}/scan"
            f"?payment=returned&order_id={token}"
        ),
        status_code=303
    )


@app.get("/api/paypal/cancel")
def paypal_cancel(group_id: int):
    return RedirectResponse(
        url=(
            f"http://localhost:5173/group/{group_id}/scan"
            f"?payment=cancelled"
        ),
        status_code=303
    )

