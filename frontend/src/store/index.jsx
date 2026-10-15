import { create } from "zustand";
import { devtools } from "zustand/middleware";

import createAuthSlice from "./slices/auth";
import createSettingsSlice from "./slices/settings";
import createCategoriesSlice from "./slices/categories";
import createTransactionsSlice from "./slices/transactions";
import createBudgetsSlice from "./slices/budgets";

const useStore = create(
  devtools(
    (set, get) => ({
      ...createAuthSlice(set, get),
      ...createSettingsSlice(set, get),
      ...createCategoriesSlice(set, get),
      ...createTransactionsSlice(set, get),
      ...createBudgetsSlice(set, get),
    }),
    { name: "Store" }
  )
);

export default useStore;
