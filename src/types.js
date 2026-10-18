export const CATEGORIES = [
  { id: 'food', label: 'Food & Dining', icon: '🍕', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { id: 'travel', label: 'Travel & Cab', icon: '🚗', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { id: 'stay', label: 'Stay & Hotel', icon: '🏠', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { id: 'drinks', label: 'Drinks & Snacks', icon: '🍹', color: 'bg-pink-500/10 text-pink-500 border-pink-500/20' },
  { id: 'entertainment', label: 'Tickets & Fun', icon: '🎟️', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  { id: 'groceries', label: 'Groceries', icon: '🛒', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  { id: 'other', label: 'Other', icon: '📦', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
];

export const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-purple-500',
  'bg-fuchsia-500',
  'bg-teal-500',
  'bg-blue-600',
  'bg-orange-500'
];

export const CURRENCIES = [
  { symbol: '₹', code: 'INR', name: 'Indian Rupee (₹)' },
  { symbol: '$', code: 'USD', name: 'US Dollar ($)' },
  { symbol: '€', code: 'EUR', name: 'Euro (€)' },
  { symbol: '£', code: 'GBP', name: 'British Pound (£)' },
  { symbol: 'AED', code: 'AED', name: 'UAE Dirham (AED)' },
  { symbol: '৳', code: 'BDT', name: 'Bangladeshi Taka (৳)' },
];

export const SPLIT_TYPES = {
  EQUAL: 'EQUAL',
  EXACT: 'EXACT',
  SHARES: 'SHARES',
  PERCENT: 'PERCENT',
};
