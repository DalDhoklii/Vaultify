import api from "../../api/axios";

const createSettingsSlice = (set, get) => ({
  settings: null,
  fxRates: null,
  fxBase: null,
  fxUpdatedAt: null,

  fetchSettings: async () => {
    const res = await api.get("/settings/");
    set({ settings: res.data });
    return res.data;
  },

  updateSettings: async (updates) => {
    const res = await api.put("/settings/", updates);
    set({ settings: res.data });
    return res.data;
  },

  fetchFxRates: async (baseCurrency, symbols = []) => {
    const base = baseCurrency?.toUpperCase();
    if (!base) return null;

    const { fxBase, fxUpdatedAt } = get();
    if (fxBase === base && fxUpdatedAt) {
      const lastUpdated = new Date(fxUpdatedAt).getTime();
      if (Number.isFinite(lastUpdated)) {
        const minutesSince = (Date.now() - lastUpdated) / 60000;
        if (minutesSince < 30) {
          return { base: fxBase, rates: get().fxRates };
        }
      }
    }

    // Free, key-less endpoint (exchangerate.host now requires a paid key)
    const res = await fetch(
      `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`,
    );

    if (!res.ok) {
      throw new Error("Failed to fetch exchange rates.");
    }

    const data = await res.json();
    if (data.result !== "success" || !data.rates) {
      throw new Error("Exchange rate service returned an error.");
    }

    const rates = symbols.length
      ? Object.fromEntries(
          symbols
            .map((code) => code.toUpperCase())
            .filter((code) => code in data.rates)
            .map((code) => [code, data.rates[code]]),
        )
      : data.rates;

    set({
      fxRates: rates,
      fxBase: base,
      fxUpdatedAt: new Date().toISOString(),
    });
    return { base, rates };
  },
});

export default createSettingsSlice;
