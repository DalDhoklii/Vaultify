from pydantic import BaseModel, ConfigDict, Field


class BudgetCreate(BaseModel):
    category_id: int
    amount: float = Field(gt=0, lt=10_000_000_000)


class BudgetUpdate(BaseModel):
    amount: float = Field(gt=0, lt=10_000_000_000)


class BudgetOut(BaseModel):
    id: int
    category_id: int
    amount: float

    model_config = ConfigDict(from_attributes=True)


class BudgetStatusItem(BaseModel):
    budget_id: int
    category_id: int
    category_name: str
    color: str | None = None
    limit: float
    spent: float
    remaining: float
    percent_used: float
    status: str  # "ok" (<80%), "warning" (80-100%), "over" (>100%)


class BudgetStatusOut(BaseModel):
    month: str  # "YYYY-MM"
    total_limit: float
    total_spent: float
    items: list[BudgetStatusItem]
