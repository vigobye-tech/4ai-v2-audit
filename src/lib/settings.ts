type Settings = {
  autoChain: boolean;
  darkMode: boolean;
  strictInjection: boolean;
};

const DEFAULT: Settings = {
  autoChain: true,
  darkMode: false,
  strictInjection: true,
};

export const settings = {
  load(): Settings {
    try {
      const raw = localStorage.getItem('4ai-settings');
      return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
    } catch {
      return DEFAULT;
    }
  },

  save(partial: Partial<Settings>): void {
    const updated = { ...this.load(), ...partial };
    localStorage.setItem('4ai-settings', JSON.stringify(updated));
  },

  toggle(key: keyof Settings): void {
    const curr = this.load();
    this.save({ [key]: !curr[key] });
  },
};
