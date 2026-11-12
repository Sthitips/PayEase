
"""add invite_code to groups

Revision ID: 27bd953fe5bf
Revises: a3862ae39a8a
"""
from typing import Sequence, Union
import secrets
import string

from alembic import op
import sqlalchemy as sa


revision: str = '27bd953fe5bf'
down_revision: Union[str, Sequence[str], None] = 'a3862ae39a8a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add nullable column to preserve existing groups.
    op.add_column(
        'groups',
        sa.Column('invite_code', sa.String(length=8), nullable=True)
    )

    # 2. Generate unique codes for all existing groups.
    connection = op.get_bind()

    group_ids = connection.execute(
        sa.text("SELECT id FROM groups")
    ).scalars().all()

    alphabet = string.ascii_uppercase + string.digits
    used_codes = set()

    for group_id in group_ids:
        while True:
            code = ''.join(
                secrets.choice(alphabet) for _ in range(8)
            )
            if code not in used_codes:
                used_codes.add(code)
                break

        connection.execute(
            sa.text(
                "UPDATE groups SET invite_code = :code WHERE id = :group_id"
            ),
            {"code": code, "group_id": group_id}
        )

    # 3. Enforce the model's constraints.
    op.alter_column(
        'groups',
        'invite_code',
        existing_type=sa.String(length=8),
        nullable=False
    )

    op.create_index(
        op.f('ix_groups_invite_code'),
        'groups',
        ['invite_code'],
        unique=True
    )


def downgrade() -> None:
    op.drop_index(
        op.f('ix_groups_invite_code'),
        table_name='groups'
    )
    op.drop_column('groups', 'invite_code')
