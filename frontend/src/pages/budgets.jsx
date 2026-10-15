import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/layout";
import useStore from "@/store";
import { toMonthKey } from "@/store/slices/budgets";
import { formatCurrency, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";

const STATUS_STYLES = {
  ok: { bar: "bg-green-500", text: "text-green-600 dark:text-green-400", label: "On track" },
  warning: { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", label: "Close to limit" },
  over: { bar: "bg-red-500", text: "text-red-600 dark:text-red-400", label: "Over budget" },
};

const shiftMonth = (monthKey, delta) => {
  const [year, month] = monthKey.split("-").map(Number);
  return toMonthKey(new Date(year, month - 1 + delta, 1));
};

const monthLabel = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};

function ProgressBar({ percent, status }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", STATUS_STYLES[status].bar)}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

export default function BudgetsPage() {
  const categories = useStore((state) => state.categories);
  const fetchCategories = useStore((state) => state.fetchCategories);
  const budgetStatus = useStore((state) => state.budgetStatus);
  const fetchBudgetStatus = useStore((state) => state.fetchBudgetStatus);
  const addBudget = useStore((state) => state.addBudget);
  const updateBudget = useStore((state) => state.updateBudget);
  const deleteBudget = useStore((state) => state.deleteBudget);
  const settings = useStore((state) => state.settings);
  const fxRates = useStore((state) => state.fxRates);
  const baseCurrency = settings?.currency || "USD";
  const displayCurrency = settings?.display_currency || baseCurrency;

  const money = useCallback(
    (value) =>
      formatCurrency(value, displayCurrency, { rates: fxRates, baseCurrency }),
    [displayCurrency, fxRates, baseCurrency],
  );

  const [month, setMonth] = useState(toMonthKey());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // dialog state: editing === null means "add new budget"
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ categoryId: "", amount: "" });

  const load = useCallback(
    async (targetMonth) => {
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all([fetchBudgetStatus(targetMonth), fetchCategories()]);
      } catch (err) {
        setError(err?.response?.data?.detail || err?.message || "Failed to load budgets.");
      } finally {
        setIsLoading(false);
      }
    },
    [fetchBudgetStatus, fetchCategories],
  );

  useEffect(() => {
    load(month);
  }, [load, month]);

  const items = useMemo(() => budgetStatus?.items ?? [], [budgetStatus]);

  // Expense categories that don't have a budget yet
  const availableCategories = useMemo(() => {
    const budgeted = new Set(items.map((i) => i.category_id));
    return categories.filter((c) => c.type === "expense" && !budgeted.has(c.id));
  }, [categories, items]);

  const totals = useMemo(() => {
    const limit = budgetStatus?.total_limit ?? 0;
    const spent = budgetStatus?.total_spent ?? 0;
    const percent = limit ? (spent / limit) * 100 : 0;
    const status = percent > 100 ? "over" : percent >= 80 ? "warning" : "ok";
    return { limit, spent, remaining: limit - spent, percent, status };
  }, [budgetStatus]);

  const openAdd = () => {
    setEditing(null);
    setForm({ categoryId: "", amount: "" });
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ categoryId: String(item.category_id), amount: String(item.limit) });
    setOpen(true);
  };

  const handleSave = async () => {
    const amount = Number(form.amount);
    try {
      if (editing) {
        await updateBudget(editing.budget_id, amount);
        toast.success("Budget updated.");
      } else {
        await addBudget({ category_id: Number(form.categoryId), amount });
        toast.success("Budget created.");
      }
      setOpen(false);
      await fetchBudgetStatus(month);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save budget.");
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Remove the budget for "${item.category_name}"?`)) return;
    try {
      await deleteBudget(item.budget_id);
      toast.success("Budget removed.");
      await fetchBudgetStatus(month);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to remove budget.");
    }
  };

  const isCurrentMonth = month === toMonthKey();
  const canSave =
    Number(form.amount) > 0 && (editing || Boolean(form.categoryId));

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Budgets"
          subtitle="Set monthly limits per category and see how you're tracking"
          actions={
            <Button className="gap-2" onClick={openAdd}>
              <Plus size={18} /> Add Budget
            </Button>
          }
        />

        {/* Month switcher */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous month"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}>
            <ChevronLeft size={18} />
          </Button>
          <div className="min-w-40 text-center font-medium">{monthLabel(month)}</div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next month"
            disabled={isCurrentMonth}
            onClick={() => setMonth((m) => shiftMonth(m, 1))}>
            <ChevronRight size={18} />
          </Button>
          {!isCurrentMonth && (
            <Button variant="ghost" size="sm" onClick={() => setMonth(toMonthKey())}>
              This month
            </Button>
          )}
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <LoadingState message="Loading budgets..." />
        ) : items.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={Wallet}
                title="No budgets yet"
                description="Create a monthly limit for an expense category, like Food or Shopping."
                actionLabel="Add Budget"
                action={openAdd}
              />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Total for {monthLabel(month)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div className="text-2xl font-semibold">
                    {money(totals.spent)}{" "}
                    <span className="text-base font-normal text-muted-foreground">
                      of {money(totals.limit)}
                    </span>
                  </div>
                  <div className={cn("text-sm font-medium", STATUS_STYLES[totals.status].text)}>
                    {totals.remaining >= 0
                      ? `${money(totals.remaining)} left`
                      : `${money(-totals.remaining)} over`}
                  </div>
                </div>
                <ProgressBar percent={totals.percent} status={totals.status} />
              </CardContent>
            </Card>

            {/* One card per budget */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const style = STATUS_STYLES[item.status];
                return (
                  <Card key={item.budget_id}>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{item.category_name}</CardTitle>
                        <div className={cn("text-xs font-medium", style.text)}>
                          {style.label} · {item.percent_used}%
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          aria-label={`Edit ${item.category_name} budget`}
                          onClick={() => openEdit(item)}>
                          <Pencil size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          aria-label={`Delete ${item.category_name} budget`}
                          onClick={() => handleDelete(item)}>
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ProgressBar percent={item.percent_used} status={item.status} />
                      <div className="flex justify-between text-sm">
                        <span>
                          {money(item.spent)}{" "}
                          <span className="text-muted-foreground">of {money(item.limit)}</span>
                        </span>
                        <span className={item.remaining < 0 ? style.text : "text-muted-foreground"}>
                          {item.remaining >= 0
                            ? `${money(item.remaining)} left`
                            : `${money(-item.remaining)} over`}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editing ? `Edit ${editing.category_name} budget` : "Add Budget"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {!editing && (
                <div className="space-y-2">
                  <Label>Category</Label>
                  {availableCategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Every expense category already has a budget. Create a new
                      expense category first.
                    </p>
                  ) : (
                    <Select
                      value={form.categoryId}
                      onValueChange={(val) => setForm({ ...form, categoryId: val })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose an expense category" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCategories.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="budget-amount">Monthly limit ({baseCurrency})</Label>
                <Input
                  id="budget-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 5000"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!canSave}>
                {editing ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
