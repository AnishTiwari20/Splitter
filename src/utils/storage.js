import { AVATAR_COLORS } from '../types';

const STORAGE_KEY = 'splitter_app_data_v1';

export const DEFAULT_FRIENDS = [
  { id: 'f-1', name: 'You', color: AVATAR_COLORS[0] },
  { id: 'f-2', name: 'Rahul', color: AVATAR_COLORS[1] },
  { id: 'f-3', name: 'Priya', color: AVATAR_COLORS[2] },
  { id: 'f-4', name: 'Aman', color: AVATAR_COLORS[3] },
];

export const INITIAL_DATA = {
  activeGroupId: 'default-group',
  currency: '₹',
  groups: [
    {
      id: 'default-group',
      name: 'Friends Group',
      createdAt: new Date().toISOString(),
      friends: DEFAULT_FRIENDS,
      expenses: [
        {
          id: 'exp-demo-1',
          description: 'Food & Snacks at Cafe',
          amount: 100,
          category: 'food',
          date: new Date(Date.now() - 3600000 * 4).toISOString(),
          payerId: 'f-1', // You paid 100
          splitType: 'EQUAL',
          // 3 ate, 1 did not eat (Aman didn't eat)
          splits: {
            'f-1': 33.34,
            'f-2': 33.33,
            'f-3': 33.33,
          },
          notes: 'Only 3 ate, Aman arrived late',
          isSettlement: false,
        },
        {
          id: 'exp-demo-2',
          description: 'Cab to Mall',
          amount: 240,
          category: 'travel',
          date: new Date(Date.now() - 3600000 * 2).toISOString(),
          payerId: 'f-2', // Rahul paid 240
          splitType: 'EQUAL',
          // All 4 shared cab
          splits: {
            'f-1': 60,
            'f-2': 60,
            'f-3': 60,
            'f-4': 60,
          },
          notes: 'Uber XL',
          isSettlement: false,
        }
      ],
      archivedBatches: [], // For "Clear the table / Settled checkpoints"
    }
  ]
};

export function loadAppData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_DATA;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.groups) || data.groups.length === 0) {
      return INITIAL_DATA;
    }
    return data;
  } catch (e) {
    console.error('Failed to load storage data:', e);
    return INITIAL_DATA;
  }
}

export function saveAppData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data to storage:', e);
  }
}

export function exportBackupJSON(data) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `splitter-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
