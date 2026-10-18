import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, FileText, AlertCircle, Sparkles, CheckSquare, Square } from 'lucide-react';
import { CATEGORIES, SPLIT_TYPES, AVATAR_COLORS } from '../types';
import { round } from '../utils/debtSimplifier';

export default function ExpenseModal({
  isOpen,
  onClose,
  onSaveExpense,
  friends,
  currency = '₹',
  initialExpense = null,
}) {
  const isEditing = Boolean(initialExpense);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [payerId, setPayerId] = useState('');
  const [splitType, setSplitType] = useState(SPLIT_TYPES.EQUAL);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  // Equal Split Selected Friend IDs (Array of string IDs)
  const [selectedFriends, setSelectedFriends] = useState([]);

  // Exact Split mapping: { [friendId]: string_amount }
  const [exactAmounts, setExactAmounts] = useState({});

  // Shares mapping: { [friendId]: number_shares }
  const [shares, setShares] = useState({});

  // Percentages mapping: { [friendId]: string_percent }
  const [percentages, setPercentages] = useState({});

  // Error message
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (initialExpense) {
        setDescription(initialExpense.description || '');
        setAmount(String(initialExpense.amount || ''));
        setCategory(initialExpense.category || 'food');
        setPayerId(initialExpense.payerId || (friends[0]?.id || ''));
        setSplitType(initialExpense.splitType || SPLIT_TYPES.EQUAL);
        setDate(initialExpense.date ? initialExpense.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
        setNotes(initialExpense.notes || '');

        // Populate split data
        const splitMap = initialExpense.splits || {};
        const participants = Object.keys(splitMap);
        setSelectedFriends(participants.length > 0 ? participants : friends.map(f => f.id));

        const exactObj = {};
        const sharesObj = {};
        const pctObj = {};

        friends.forEach(f => {
          exactObj[f.id] = splitMap[f.id] ? String(splitMap[f.id]) : '';
          sharesObj[f.id] = 1;
          pctObj[f.id] = '';
        });

        setExactAmounts(exactObj);
        setShares(sharesObj);
        setPercentages(pctObj);
      } else {
        // Reset for new expense
        setDescription('');
        setAmount('');
        setCategory('food');
        setPayerId(friends[0]?.id || '');
        setSplitType(SPLIT_TYPES.EQUAL);
        setDate(new Date().toISOString().slice(0, 10));
        setNotes('');
        setSelectedFriends(friends.map(f => f.id)); // default all selected

        const exactObj = {};
        const sharesObj = {};
        const pctObj = {};
        friends.forEach(f => {
          exactObj[f.id] = '';
          sharesObj[f.id] = 1;
          pctObj[f.id] = '';
        });
        setExactAmounts(exactObj);
        setShares(sharesObj);
        setPercentages(pctObj);
      }
    }
  }, [isOpen, initialExpense, friends]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;

  // Toggle friend selection for Equal Split
  const toggleSelectFriend = (fId) => {
    setSelectedFriends(prev => {
      if (prev.includes(fId)) {
        return prev.filter(id => id !== fId);
      } else {
        return [...prev, fId];
      }
    });
  };

  const selectAllFriends = () => setSelectedFriends(friends.map(f => f.id));
  const deselectAllFriends = () => setSelectedFriends([]);

  // Calculate per person equal share
  const equalPerPerson = selectedFriends.length > 0 ? round(numAmount / selectedFriends.length) : 0;

  // Calculate Exact Amounts Sum
  const exactSum = round(
    Object.values(exactAmounts).reduce((acc, val) => acc + (parseFloat(val) || 0), 0)
  );
  const exactDiff = round(numAmount - exactSum);

  // Calculate Shares Sum
  const totalShares = Object.values(shares).reduce((acc, val) => acc + (parseInt(val) || 0), 0);

  // Calculate Percentages Sum
  const percentSum = round(
    Object.values(percentages).reduce((acc, val) => acc + (parseFloat(val) || 0), 0)
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a description / reason for payment.');
      return;
    }
    if (!payerId) {
      setError('Please select who paid.');
      return;
    }

    const splits = {};

    if (splitType === SPLIT_TYPES.EQUAL) {
      if (selectedFriends.length === 0) {
        setError('At least one friend must be selected to split this payment.');
        return;
      }
      const baseShare = Math.floor((numAmount / selectedFriends.length) * 100) / 100;
      let remainder = round(numAmount - baseShare * selectedFriends.length);

      selectedFriends.forEach((fId, idx) => {
        // Distribute 1 cent remainder to first few participants so sum is exact
        const add = remainder > 0 ? 0.01 : 0;
        if (remainder > 0) remainder = round(remainder - 0.01);
        splits[fId] = round(baseShare + add);
      });
    } else if (splitType === SPLIT_TYPES.EXACT) {
      if (Math.abs(exactDiff) > 0.01) {
        setError(`Exact splits total (${currency}${exactSum}) must equal the expense amount (${currency}${numAmount}). Difference: ${currency}${exactDiff}`);
        return;
      }
      Object.entries(exactAmounts).forEach(([fId, val]) => {
        const amt = parseFloat(val) || 0;
        if (amt > 0) splits[fId] = round(amt);
      });
    } else if (splitType === SPLIT_TYPES.SHARES) {
      if (totalShares <= 0) {
        setError('Total shares must be greater than 0.');
        return;
      }
      Object.entries(shares).forEach(([fId, count]) => {
        const sh = parseInt(count) || 0;
        if (sh > 0) {
          splits[fId] = round((numAmount * sh) / totalShares);
        }
      });
    } else if (splitType === SPLIT_TYPES.PERCENT) {
      if (Math.abs(percentSum - 100) > 0.1) {
        setError(`Percentages must add up to 100% (currently ${percentSum}%).`);
        return;
      }
      Object.entries(percentages).forEach(([fId, val]) => {
        const pct = parseFloat(val) || 0;
        if (pct > 0) {
          splits[fId] = round((numAmount * pct) / 100);
        }
      });
    }

    onSaveExpense({
      id: initialExpense ? initialExpense.id : 'exp-' + Date.now(),
      description: description.trim(),
      amount: numAmount,
      category,
      date: new Date(date).toISOString(),
      payerId,
      splitType,
      splits,
      notes: notes.trim(),
      isSettlement: false,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <span>{isEditing ? 'Edit Expense' : 'Add New Expense'}</span>
            </h2>
            <p className="text-xs text-slate-400">
              Record payment and customize who participated
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3 flex items-start space-x-3 text-rose-400 text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount & Description Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Amount */}
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Amount ({currency})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400 font-bold text-lg">
                  {currency}
                </span>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl pl-10 pr-3 py-3 text-white text-xl font-bold placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            {/* Description / Reason */}
            <div className="sm:col-span-7">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Reason / Description
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Dinner, Cab fare, Groceries"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition"
              />
            </div>
          </div>

          {/* Category Chips */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                    category === cat.id
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Paid By Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Paid By
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {friends.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPayerId(f.id)}
                  className={`p-2.5 rounded-2xl border flex items-center space-x-2.5 transition text-left ${
                    payerId === f.id
                      ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/50'
                      : 'bg-slate-800/50 border-slate-700/80 hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl ${f.color || AVATAR_COLORS[0]} flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0`}
                  >
                    {(f.name || '?')[0].toUpperCase()}
                  </div>
                  <span className={`text-xs font-medium truncate ${payerId === f.id ? 'text-white' : 'text-slate-300'}`}>
                    {f.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Split Mode Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Split Among Friends
              </label>
              <div className="flex bg-slate-800/80 p-0.5 rounded-xl border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setSplitType(SPLIT_TYPES.EQUAL)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    splitType === SPLIT_TYPES.EQUAL
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Equal
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType(SPLIT_TYPES.EXACT)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    splitType === SPLIT_TYPES.EXACT
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Exact ({currency})
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType(SPLIT_TYPES.SHARES)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    splitType === SPLIT_TYPES.SHARES
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Shares
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType(SPLIT_TYPES.PERCENT)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    splitType === SPLIT_TYPES.PERCENT
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  %
                </button>
              </div>
            </div>

            {/* EQUAL SPLIT WITH SELECTIVE FRIENDS (The exact user scenario!) */}
            {splitType === SPLIT_TYPES.EQUAL && (
              <div className="bg-slate-800/40 rounded-2xl border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <div className="text-slate-300">
                    <span className="font-semibold text-white">
                      {selectedFriends.length} of {friends.length}
                    </span>{' '}
                    participated
                    {numAmount > 0 && selectedFriends.length > 0 && (
                      <span className="text-emerald-400 font-bold ml-2">
                        ({currency}{equalPerPerson} each)
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={selectAllFriends}
                      className="text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      All
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={deselectAllFriends}
                      className="text-slate-400 hover:text-slate-300 font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {friends.map((f) => {
                    const isSelected = selectedFriends.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleSelectFriend(f.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition text-left ${
                          isSelected
                            ? 'bg-indigo-600/10 border-indigo-500/40 text-white'
                            : 'bg-slate-800/30 border-slate-800 text-slate-500 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-lg ${f.color || AVATAR_COLORS[0]} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ${
                              !isSelected && 'opacity-40'
                            }`}
                          >
                            {(f.name || '?')[0].toUpperCase()}
                          </div>
                          <span className={`text-xs font-medium truncate ${isSelected ? 'text-white' : 'text-slate-500 line-through'}`}>
                            {f.name}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          {isSelected ? (
                            <span className="text-[11px] text-emerald-400 font-semibold">
                              {currency}{equalPerPerson}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              Did not eat / join
                            </span>
                          )}
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {friends.length > selectedFriends.length && selectedFriends.length > 0 && (
                  <p className="text-[11px] text-amber-400/90 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                    💡 <strong>Selective Split Active:</strong> {friends.length - selectedFriends.length} friend(s) excluded from this bill.
                  </p>
                )}
              </div>
            )}

            {/* EXACT SPLIT */}
            {splitType === SPLIT_TYPES.EXACT && (
              <div className="bg-slate-800/40 rounded-2xl border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Specify exact amount for each friend</span>
                  <span
                    className={`font-semibold ${
                      Math.abs(exactDiff) < 0.01 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    Remaining: {currency}{exactDiff}
                  </span>
                </div>

                <div className="space-y-2">
                  {friends.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between bg-slate-800/30 p-2 rounded-xl border border-slate-800/80"
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-6 h-6 rounded-lg ${f.color || AVATAR_COLORS[0]} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0`}
                        >
                          {(f.name || '?')[0].toUpperCase()}
                        </div>
                        <span className="text-xs text-white font-medium">{f.name}</span>
                      </div>
                      <div className="relative w-32">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                          {currency}
                        </span>
                        <input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={exactAmounts[f.id] || ''}
                          onChange={(e) =>
                            setExactAmounts(prev => ({ ...prev, [f.id]: e.target.value }))
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-2 py-1 text-right text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SHARES SPLIT */}
            {splitType === SPLIT_TYPES.SHARES && (
              <div className="bg-slate-800/40 rounded-2xl border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Ratio / Weight (e.g. 1 share, 2 shares)</span>
                  <span className="text-indigo-400 font-semibold">Total Shares: {totalShares}</span>
                </div>

                <div className="space-y-2">
                  {friends.map((f) => {
                    const sh = parseInt(shares[f.id]) || 0;
                    const calculated = totalShares > 0 ? round((numAmount * sh) / totalShares) : 0;
                    return (
                      <div
                        key={f.id}
                        className="flex items-center justify-between bg-slate-800/30 p-2 rounded-xl border border-slate-800/80"
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-6 h-6 rounded-lg ${f.color || AVATAR_COLORS[0]} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0`}
                          >
                            {(f.name || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-xs text-white font-medium">{f.name}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-xs text-emerald-400 font-semibold">
                            {currency}{calculated}
                          </span>
                          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={shares[f.id] || 0}
                              onChange={(e) =>
                                setShares(prev => ({
                                  ...prev,
                                  [f.id]: parseInt(e.target.value) || 0,
                                }))
                              }
                              className="w-10 bg-transparent text-center text-white text-xs font-bold focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-500">share(s)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PERCENTAGE SPLIT */}
            {splitType === SPLIT_TYPES.PERCENT && (
              <div className="bg-slate-800/40 rounded-2xl border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Enter percentage for each person</span>
                  <span
                    className={`font-semibold ${
                      Math.abs(percentSum - 100) < 0.1 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    Total: {percentSum}% / 100%
                  </span>
                </div>

                <div className="space-y-2">
                  {friends.map((f) => {
                    const p = parseFloat(percentages[f.id]) || 0;
                    const calculated = round((numAmount * p) / 100);
                    return (
                      <div
                        key={f.id}
                        className="flex items-center justify-between bg-slate-800/30 p-2 rounded-xl border border-slate-800/80"
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-6 h-6 rounded-lg ${f.color || AVATAR_COLORS[0]} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0`}
                          >
                            {(f.name || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-xs text-white font-medium">{f.name}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-xs text-emerald-400 font-semibold">
                            {currency}{calculated}
                          </span>
                          <div className="relative w-24">
                            <input
                              type="number"
                              step="any"
                              placeholder="0"
                              value={percentages[f.id] || ''}
                              onChange={(e) =>
                                setPercentages(prev => ({
                                  ...prev,
                                  [f.id]: e.target.value,
                                }))
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg pr-6 pl-2 py-1 text-right text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Date & Optional Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Date</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5" />
                <span>Notes (Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Aman ate elsewhere"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-500/25 transition flex items-center justify-center space-x-2"
            >
              <Check className="w-5 h-5" />
              <span>{isEditing ? 'Save Changes' : 'Record Expense'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
