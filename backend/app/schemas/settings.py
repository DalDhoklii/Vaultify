from pydantic import BaseModel, ConfigDict


class SettingsBase(BaseModel):
    currency: str | None = None
    display_currency: str | None = None
    theme: str | None = None
    email_notifications: bool | None = None
    budget_alerts: bool | None = None
    weekly_summary: bool | None = None


class SettingsUpdate(SettingsBase):
    pass


class SettingsOut(SettingsBase):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)
