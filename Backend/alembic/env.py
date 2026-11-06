
from logging.config import fileConfig

from alembic import context

from app.database.connection import Base, engine

# Import all models so SQLAlchemy registers their tables
from app.models import (
    User,
    Group,
    GroupMember,
    Expense,
    ExpenseSplit,
    Settlement,
    PaymentTransaction,
    SettlementPayment
)

# Alembic configuration
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Tell Alembic which SQLAlchemy metadata to compare
target_metadata = Base.metadata

# Use the database URL from our existing SQLAlchemy engine
database_url = engine.url.render_as_string(hide_password=False)
config.set_main_option(
    "sqlalchemy.url",
    database_url.replace("%", "%%")
)


def run_migrations_offline() -> None:
    """Run migrations without creating a database connection."""

    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations using a live database connection."""

    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
