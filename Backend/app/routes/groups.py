
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import secrets
import string
from app.database.connection import get_db
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.user import User
from app.schemas.group import GroupCreate, GroupResponse
from app.core.dependencies import get_current_user
from app.schemas.group import GroupMemberResponse
from app.schemas.group import GroupMemberAdd, GroupUpdate
from app.services.balance_service import calculate_group_balances
from app.services.debt_simplification_service import simplify_debts
from app.services.settlement_service import create_settlement_plan
from app.schemas.group import JoinGroupRequest


router = APIRouter(
    prefix="/api/groups",
    tags=["Groups"]
)

def generate_invite_code(db: Session) -> str:
    characters = string.ascii_uppercase + string.digits

    while True:
        code = "".join(secrets.choice(characters) for _ in range(8))

        existing_group = db.query(Group).filter(
            Group.invite_code == code
        ).first()

        if not existing_group:
            return code

@router.post(
    "/",
    response_model=GroupResponse,
    status_code=status.HTTP_201_CREATED
)
def create_group(
    group_data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_group = Group(
    name=group_data.name,
    description=group_data.description,
    currency=group_data.currency.upper(),
    created_by=current_user.id,
    invite_code=generate_invite_code(db)
)

    try:
        # Add the group first
        db.add(new_group)
        db.flush()

        # Automatically add the creator as a group member
        creator_membership = GroupMember(
            group_id=new_group.id,
            user_id=current_user.id,
            role="admin"
        )

        db.add(creator_membership)

        # Save both records together
        db.commit()
        db.refresh(new_group)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create group"
        )

    return new_group


@router.get(
    "/",
    response_model=list[GroupResponse]
)
def get_my_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    groups = (
        db.query(Group)
        .join(
            GroupMember,
            Group.id == GroupMember.group_id
        )
        .filter(
            GroupMember.user_id == current_user.id
        )
        .order_by(Group.created_at.desc())
        .all()
    )

    return groups

@router.post(
    "/join",
    response_model=GroupResponse,
    status_code=status.HTTP_200_OK
)
def join_group(
    join_data: JoinGroupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Normalize the invite code
    invite_code = join_data.invite_code.strip().upper()

    # 2. Find the group using its invite code
    group = db.query(Group).filter(
        Group.invite_code == invite_code
    ).first()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invite code. No group found."
        )

    # 3. Check whether the user is already a member
    existing_membership = db.query(GroupMember).filter(
        GroupMember.group_id == group.id,
        GroupMember.user_id == current_user.id
    ).first()

    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already a member of this group."
        )

    # 4. Add the current user to the group
    membership = GroupMember(
        group_id=group.id,
        user_id=current_user.id,
        role="member"
    )

    try:
        db.add(membership)
        db.commit()
        db.refresh(group)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already a member of this group."
        )

    return group

@router.get(
    "/{group_id}",
    response_model=GroupResponse
)
def get_group_details(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    group = (
        db.query(Group)
        .join(
            GroupMember,
            Group.id == GroupMember.group_id
        )
        .filter(
            Group.id == group_id,
            GroupMember.user_id == current_user.id
        )
        .first()
    )

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    return group


@router.get(
    "/{group_id}/members",
    response_model=list[GroupMemberResponse]
)
def get_group_members(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify that the current user belongs to this group
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    # Retrieve all members and their user information
    members = (
        db.query(GroupMember, User)
        .join(User, GroupMember.user_id == User.id)
        .filter(GroupMember.group_id == group_id)
        .order_by(GroupMember.joined_at.asc())
        .all()
    )

    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "profile_picture": user.profile_picture,
            "role": group_member.role,
            "joined_at": group_member.joined_at
        }
        for group_member, user in members
    ]


