import api from "../../api/axios";

// "YYYY-MM" for a Date in the user's local time
export const toMonthKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const createBudgetsSlice = (set) => ({
  budgets: [],
  budgetStatus: null,

  fetchBudgets: async () => {
    const res = await api.get("/budgets/");
    set({ budgets: res.data });
    return res.data;
  },

  fetchBudgetStatus: async (month = toMonthKey()) => {
    const res = await api.get("/budgets/status", { params: { month } });
    set({ budgetStatus: res.data });
    return res.data;
  },

  addBudget: async (budget) => {
    const res = await api.post("/budgets/", budget);
    set((state) => ({ budgets: [...state.budgets, res.data] }));
    return res.data;
  },

  updateBudget: async (budgetId, amount) => {
    const res = await api.put(`/budgets/${budgetId}`, { amount });
    set((state) => ({
      budgets: state.budgets.map((b) => (b.id === budgetId ? res.data : b)),
    }));
    return res.data;
  },

  deleteBudget: async (budgetId) => {
    await api.delete(`/budgets/${budgetId}`);
    set((state) => ({
      budgets: state.budgets.filter((b) => b.id !== budgetId),
    }));
  },
});

export default createBudgetsSlice;
