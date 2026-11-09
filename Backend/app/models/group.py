from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base

class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    created_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )

    currency = Column(String(3), default="USD", nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    creator = relationship("User", back_populates="created_groups")

    members = relationship(
        "GroupMember",
        back_populates="group",
        cascade="all, delete-orphan"
    )

    expenses = relationship(
        "Expense",
        back_populates="group"
    )

    settlements = relationship(
        "Settlement",
        back_populates="group"
    )
