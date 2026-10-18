import React, { useState } from 'react';
import { 
  BarChart3, 
  Share2, 
  Check, 
  Copy, 
  DollarSign, 
  TrendingUp, 
  PieChart,
  Users
} from 'lucide-react';
import { CATEGORIES, AVATAR_COLORS } from '../types';
import { round } from '../utils/debtSimplifier';

export default function AnalyticsView({
  friends,
  expenses,
  balances,
  settlements,
  stats,
  currency = '₹',
  groupName = 'Friends Group',
}) {
  const [copied, setCopied] = useState(false);

  const friendMap = {};
  friends.forEach(f => { friendMap[f.id] = f; });

  const totalSpent = stats.totalSpent || 0;
  const avgPerPerson = friends.length > 0 ? round(totalSpent / friends.length) : 0;

  // Generate WhatsApp-friendly summary text
  const generateSummaryText = () => {
    let text = `📊 *Split Summary: ${groupName}*\n`;
    text += `💰 *Total Group Spent:* ${currency}${totalSpent}\n`;
    text += `🧾 *Total Expenses:* ${stats.expenseCount}\n\n`;

    text += `👥 *Individual Net Balances:*\n`;
    friends.forEach(f => {
      const net = balances[f.id] || 0;
      if (net > 0.01) {
        text += `• ${f.name}: *+${currency}${net}* (gets back)\n`;
      } else if (net < -0.01) {
        text += `• ${f.name}: *-${currency}${Math.abs(net)}* (owes)\n`;
      } else {
        text += `• ${f.name}: Settled (${currency}0)\n`;
      }
    });

    text += `\n💸 *Recommended Settle Payments:*\n`;
    if (settlements.length === 0) {
      text += `🎉 All settled up! No payments pending.\n`;
    } else {
      settlements.forEach((s, idx) => {
        text += `${idx + 1}. *${s.fromName}* ➔ *${s.toName}*: ${currency}${s.amount}\n`;
      });
    }

    text += `\n_Generated with Splitter App_`;
    return text;
  };

  const handleCopySummary = async () => {
    try {
      const text = generateSummaryText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      alert('Failed to copy. Please copy manually.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Total Spent */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Total Spent
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            {currency}{totalSpent}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Across {stats.expenseCount} payments
          </span>
        </div>

        {/* Average per person */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Avg / Person
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-indigo-400 mt-1">
            {currency}{avgPerPerson}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            For {friends.length} friends
          </span>
        </div>

        {/* Pending Settlements */}
        <div className="col-span-2 sm:col-span-1 bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Pending Settlements
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-1">
            {settlements.length}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {settlements.length === 0 ? 'Fully squared away' : 'Payments remaining'}
          </span>
        </div>
      </div>

      {/* Share / Copy Summary Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-500/30 rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center space-x-2">
            <Share2 className="w-4 h-4 text-indigo-400" />
            <span>Share Trip Summary with Friends</span>
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Copies a formatted split summary message ready to paste into your WhatsApp group.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopySummary}
          className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition flex items-center justify-center space-x-2 flex-shrink-0"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Copied to Clipboard!' : 'Copy for WhatsApp'}</span>
        </button>
      </div>

      {/* Category Breakdown */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-3xl p-5 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
          <PieChart className="w-3.5 h-3.5 text-indigo-400" />
          <span>Spending by Category</span>
        </h4>

        <div className="space-y-3">
          {CATEGORIES.map((cat) => {
            const amount = stats.categoryTotals[cat.id] || 0;
            if (amount === 0) return null;
            const pct = totalSpent > 0 ? round((amount / totalSpent) * 100, 1) : 0;

            return (
              <div key={cat.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span>{cat.icon}</span>
                    <span className="text-slate-300 font-medium">{cat.label}</span>
                  </div>
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="text-slate-400">{pct}%</span>
                    <span className="text-white font-bold">{currency}{amount}</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
          {Object.keys(stats.categoryTotals).length === 0 && (
            <p className="text-xs text-slate-500 italic">No spending categories yet.</p>
          )}
        </div>
      </div>

      {/* Spending per Person vs Paid */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-3xl p-5 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>Paid vs Consumed by Friend</span>
        </h4>

        <div className="space-y-3">
          {friends.map((f) => {
            const paid = stats.paidByPerson[f.id] || 0;
            const spent = stats.spentByPerson[f.id] || 0;

            return (
              <div
                key={f.id}
                className="bg-slate-800/50 rounded-2xl p-3 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl ${f.color || AVATAR_COLORS[0]} flex items-center justify-center text-white text-xs font-bold shadow`}
                  >
                    {(f.name || '?')[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-white">{f.name}</span>
                </div>

                <div className="flex items-center space-x-6 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Paid out</span>
                    <span className="text-emerald-400 font-bold font-mono">
                      {currency}{paid}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Consumed</span>
                    <span className="text-rose-400 font-bold font-mono">
                      {currency}{spent}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
