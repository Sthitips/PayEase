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
from uuid import uuid4
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.group_member import GroupMember
from app.models.payment_transaction import PaymentTransaction
from fastapi.responses import RedirectResponse
from app.routes import settlements
from app.core.config import settings
app = FastAPI()
app.include_router(auth_router)
app.include_router(groups_router)
app.include_router(expenses.router)
app.include_router(settlement_payments.router)
app.include_router(settlements.router)

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
async def create_order(
    request: PayPalOrderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify that the group exists and the user belongs to it.
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == request.group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this group."
        )

    try:
        # 2. Create the PayPal order.
        order = await create_paypal_order(
            amount=f"{request.amount:.2f}",
            group_id=request.group_id
        )

        if not order["approval_url"]:
            raise HTTPException(
                status_code=502,
                detail="PayPal did not return an approval URL."
            )

        # 3. Save the pending transaction.
        transaction = PaymentTransaction(
            group_id=request.group_id,
            payer_user_id=current_user.id,
            provider="paypal",
            provider_order_id=order["order_id"],
            idempotency_key=f"paypal:{order['order_id']}",
            amount=request.amount,
            currency="USD",
            status="created",
            provider_data={
                "order_status": order.get("status")
            }
        )

        db.add(transaction)
        db.commit()
        db.refresh(transaction)

        # 4. Return the approval URL to React.
        return {
            "success": True,
            **order,
            "transaction_id": transaction.id
        }

    except httpx.HTTPStatusError as e:
        db.rollback()

        print("PayPal HTTP Status:", e.response.status_code)
        print("PayPal Error Response:", e.response.text)

        raise HTTPException(
            status_code=502,
            detail="PayPal could not create the order."
        )

    except httpx.RequestError:
        db.rollback()

        raise HTTPException(
            status_code=503,
            detail="Could not connect to PayPal."
        )

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()
        print("Order creation/database error:", str(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to save the payment transaction."
        )


@app.post("/api/paypal/capture-order/{order_id}")
async def capture_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # 1. Find the transaction belonging to the logged-in payer.
        transaction = db.query(PaymentTransaction).filter(
            PaymentTransaction.provider_order_id == order_id,
            PaymentTransaction.payer_user_id == current_user.id
        ).first()

        if not transaction:
            raise HTTPException(
                status_code=404,
                detail="Payment transaction not found."
            )

        # 2. Prevent duplicate capture attempts.
        if transaction.status == "COMPLETED":
            return {
                "success": True,
                "order_status": "COMPLETED",
                "capture_id": transaction.provider_capture_id,
                "message": "Payment was already captured."
            }

        # 3. Capture the approved PayPal order.
        capture_data = await capture_paypal_order(order_id)

        order_status = capture_data.get("status")

        # 4. Only mark the transaction completed if PayPal confirms it.
        if order_status != "COMPLETED":
            transaction.status = order_status or "FAILED"
            transaction.provider_data = capture_data
            db.commit()

            return {
                "success": False,
                "order_status": order_status,
                "message": "PayPal has not confirmed payment completion."
            }

        # 5. Extract the capture details.
        purchase_units = capture_data.get("purchase_units", [])

        captures = (
            purchase_units[0]
            .get("payments", {})
            .get("captures", [])
            if purchase_units else []
        )

        if not captures or not captures[0].get("id"):
            raise HTTPException(
                status_code=502,
                detail="PayPal did not return a valid capture ID."
            )

        capture_id = captures[0]["id"]

        # 6. Update the existing database transaction.
        transaction.provider_capture_id = capture_id
        transaction.status = "COMPLETED"
        transaction.provider_data = capture_data

        db.commit()
        db.refresh(transaction)

        return {
            "success": True,
            "order_status": "COMPLETED",
            "capture_id": capture_id,
            "transaction_id": transaction.id,
            "message": "Payment captured and transaction updated."
        }

    except httpx.HTTPStatusError as e:
        db.rollback()

        print("PayPal HTTP Status:", e.response.status_code)
        print("PayPal Error Response:", e.response.text)

        raise HTTPException(
            status_code=502,
            detail="PayPal capture failed."
        )

    except httpx.RequestError:
        db.rollback()

        raise HTTPException(
            status_code=503,
            detail="Could not connect to PayPal."
        )

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()
        print("Capture/database error:", str(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to process payment capture."
        )




@app.get("/api/paypal/return")
def paypal_return(token: str, group_id: int):
    return RedirectResponse(
        url=(
            f"{settings.FRONTEND_URL}/group/{group_id}/scan"
            f"?payment=returned&order_id={token}"
        ),
        status_code=303
    )



@app.get("/api/paypal/cancel")
def paypal_cancel(group_id: int):
    return RedirectResponse(
        url=(
            f"{settings.FRONTEND_URL}/group/{group_id}/scan"
            f"?payment=cancelled"
        ),
        status_code=303
    )

