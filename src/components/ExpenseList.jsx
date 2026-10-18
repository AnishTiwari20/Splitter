import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Plus, 
  Receipt, 
  ChevronRight, 
  Users, 
  ArrowRightLeft,
  Calendar
} from 'lucide-react';
import { CATEGORIES, AVATAR_COLORS } from '../types';
import { round } from '../utils/debtSimplifier';

export default function ExpenseList({
  expenses,
  friends,
  currency = '₹',
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
}) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const friendMap = {};
  friends.forEach(f => { friendMap[f.id] = f; });

  const filtered = expenses.filter(exp => {
    // Category match
    if (selectedCategory !== 'ALL' && exp.category !== selectedCategory) {
      return false;
    }
    // Search match
    if (search.trim()) {
      const q = search.toLowerCase();
      const descMatch = (exp.description || '').toLowerCase().includes(q);
      const payerName = friendMap[exp.payerId]?.name?.toLowerCase() || '';
      const notesMatch = (exp.notes || '').toLowerCase().includes(q);
      return descMatch || payerName.includes(q) || notesMatch;
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-12">
      
      {/* Search and Filters */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search payments, reasons, or friends..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition border ${
              selectedCategory === 'ALL'
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({expenses.length})
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition border flex items-center space-x-1 ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 px-4 bg-slate-800/30 border border-dashed border-slate-800 rounded-3xl space-y-3">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Receipt className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">No expenses recorded yet</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Add a bill or payment. You can choose who paid and selectively pick which friends participated!
          </p>
          <button
            type="button"
            onClick={onAddExpense}
            className="mt-2 inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Expense</span>
          </button>
        </div>
      ) : (
        /* Expenses List */
        <div className="space-y-3">
          {filtered.map((exp) => {
            // Direct Settlement Card
            if (exp.isSettlement) {
              const fromFriend = friendMap[exp.fromId];
              const toFriend = friendMap[exp.toId];
              return (
                <div
                  key={exp.id}
                  className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                      <ArrowRightLeft className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-emerald-300">
                          Settlement Payment
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(exp.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 truncate mt-0.5">
                        <strong>{fromFriend?.name || 'Someone'}</strong> paid{' '}
                        <strong>{toFriend?.name || 'Someone'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <span className="text-sm font-bold text-emerald-400">
                      {currency}{exp.amount}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteExpense(exp.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                      title="Delete payment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            }

            // Regular Expense Card
            const payer = friendMap[exp.payerId];
            const cat = CATEGORIES.find(c => c.id === exp.category) || CATEGORIES[CATEGORIES.length - 1];
            const splitKeys = exp.splits ? Object.keys(exp.splits) : [];
            const participantCount = splitKeys.length;
            const isSelective = participantCount < friends.length && participantCount > 0;

            return (
              <div
                key={exp.id}
                className="bg-slate-800/60 border border-slate-700/70 hover:border-slate-600 rounded-2xl p-4 transition shadow-sm space-y-3"
              >
                {/* Top Row: Icon, Title, Date, Amount */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl ${cat.color} border flex items-center justify-center text-xl flex-shrink-0`}>
                      {cat.icon}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">
                        {exp.description}
                      </h4>
                      <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-slate-400">
                        <span>Paid by <strong className="text-slate-200">{payer?.name || 'Unknown'}</strong></span>
                        <span>•</span>
                        <span>{new Date(exp.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-base font-extrabold text-white">
                      {currency}{round(exp.amount)}
                    </div>
                    <span className="text-[10px] text-indigo-400 uppercase tracking-wider font-semibold">
                      {exp.splitType}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Who Ate / Participated (The Selective Split user requested) */}
                <div className="bg-slate-900/60 rounded-xl p-2.5 flex items-center justify-between text-xs border border-slate-800/80">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <div className="truncate text-slate-300">
                      {isSelective ? (
                        <>
                          <span className="text-amber-400 font-semibold">
                            {participantCount} of {friends.length} shared:
                          </span>{' '}
                          {splitKeys.map(id => friendMap[id]?.name).filter(Boolean).join(', ')}
                        </>
                      ) : (
                        <span>Split among all ({friends.length} friends)</span>
                      )}
                    </div>
                  </div>

                  {/* Actions: Edit / Delete */}
                  <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => onEditExpense(exp)}
                      className="p-1 text-slate-400 hover:text-indigo-300 rounded hover:bg-slate-800 transition"
                      title="Edit expense"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteExpense(exp.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                      title="Delete expense"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Notes if any */}
                {exp.notes && (
                  <p className="text-[11px] text-slate-400 italic bg-slate-900/30 px-2 py-1 rounded-lg">
                    "{exp.notes}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
