from app.services.ai_service import parse_expense_with_ai

members = [
    {"id": 1, "name": "Alison"},
    {"id": 2, "name": "Bob"},
    {"id": 3, "name": "Charlie"}
]

user_input = (
    "I paid 120 dollars for dinner. "
    "Split equally between Alison, Bob and Charlie, "
    "but Bob should pay 20 dollars extra."
)

result = parse_expense_with_ai(
    user_input=user_input,
    group_members=members
)

print(result.model_dump(mode="json"))
