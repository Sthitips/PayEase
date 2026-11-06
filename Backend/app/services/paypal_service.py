import httpx
from app.core.config import settings

async def get_paypal_access_token():

    # Authenticate with PayPal and obtain an OAuth access token.

    url = f"{settings.PAYPAL_BASE_URL}/v1/oauth2/token"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            auth=(
                settings.PAYPAL_CLIENT_ID,
                settings.PAYPAL_CLIENT_SECRET
            ),
            data={
                "grant_type": "client_credentials"
            },
            headers={
                "Accept": "application/json",
                "Accept-Language": "en_US"
            },
            timeout=20.0
        )

        response.raise_for_status()

        token_data = response.json()

        return token_data["access_token"]


async def create_paypal_order():

    # Create a PayPal order for a test purchase.

    access_token = await get_paypal_access_token()

    url = f"{settings.PAYPAL_BASE_URL}/v2/checkout/orders"

    payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "description": "PayEase test purchase",
                "amount": {
                    "currency_code": "USD",
                    "value": "10.00"
                }
            }
        ],
        "application_context": {
            "return_url": "http://localhost:8000/api/paypal/return",
            "cancel_url": "http://localhost:8000/api/paypal/cancel"
        }
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            json=payload,
            headers=headers,
            timeout=20.0
        )

        response.raise_for_status()

        order_data = response.json()

        approval_url = next(
            (
                link["href"]
                for link in order_data["links"]
                if link["rel"] == "approve"
            ),
            None
        )

        return {
            "order_id": order_data["id"],
            "status": order_data["status"],
            "approval_url": approval_url
        }


async def capture_paypal_order(order_id: str):

    # Capture an approved PayPal order.

    access_token = await get_paypal_access_token()

    url = (
        f"{settings.PAYPAL_BASE_URL}"
        f"/v2/checkout/orders/{order_id}/capture"
    )

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers=headers,
            json={},
            timeout=20.0
        )

        response.raise_for_status()

        return response.json()


