from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.deps_auth import get_current_user
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction, TransactionType
from app.schemas.budget import (
    BudgetCreate,
    BudgetOut,
    BudgetStatusItem,
    BudgetStatusOut,
    BudgetUpdate,
)

router = APIRouter(prefix="/budgets", tags=["budgets"])

WARNING_THRESHOLD = 80  # percent


def _get_budget(db: Session, budget_id: int, user_id: int) -> Budget:
    budget = (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.user_id == user_id)
        .first()
    )
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    return budget


def _month_range(month: str | None) -> tuple[str, datetime, datetime]:
    """'2026-10' -> ('2026-10', 2026-10-01, 2026-11-01). Defaults to this month."""
    if month:
        try:
            start = datetime.strptime(month, "%Y-%m")
        except ValueError:
            raise HTTPException(status_code=422, detail="month must be YYYY-MM")
    else:
        now = datetime.now(timezone.utc)
        start = datetime(now.year, now.month, 1)
    end = (
        datetime(start.year + 1, 1, 1)
        if start.month == 12
        else datetime(start.year, start.month + 1, 1)
    )
    return start.strftime("%Y-%m"), start, end


@router.get("/", response_model=list[BudgetOut])
def list_budgets(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(Budget).filter(Budget.user_id == current_user.id).all()


@router.post("/", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
def create_budget(
    budget_in: BudgetCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    category = (
        db.query(Category)
        .filter(
            Category.id == budget_in.category_id,
            Category.user_id == current_user.id,
        )
        .first()
    )
    if not category:
        raise HTTPException(status_code=400, detail="Invalid category for this user.")
    if category.type != TransactionType.EXPENSE:
        raise HTTPException(
            status_code=400, detail="Budgets can only be set on expense categories."
        )

    existing = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.category_id == budget_in.category_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"'{category.name}' already has a budget. Edit it instead.",
        )

    budget = Budget(
        user_id=current_user.id,
        category_id=budget_in.category_id,
        amount=budget_in.amount,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.put("/{budget_id}", response_model=BudgetOut)
def update_budget(
    budget_id: int,
    budget_in: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    budget = _get_budget(db, budget_id, current_user.id)
    budget.amount = budget_in.amount
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    budget = _get_budget(db, budget_id, current_user.id)
    db.delete(budget)
    db.commit()
    return None


@router.get("/status", response_model=BudgetStatusOut)
def budget_status(
    month: str | None = Query(default=None, description="YYYY-MM, default: current"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """How much of each budget has been spent in the given month."""
    month_label, start, end = _month_range(month)

    # Expense totals per category for this month, computed in the database
    spent_by_category = dict(
        db.query(
            Transaction.category_id, func.coalesce(func.sum(Transaction.amount), 0)
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == TransactionType.EXPENSE,
            Transaction.date >= start,
            Transaction.date < end,
        )
        .group_by(Transaction.category_id)
        .all()
    )

    rows = (
        db.query(Budget, Category)
        .join(Category, Category.id == Budget.category_id)
        .filter(Budget.user_id == current_user.id)
        .order_by(Category.name)
        .all()
    )

    items = []
    for budget, category in rows:
        limit = float(budget.amount)
        spent = float(spent_by_category.get(category.id, 0) or 0)
        percent = round(spent / limit * 100, 1) if limit else 0.0
        if percent > 100:
            state = "over"
        elif percent >= WARNING_THRESHOLD:
            state = "warning"
        else:
            state = "ok"
        items.append(
            BudgetStatusItem(
                budget_id=budget.id,
                category_id=category.id,
                category_name=category.name,
                color=category.color,
                limit=limit,
                spent=spent,
                remaining=round(limit - spent, 2),
                percent_used=percent,
                status=state,
            )
        )

    return BudgetStatusOut(
        month=month_label,
        total_limit=round(sum(i.limit for i in items), 2),
        total_spent=round(sum(i.spent for i in items), 2),
        items=items,
    )
