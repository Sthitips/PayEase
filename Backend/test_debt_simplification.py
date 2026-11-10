
print("Starting debt simplification test...")

from decimal import Decimal
from app.services.debt_simplification_service import simplify_debts

balances = [
    {"user_id": 1, "name": "A", "net_balance": Decimal("100.00")},
    {"user_id": 2, "name": "B", "net_balance": Decimal("50.00")},
    {"user_id": 3, "name": "C", "net_balance": Decimal("-70.00")},
    {"user_id": 4, "name": "D", "net_balance": Decimal("-80.00")}
]

print("Input balances:", balances)

result = simplify_debts(balances)

print("\nSuggested settlements:")

for transaction in result:
    print(
        f'{transaction["from_name"]} pays '
        f'{transaction["to_name"]}: '
        f'₹{transaction["amount"]}'
    )

print("\nTotal transactions:", len(result))
print("Test completed.")