@router.post(
    "/{group_id}/members",
    response_model=GroupMemberResponse,
    status_code=status.HTTP_201_CREATED
)
def add_group_member(
    group_id: int,
    member_data: GroupMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify that the group exists
    group = db.query(Group).filter(
        Group.id == group_id
    ).first()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    # 2. Verify that the current user is an admin
    admin_membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.role == "admin"
    ).first()

    if not admin_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins can add members"
        )

    # 3. Find the user using their email
    new_member = db.query(User).filter(
        User.email == str(member_data.email).lower()
    ).first()

    if not new_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No PayEase account found with this email"
        )

    # 4. Check whether the user is already a member
    existing_membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == new_member.id
    ).first()

    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this group"
        )

    # 5. Create the membership
    membership = GroupMember(
        group_id=group_id,
        user_id=new_member.id,
        role="member"
    )

    try:
        db.add(membership)
        db.commit()
        db.refresh(membership)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this group"
        )

    # 6. Return member information
    return {
        "id": new_member.id,
        "name": new_member.name,
        "email": new_member.email,
        "profile_picture": new_member.profile_picture,
        "role": membership.role,
        "joined_at": membership.joined_at
    }


@router.delete(
    "/{group_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def remove_group_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify that the group exists
    group = db.query(Group).filter(
        Group.id == group_id
    ).first()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    # Verify that the current user is an admin
    admin_membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.role == "admin"
    ).first()

    if not admin_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins can remove members"
        )

    # Prevent an admin from removing themselves
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use the leave-group workflow to leave this group"
        )

    # Find the target membership
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group member not found"
        )

    # Prevent removal of the last remaining admin
    if membership.role == "admin":
        admin_count = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.role == "admin"
        ).count()

        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A group must have at least one admin"
            )

    db.delete(membership)
    db.commit()

    return None


@router.patch(
    "/{group_id}",
    response_model=GroupResponse
)
def update_group(
    group_id: int,
    group_data: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find the group
    group = db.query(Group).filter(
        Group.id == group_id
    ).first()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    # Verify admin permissions
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.role == "admin"
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins can update group details"
        )

    # Get only the fields explicitly provided
    update_data = group_data.model_dump(exclude_unset=True)

    # Prevent explicitly setting required fields to null
    if any(value is None for value in update_data.values()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Group fields cannot be set to null"
        )

    # Update the provided fields
    for field, value in update_data.items():
        if field == "currency":
            value = value.upper()

        setattr(group, field, value)

    db.commit()
    db.refresh(group)

    return group

@router.delete("/{group_id}/leave")
def leave_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check whether the group exists
    group = db.query(Group).filter(
        Group.id == group_id
    ).first()

    if not group:
        raise HTTPException(
            status_code=404,
            detail="Group not found"
        )

    # Check whether the current user is a member
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=404,
            detail="You are not a member of this group"
        )

    # If the user is an admin, check whether another admin exists
    if membership.role == "admin":
        other_admins = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.role == "admin",
            GroupMember.user_id != current_user.id
        ).count()

        if other_admins == 0:
            raise HTTPException(
                status_code=400,
                detail="You are the last admin. Promote another member before leaving."
            )

    # Remove the user's membership
    db.delete(membership)
    db.commit()

    return {
        "message": "You have successfully left the group"
    }


@router.get("/{group_id}/balances")
def get_group_balances(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify that the requesting user belongs to the group
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this group"
        )

    try:
        return calculate_group_balances(db, group_id)

    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )


@router.get("/{group_id}/settlements/suggestions")
def get_settlement_suggestions(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Verify group membership
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this group"
        )

    try:
        # 2. Calculate current net balances
        balances = calculate_group_balances(
            db=db,
            group_id=group_id
        )

        # 3. Generate minimum-transaction suggestions
        suggestions = simplify_debts(balances)

        # 4. Return suggestions without saving settlements
        return {
            "group_id": group_id,
            "total_transactions": len(suggestions),
            "settlements": suggestions
        }

    except ValueError as error:
        message = str(error)

        if message == "Group not found":
            raise HTTPException(status_code=404, detail=message)

        raise HTTPException(status_code=400, detail=message)


@router.post("/{group_id}/settlements/confirm", status_code=201)
def confirm_settlement_plan(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return create_settlement_plan(
            db=db,
            group_id=group_id,
            current_user_id=current_user.id
        )

    except ValueError as error:
        message = str(error)

        if message == "Group not found":
            raise HTTPException(status_code=404, detail=message)

        if message == "You are not a member of this group":
            raise HTTPException(status_code=403, detail=message)

        raise HTTPException(status_code=409, detail=message)
