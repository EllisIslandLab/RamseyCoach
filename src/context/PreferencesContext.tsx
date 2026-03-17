import { createContext, useContext, useEffect, useState } from 'react';

interface Preferences {
  wholeDollars: boolean;
}

interface PreferencesContextValue extends Preferences {
  setWholeDollars: (v: boolean) => void;
}

const STORAGE_KEY = 'mw_preferences';

const defaults: Preferences = {
  wholeDollars: true,
};

const PreferencesContext = createContext<PreferencesContextValue>({
  ...defaults,
  setWholeDollars: () => {},
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(defaults);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setPrefs({ ...defaults, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const update = (patch: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return (
    <PreferencesContext.Provider value={{
      ...prefs,
      setWholeDollars: (v) => update({ wholeDollars: v }),
    }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export const usePreferences = () => useContext(PreferencesContext);
