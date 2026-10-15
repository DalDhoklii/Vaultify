import { useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import useStore from "@/store";

// Loads the user's settings + exchange rates once for every protected page,
// so currency preferences apply everywhere (not only after visiting Settings).
function useUserPreferences() {
  const settings = useStore((state) => state.settings);
  const fetchSettings = useStore((state) => state.fetchSettings);
  const fetchFxRates = useStore((state) => state.fetchFxRates);

  useEffect(() => {
    if (!settings) {
      fetchSettings().catch(() => {});
    }
  }, [settings, fetchSettings]);

  const base = settings?.currency;
  const display = settings?.display_currency;
  useEffect(() => {
    if (base && display && base !== display) {
      fetchFxRates(base).catch(() => {});
    }
  }, [base, display, fetchFxRates]);
}

export default function Layout({ children }) {
  useUserPreferences();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-6 md:p-8 pt-0 bg-background/50">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
