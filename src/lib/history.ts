const STORAGE_KEY = '4ai-history';
const MAX_ITEMS = 50;

export interface HistoryItem {
  id: string;
  prompt: string;
  chain: string[];
  timestamp: string;
}

export const history = {
  add(prompt: string, chain: string[]): void {
    const items: HistoryItem[] = this.getAll();
    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      prompt: prompt.trim(),
      chain,
      timestamp: new Date().toISOString(),
    };
    items.unshift(newItem);
    if (items.length > MAX_ITEMS) items.pop();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  },

  getAll(): HistoryItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  search(query: string): HistoryItem[] {
    const q = query.toLowerCase();
    return this.getAll().filter((i) => i.prompt.toLowerCase().includes(q));
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};
