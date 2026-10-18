import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  Archive, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  HelpCircle,
  AlertTriangle,
  Receipt,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AVATAR_COLORS } from '../types';
import { round } from '../utils/debtSimplifier';

export default function BalanceView({
  friends,
  expenses,
  balances,
  settlements,
  archivedBatches = [],
  currency = '₹',
  onRecordPayment,
  onClearTableCheckpoint,
  onRestoreCheckpoint,
}) {
  const [showArchived, setShowArchived] = useState(false);
  const [expandedBatchId, setExpandedBatchId] = useState(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const friendMap = {};
  friends.forEach(f => { friendMap[f.id] = f; });

  const isAllSettled = settlements.length === 0;

  const handleClearTable = () => {
    // Fire confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    onClearTableCheckpoint();
    setShowConfirmClear(false);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Status Banner */}
      <div className={`p-5 rounded-3xl border transition shadow-lg ${
        isAllSettled
          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
          : 'bg-slate-800/60 border-slate-700/80 text-slate-300'
      }`}>
        <div className="flex items-center space-x-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ${
            isAllSettled
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
          }`}>
            {isAllSettled ? '🎉' : '⚖️'}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {isAllSettled ? 'All Settled Up!' : `${settlements.length} Pending Settlement(s)`}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAllSettled
                ? 'Everyone is squared away. No one owes any money.'
                : 'Minimal cash transactions needed to square everyone up:'}
            </p>
          </div>
        </div>
      </div>

      {/* Recommended Settle Transactions ("Who Owes Whom") */}
      {!isAllSettled && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Recommended Settle Payments</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              Min-cash-flow simplified
            </span>
          </div>

          <div className="space-y-2.5">
            {settlements.map((tx, idx) => {
              const fromFriend = friendMap[tx.from];
              const toFriend = friendMap[tx.to];

              return (
                <div
                  key={idx}
                  className="bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-4 flex items-center justify-between shadow-sm transition"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Debtor */}
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-8 h-8 rounded-xl ${fromFriend?.color || AVATAR_COLORS[0]} flex items-center justify-center text-white text-xs font-bold shadow`}
                      >
                        {(fromFriend?.name || '?')[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-white truncate max-w-[80px] sm:max-w-[120px]">
                        {fromFriend?.name}
                      </span>
                    </div>

                    <div className="flex flex-col items-center px-1 text-slate-500">
                      <span className="text-[10px] text-rose-400 font-medium">pays</span>
                      <ArrowRight className="w-4 h-4 text-indigo-400" />
                    </div>

                    {/* Creditor */}
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-8 h-8 rounded-xl ${toFriend?.color || AVATAR_COLORS[1]} flex items-center justify-center text-white text-xs font-bold shadow`}
                      >
                        {(toFriend?.name || '?')[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-white truncate max-w-[80px] sm:max-w-[120px]">
                        {toFriend?.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <span className="text-base font-bold text-emerald-400">
                      {currency}{tx.amount}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRecordPayment(tx.from, tx.to, tx.amount)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition flex items-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Paid</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Net Balances per Friend */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Individual Balances
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {friends.map((f) => {
            const net = balances[f.id] || 0;
            const isCreditor = net > 0.01;
            const isDebtor = net < -0.01;

            return (
              <div
                key={f.id}
                className="bg-slate-800/40 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-xl ${f.color || AVATAR_COLORS[0]} flex items-center justify-center text-white text-xs font-bold shadow`}
                  >
                    {(f.name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">{f.name}</h4>
                    <p className="text-[11px] text-slate-400">
                      {isCreditor && 'gets back'}
                      {isDebtor && 'owes'}
                      {!isCreditor && !isDebtor && 'settled'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-base font-bold ${
                      isCreditor
                        ? 'text-emerald-400'
                        : isDebtor
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {isCreditor && '+'}
                    {currency}{Math.abs(net)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CLEAR TABLE / MARK ALL SETTLED (Checkpoint) */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              Clear Table / Mark All as Settled
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Finished a trip or split cycle? This archives all current expenses into history and resets balances back to {currency}0.00 so you know that till here, everything is done!
            </p>
          </div>
        </div>

        {showConfirmClear ? (
          <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-4 space-y-3 animate-in fade-in">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Are you sure you want to clear the table now?</span>
            </div>
            <p className="text-xs text-slate-400">
              All active expenses ({expenses.length}) will be saved to your "Settled History" archive.
            </p>
            <div className="flex items-center space-x-3 pt-1">
              <button
                type="button"
                onClick={handleClearTable}
                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow transition"
              >
                Yes, Clear & Archive
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                className="py-2 px-3 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={expenses.length === 0}
            onClick={() => setShowConfirmClear(true)}
            className={`w-full py-3 px-4 rounded-2xl font-semibold text-xs transition flex items-center justify-center space-x-2 ${
              expenses.length === 0
                ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed border border-slate-800'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Clear Table & Mark Split Done ({expenses.length} expenses)</span>
          </button>
        )}
      </div>

      {/* SETTLED HISTORY & ARCHIVED CHECKPOINTS */}
      {archivedBatches.length > 0 && (
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition"
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Past Settled History ({archivedBatches.length} Checkpoints)</span>
            </div>
            {showArchived ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showArchived && (
            <div className="space-y-3 animate-in fade-in">
              {archivedBatches.map((batch) => {
                const isExpanded = expandedBatchId === batch.id;
                return (
                  <div
                    key={batch.id}
                    className="bg-slate-800/40 border border-slate-800 rounded-2xl overflow-hidden"
                  >
                    <div
                      onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-sm font-semibold text-white">
                            {batch.name || 'Settled Checkpoint'}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {new Date(batch.timestamp).toLocaleString()} • {batch.expenses?.length || 0} expenses cleared
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-bold text-slate-300">
                          {currency}{round(batch.totalAmount || 0)}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 border-t border-slate-800 bg-slate-900/60 space-y-3">
                        <div className="space-y-1.5">
                          {batch.expenses?.map((e) => (
                            <div
                              key={e.id}
                              className="flex items-center justify-between text-xs py-1 border-b border-slate-800/50"
                            >
                              <span className="text-slate-300">{e.description}</span>
                              <span className="text-slate-400 font-mono">
                                {currency}{e.amount}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => onRestoreCheckpoint(batch.id)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Undo / Restore these to active table</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
