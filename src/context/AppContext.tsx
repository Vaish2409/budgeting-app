import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getDb } from "../db/client";
import { getSettings, updateSettings as updateSettingsRepo } from "../db/repositories/settingsRepo";
import { listCategories } from "../db/repositories/categoriesRepo";
import { Settings, Category } from "../types/models";

interface AppContextValue {
  isReady: boolean;
  settings: Settings;
  categories: Category[];
  refreshCategories: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
}

const DEFAULT_SETTINGS: Settings = {
  baseCurrency: "BHD",
  connectedInboxEmail: null,
  bankSenderAllowlist: [],
  lastPolledAt: null,
  onboardingComplete: false,
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<Category[]>([]);

  const refreshCategories = useCallback(async () => {
    setCategories(await listCategories());
  }, []);

  useEffect(() => {
    (async () => {
      await getDb(); // opens, migrates, and seeds
      const [loadedSettings, loadedCategories] = await Promise.all([getSettings(), listCategories()]);
      setSettings(loadedSettings);
      setCategories(loadedCategories);
      setIsReady(true);
    })();
  }, []);

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    await updateSettingsRepo(updates);
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <AppContext.Provider value={{ isReady, settings, categories, refreshCategories, updateSettings }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an AppProvider");
  return ctx;
}
