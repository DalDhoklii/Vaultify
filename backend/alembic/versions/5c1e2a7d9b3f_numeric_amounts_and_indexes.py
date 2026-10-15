"""store amounts as numeric and add indexes

Revision ID: 5c1e2a7d9b3f
Revises: 1d4c9f7a2e11
Create Date: 2026-10-15 12:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "5c1e2a7d9b3f"
down_revision = "1d4c9f7a2e11"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Money must be exact: Float -> Numeric(12, 2) (up to 9,999,999,999.99)
    op.alter_column(
        "transactions",
        "amount",
        existing_type=sa.Float(),
        type_=sa.Numeric(12, 2),
        existing_nullable=False,
        postgresql_using="ROUND(amount::numeric, 2)",
    )

    # Every page filters by user and date, so index those columns
    op.create_index("ix_transactions_user_id", "transactions", ["user_id"])
    op.create_index("ix_transactions_user_date", "transactions", ["user_id", "date"])
    op.create_index("ix_transactions_category_id", "transactions", ["category_id"])
    op.create_index("ix_categories_user_id", "categories", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_categories_user_id", table_name="categories")
    op.drop_index("ix_transactions_category_id", table_name="transactions")
    op.drop_index("ix_transactions_user_date", table_name="transactions")
    op.drop_index("ix_transactions_user_id", table_name="transactions")
    op.alter_column(
        "transactions",
        "amount",
        existing_type=sa.Numeric(12, 2),
        type_=sa.Float(),
        existing_nullable=False,
    )
