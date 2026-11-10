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
from app.schemas.ai_expense import AIExpenseRequest
from app.services.ai_service import parse_expense_with_ai
from app.services.expense_validation_service import (
    validate_ai_expense_draft
)
from app.services.expense_allocation_service import (
    calculate_expense_shares
)
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


@router.post("/ai-draft")
def create_ai_expense_draft(
    group_id: int,
    request: AIExpenseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify that the group exists.
    group = db.query(Group).filter(
        Group.id == group_id
    ).first()

    if not group:
        raise HTTPException(
            status_code=404,
            detail="Group not found"
        )

    # 2. Verify that the current user belongs to the group.
    current_membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not current_membership:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this group"
        )

    # 3. Fetch the actual group members.
    members = (
        db.query(User)
        .join(GroupMember, GroupMember.user_id == User.id)
        .filter(GroupMember.group_id == group_id)
        .all()
    )

    group_members = [
        {"id": member.id, "name": member.name}
        for member in members
    ]

    
    try:
        # 4. Ask Gemini to interpret the expense.
        gemini_draft = parse_expense_with_ai(
            user_input=request.description,
            group_members=group_members,
            current_user_name=current_user.name
        )

        # 5. Handle clarification before attempting allocation.
        if gemini_draft.clarification_needed:
            return {
                "clarification_needed": True,
                "clarification_question": (
                    gemini_draft.clarification_question
                )
            }

        # 6. Calculate exact participant shares using Python.
        calculated_draft = calculate_expense_shares(
            gemini_draft
        )

        # 7. Validate the calculated draft and map names to IDs.
        validated_draft = validate_ai_expense_draft(
            db=db,
            group_id=group_id,
            ai_draft=calculated_draft
        )

        if validated_draft["clarification_needed"]:
            return validated_draft

        # 8. Return the preview without saving the expense.
        return {
            **validated_draft,
            "payer_user_id": current_user.id,
            "currency": group.currency,
            "split_type": gemini_draft.split_type,
            "items": [
                item.model_dump()
                for item in (gemini_draft.items or [])
            ],
            "adjustment": (
                gemini_draft.adjustment.model_dump()
                if gemini_draft.adjustment
                else None
            ),
            "requires_confirmation": True
        }

    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail=str(e)
        )

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Unable to generate expense draft"
        )


    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail=str(e)
        )

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Unable to generate expense draft"
        )


@router.post(
    "/ai-confirm",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED
)
def confirm_ai_expense(
    group_id: int,
    expense_data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Ensure this endpoint always records an AI-assisted expense.
        expense_data = expense_data.model_copy(
            update={"input_source": "ai"}
        )

        # Reuse the existing expense creation service.
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


