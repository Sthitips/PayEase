
from decimal import Decimal


def simplify_debts(balances: list[dict]):
    members = []
    amounts = []

    # Convert money to integer cents
    for member in balances:
        amount = Decimal(str(member["net_balance"]))

        if amount * 100 != (amount * 100).to_integral_value():
            raise ValueError("Balances must have at most two decimal places")

        cents = int(amount * 100)

        if cents != 0:
            members.append({
                "user_id": member["user_id"],
                "name": member["name"]
            })
            amounts.append(cents)

    if sum(amounts) != 0:
        raise ValueError("Group balances must add up to zero")

    if not amounts:
        return []

    best_transactions = None
    current_transactions = []

    def backtrack(start):
        nonlocal best_transactions

        while start < len(amounts) and amounts[start] == 0:
            start += 1

        if start == len(amounts):
            if (
                best_transactions is None
                or len(current_transactions) < len(best_transactions)
            ):
                best_transactions = current_transactions.copy()
            return

        if (
            best_transactions is not None
            and len(current_transactions) >= len(best_transactions)
        ):
            return

        seen = set()

        for j in range(start + 1, len(amounts)):
            old_start = amounts[start]
            old_j = amounts[j]

            if old_start * old_j >= 0:
                continue

            if old_j in seen:
                continue

            seen.add(old_j)

            transfer = min(abs(old_start), abs(old_j))

            if old_start < 0:
                from_index, to_index = start, j
                amounts[start] += transfer
                amounts[j] -= transfer
            else:
                from_index, to_index = j, start
                amounts[start] -= transfer
                amounts[j] += transfer

            current_transactions.append({
                "from_user_id": members[from_index]["user_id"],
                "from_name": members[from_index]["name"],
                "to_user_id": members[to_index]["user_id"],
                "to_name": members[to_index]["name"],
                "amount": Decimal(transfer) / Decimal("100")
            })

            # Continue with the same member if their balance isn't zero
            if amounts[start] == 0:
                next_start = start + 1
            else:
                next_start = start

            backtrack(next_start)

            # Restore the exact previous state
            current_transactions.pop()
            amounts[start] = old_start
            amounts[j] = old_j

            # No need to try equivalent exact-match branches
            if old_start + old_j == 0:
                break

    backtrack(0)

    return best_transactions or []
