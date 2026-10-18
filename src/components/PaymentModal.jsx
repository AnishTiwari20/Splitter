import React, { useState, useEffect } from 'react';
import { X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { AVATAR_COLORS } from '../types';

export default function PaymentModal({
  isOpen,
  onClose,
  onSavePayment,
  friends,
  currency = '₹',
  initialFromId = null,
  initialToId = null,
  initialAmount = null,
}) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('Settlement payment');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setFromId(initialFromId || friends[0]?.id || '');
      setToId(initialToId || friends[1]?.id || '');
      setAmount(initialAmount ? String(initialAmount) : '');
      setDate(new Date().toISOString().slice(0, 10));
      setNotes('Settlement payment');
    }
  }, [isOpen, initialFromId, initialToId, initialAmount, friends]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseFloat(amount) || 0;
    if (num <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (fromId === toId) {
      setError('Payer and Receiver cannot be the same person.');
      return;
    }

    const fromFriend = friends.find(f => f.id === fromId);
    const toFriend = friends.find(f => f.id === toId);

    onSavePayment({
      id: 'settle-' + Date.now(),
      description: `${fromFriend?.name || 'Friend'} paid ${toFriend?.name || 'Friend'}`,
      amount: num,
      category: 'other',
      date: new Date(date).toISOString(),
      fromId,
      toId,
      isSettlement: true,
      notes: notes.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div>
            <h2 className="text-xl font-bold text-white">Record Settle Payment</h2>
            <p className="text-xs text-slate-400">Direct payment between two friends</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* From -> To selection */}
          <div className="flex items-center space-x-3">
            {/* Payer (From) */}
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Paid By
              </label>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-5 text-slate-500">
              <ArrowRight className="w-5 h-5" />
            </div>

            {/* Receiver (To) */}
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Received By
              </label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Settlement Amount ({currency})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-lg">
                {currency}
              </span>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl pl-10 pr-3 py-3 text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Notes / Method
            </label>
            <input
              type="text"
              value={notes}
              placeholder="e.g. UPI, GPay, Cash"
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center space-x-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Record Settlement</span>
          </button>
        </form>

      </div>
    </div>
  );
}
