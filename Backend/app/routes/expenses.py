from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseResponse
from app.services.expense_service import create_expense
from sqlalchemy.orm import selectinload

from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.expense import Expense
from app.services.expense_service import create_expense, update_expense, delete_expense

router = APIRouter(
    prefix="/api/groups/{group_id}/expenses",
    tags=["Expenses"]
)


@router.post(
    "/",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED
)
def add_expense(
    group_id: int,
    expense_data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        expense = create_expense(
            db=db,
            group_id=group_id,
            paid_by_user_id=current_user.id,
            expense_data=expense_data
        )

        return expense

    except ValueError as error:
        message = str(error)

        if message == "Group not found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=message
            )

        if message == "You are not a member of this group":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=message
            )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )


@router.get("/", response_model=list[ExpenseResponse])
def get_group_expenses(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Check whether the group exists
    group = db.query(Group).filter(
        Group.id == group_id
    ).first()

    if not group:
        raise HTTPException(
            status_code=404,
            detail="Group not found"
        )

    # 2. Check whether the current user belongs to the group
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this group"
        )

    # 3. Retrieve expenses and their splits
    expenses = (
        db.query(Expense)
        .options(selectinload(Expense.splits))
        .filter(Expense.group_id == group_id)
        .order_by(Expense.created_at.desc())
        .all()
    )

    return expenses


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense_details(
    group_id: int,
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Verify that the group exists
    group = db.query(Group).filter(
        Group.id == group_id
    ).first()

    if not group:
        raise HTTPException(
            status_code=404,
            detail="Group not found"
        )

    # 2. Verify that the user belongs to the group
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this group"
        )

    # 3. Fetch the expense and its associated splits
    expense = (
        db.query(Expense)
        .options(selectinload(Expense.splits))
        .filter(
            Expense.id == expense_id,
            Expense.group_id == group_id
        )
        .first()
    )

    if not expense:
        raise HTTPException(
            status_code=404,
            detail="Expense not found in this group"
        )

    return expense


@router.put("/{expense_id}", response_model=ExpenseResponse)
def edit_expense(
    group_id: int,
    expense_id: int,
    expense_data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return update_expense(
            db=db,
            group_id=group_id,
            expense_id=expense_id,
            current_user_id=current_user.id,
            expense_data=expense_data
        )

    except ValueError as error:
        message = str(error)

        if message == "Expense not found":
            raise HTTPException(status_code=404, detail=message)

        if message == "You are not a member of this group":
            raise HTTPException(status_code=403, detail=message)

        raise HTTPException(status_code=400, detail=message)


@router.delete("/{expense_id}")
def remove_expense(
    group_id: int,
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return delete_expense(
            db=db,
            group_id=group_id,
            expense_id=expense_id,
            current_user_id=current_user.id
        )

    except ValueError as error:
        message = str(error)

        if message == "Expense not found":
            raise HTTPException(status_code=404, detail=message)

        if message == "You are not a member of this group":
            raise HTTPException(status_code=403, detail=message)

        raise HTTPException(status_code=400, detail=message)
