
"""add group_id to payment_transactions"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Replace with the actual revision ID from your generated filename.
revision: str = "5d7be23f74af"
down_revision: Union[str, Sequence[str], None] = "27bd953fe5bf"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)

    # 1. Add group_id only if it does not already exist.
    columns = [
        col["name"]
        for col in inspector.get_columns("payment_transactions")
    ]

    if "group_id" not in columns:
        op.add_column(
            "payment_transactions",
            sa.Column("group_id", sa.Integer(), nullable=True)
        )

    # 2. Backfill group_id from the linked expense.
    connection.execute(
        sa.text("""
            UPDATE payment_transactions AS pt
            SET group_id = e.group_id
            FROM expenses AS e
            WHERE pt.expense_id = e.id
              AND pt.group_id IS NULL
        """)
    )

    # 3. Ensure all existing records have a group.
    unassigned = connection.execute(
        sa.text("""
            SELECT COUNT(*)
            FROM payment_transactions
            WHERE group_id IS NULL
        """)
    ).scalar_one()

    if unassigned:
        raise RuntimeError(
            f"{unassigned} payment transactions have no group_id. "
            "Resolve these records before migration."
        )

    # 4. Add foreign key only if it does not already exist.
    inspector = sa.inspect(connection)

    foreign_keys = inspector.get_foreign_keys(
        "payment_transactions"
    )

    has_group_fk = any(
        fk["constrained_columns"] == ["group_id"]
        and fk["referred_table"] == "groups"
        for fk in foreign_keys
    )

    if not has_group_fk:
        op.create_foreign_key(
            "fk_payment_transactions_group_id_groups",
            "payment_transactions",
            "groups",
            ["group_id"],
            ["id"],
            ondelete="RESTRICT"
        )

    # 5. Enforce NOT NULL if not already enforced.
    columns = inspector.get_columns("payment_transactions")

    group_column = next(
        col for col in columns
        if col["name"] == "group_id"
    )

    if group_column["nullable"]:
        op.alter_column(
            "payment_transactions",
            "group_id",
            existing_type=sa.Integer(),
            nullable=False
        )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())

    foreign_keys = inspector.get_foreign_keys(
        "payment_transactions"
    )

    for fk in foreign_keys:
        if (
            fk["constrained_columns"] == ["group_id"]
            and fk["referred_table"] == "groups"
        ):
            op.drop_constraint(
                fk["name"],
                "payment_transactions",
                type_="foreignkey"
            )

    columns = [
        col["name"]
        for col in inspector.get_columns("payment_transactions")
    ]

    if "group_id" in columns:
        op.drop_column(
            "payment_transactions",
            "group_id"
        )
