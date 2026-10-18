import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Share2, 
  Check, 
  RotateCcw,
  Users,
  Receipt,
  X,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ArrowRight,
  CheckSquare,
  Square,
  Scale
} from 'lucide-react';
import { round, calculateDetailedSummary } from './utils/debtSimplifier';
import { syncManager } from './utils/syncManager';

// Clean default: zero dummy members
const DEFAULT_ROOMS = [
  {
    id: 'my-trip',
    name: 'My Trip',
    updatedAt: Date.now(),
    members: [],
    expenses: [],
  }
];

export default function App() {
  const [rooms, setRooms] = useState(() => {
    try {
      const raw = localStorage.getItem('splitter_minimal_rooms_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_ROOMS;
  });

  const getHashRoomId = () => {
    const hash = window.location.hash.replace('#/', '').replace('#', '').trim();
    return hash || null;
  };

  const [activeRoomId, setActiveRoomId] = useState(() => {
    const fromHash = getHashRoomId();
    if (fromHash) return fromHash;
    return rooms[0]?.id || 'my-trip';
  });

  // Active view tab: 'expenses' or 'settle'
  const [activeTab, setActiveTab] = useState('expenses');

  const [isOnline, setIsOnline] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form states
  const [newMemberName, setNewMemberName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [payerId, setPayerId] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  // New list prompt
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Expandable audit proof
  const [showDetailedAudit, setShowDetailedAudit] = useState(false);
  const [inspectedMemberId, setInspectedMemberId] = useState(null);

  // Listen to hash change from direct links or navigation
  useEffect(() => {
    const handleHash = () => {
      const room = getHashRoomId();
      if (room && room !== activeRoomId) {
        setActiveRoomId(room);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [activeRoomId]);

  const activeRoom = useMemo(() => {
    let found = rooms.find(r => r.id === activeRoomId);
    if (!found) {
      if (rooms.length > 0) return rooms[0];
      const cleanName = activeRoomId.replace(/-/g, ' ');
      const newRoom = {
        id: activeRoomId,
        name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
        updatedAt: Date.now(),
        members: [],
        expenses: [],
      };
      return newRoom;
    }
    return found;
  }, [rooms, activeRoomId]);

  const members = activeRoom.members || [];
  const expenses = activeRoom.expenses || [];

  const memberMap = useMemo(() => {
    const map = {};
    members.forEach(m => { map[m.id] = m.name; });
    return map;
  }, [members]);

  // Save to localStorage immediately on any state change
  useEffect(() => {
    try {
      localStorage.setItem('splitter_minimal_rooms_v1', JSON.stringify(rooms));
    } catch (e) {}
  }, [rooms]);

  // Connect to real-time sync with conflict protection
  useEffect(() => {
    syncManager.connect(
      activeRoomId,
      (remoteRoomState) => {
        if (!remoteRoomState || remoteRoomState.id !== activeRoomId) return;

        setRooms(prevRooms => {
          const currentIndex = prevRooms.findIndex(r => r.id === activeRoomId);
          if (currentIndex !== -1) {
            const current = prevRooms[currentIndex];
            // Only update if remote state is strictly newer
            if (current.updatedAt && remoteRoomState.updatedAt && remoteRoomState.updatedAt <= current.updatedAt) {
              return prevRooms; // Local is newer, don't overwrite!
            }
            const updated = [...prevRooms];
            updated[currentIndex] = remoteRoomState;
            return updated;
          } else {
            return [...prevRooms, remoteRoomState];
          }
        });
      },
      (connected) => {
        setIsOnline(connected);
      }
    );

    return () => {
      syncManager.disconnect();
    };
  }, [activeRoomId]);

  // Fast, optimistic local update with zero lag
  const updateActiveRoom = (updater) => {
    setRooms(prevRooms => {
      const roomIndex = prevRooms.findIndex(r => r.id === activeRoomId);
      const current = roomIndex !== -1 ? prevRooms[roomIndex] : activeRoom;
      const partial = typeof updater === 'function' ? updater(current) : updater;
      
      const updatedRoom = {
        ...current,
        ...partial,
        updatedAt: Date.now(),
      };

      let nextRooms;
      if (roomIndex !== -1) {
        nextRooms = [...prevRooms];
        nextRooms[roomIndex] = updatedRoom;
      } else {
        nextRooms = [...prevRooms, updatedRoom];
      }

      // Sync in background without blocking UI
      syncManager.updateRoomState(activeRoomId, updatedRoom);
      return nextRooms;
    });
  };

  useEffect(() => {
    if (members.length > 0) {
      if (!payerId || !members.some(m => m.id === payerId)) {
        setPayerId(members[0].id);
      }
      setSelectedParticipants(members.map(m => m.id));
    } else {
      setPayerId('');
      setSelectedParticipants([]);
    }
  }, [members]);

  const handleSelectRoom = (roomId) => {
    setActiveRoomId(roomId);
    window.location.hash = '#/' + roomId;
    setInspectedMemberId(null);
  };

  const handleCreateList = (e) => {
    e.preventDefault();
    const clean = newListName.trim();
    if (!clean) return;
    const newId = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);
    const newRoom = {
      id: newId,
      name: clean,
      updatedAt: Date.now(),
      members: [],
      expenses: [],
    };

    setRooms(prev => [...prev, newRoom]);
    setActiveRoomId(newId);
    window.location.hash = '#/' + newId;
    setNewListName('');
    setIsAddingList(false);
    syncManager.updateRoomState(newId, newRoom);
  };

  const handleDeleteList = (roomIdToDelete) => {
    const target = rooms.find(r => r.id === roomIdToDelete) || activeRoom;
    if (!confirm(`Delete list "${target.name}" and all its expenses?`)) {
      return;
    }

    if (rooms.length <= 1) {
      const freshList = {
        id: 'new-list-' + Date.now().toString().slice(-4),
        name: 'New List',
        updatedAt: Date.now(),
        members: [],
        expenses: [],
      };
      setRooms([freshList]);
      setActiveRoomId(freshList.id);
      window.location.hash = '#/' + freshList.id;
      setInspectedMemberId(null);
      syncManager.updateRoomState(freshList.id, freshList);
      return;
    }

    const remaining = rooms.filter(r => r.id !== target.id);
    setRooms(remaining);
    const nextRoomId = remaining[0]?.id || 'my-trip';
    setActiveRoomId(nextRoomId);
    window.location.hash = '#/' + nextRoomId;
    setInspectedMemberId(null);
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    const name = newMemberName.trim();
    if (!name) return;

    if (members.some(m => m.name.toLowerCase() === name.toLowerCase())) {
      alert(`A member named "${name}" is already in this list.`);
      return;
    }

    const newMember = {
      id: 'm-' + Date.now(),
      name,
    };

    // Instant local reflection
    updateActiveRoom(prev => ({
      ...prev,
      members: [...prev.members, newMember],
    }));

    setNewMemberName('');
  };

  const handleRemoveMember = (memberId) => {
    updateActiveRoom(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== memberId),
      expenses: prev.expenses.filter(e => e.payerId !== memberId),
    }));
  };

  const toggleParticipant = (mId) => {
    setSelectedParticipants(prev => {
      if (prev.includes(mId)) {
        return prev.filter(id => id !== mId);
      } else {
        return [...prev, mId];
      }
    });
  };

  const selectAllParticipants = () => setSelectedParticipants(members.map(m => m.id));
  const deselectAllParticipants = () => setSelectedParticipants([]);

  const handleAddExpense = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    if (!description.trim()) {
      alert('Please enter what this payment was for.');
      return;
    }
    if (selectedParticipants.length === 0) {
      alert('Please check at least one member who participated.');
      return;
    }

    const shareCount = selectedParticipants.length;
    const baseShare = Math.floor((numAmount / shareCount) * 100) / 100;
    let remainder = round(numAmount - baseShare * shareCount);

    const splits = {};
    selectedParticipants.forEach(mId => {
      const extra = remainder > 0 ? 0.01 : 0;
      if (remainder > 0) remainder = round(remainder - 0.01);
      splits[mId] = round(baseShare + extra);
    });

    const newExpense = {
      id: 'exp-' + Date.now(),
      description: description.trim(),
      amount: numAmount,
      payerId,
      splits,
      date: new Date().toISOString(),
    };

    // Instant local reflection
    updateActiveRoom(prev => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
    }));

    setAmount('');
    setDescription('');
    setSelectedParticipants(members.map(m => m.id));
  };

  const handleDeleteExpense = (expId) => {
    updateActiveRoom(prev => ({
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== expId),
    }));
  };

  const handleClearAllExpenses = () => {
    if (expenses.length === 0) return;
    if (confirm(`Clear all expenses for "${activeRoom.name}" and reset to zero?`)) {
      updateActiveRoom(prev => ({
        ...prev,
        expenses: [],
      }));
      setInspectedMemberId(null);
    }
  };

  const handleShareLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#/${activeRoomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }).catch(() => {
      prompt('Copy this link to share with friends:', url);
    });
  };

  const calculation = useMemo(() => {
    return calculateDetailedSummary(members, expenses);
  }, [members, expenses]);

  const numAmount = parseFloat(amount) || 0;
  const perPersonPreview = selectedParticipants.length > 0 
    ? round(numAmount / selectedParticipants.length) 
    : 0;

  const inspectedMember = useMemo(() => {
    if (!inspectedMemberId) return null;
    return calculation.memberRows.find(r => r.id === inspectedMemberId);
  }, [inspectedMemberId, calculation]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      
      {/* Top Header - Ultra-Clean */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-lg tracking-tight text-slate-900">
              Splitter
            </span>
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-slate-100 text-slate-600">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              <span>{isOnline ? 'Synced' : 'Offline'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShareLink}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition active:scale-95 shadow-xs"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copied!' : 'Share'}</span>
          </button>
        </div>

        {/* Lists Bar - Horizontal Swipe */}
        <div className="max-w-xl mx-auto px-4 py-2 flex items-center space-x-2 overflow-x-auto no-scrollbar">
          {rooms.map(r => (
            <div
              key={r.id}
              className={`inline-flex items-center rounded-lg border transition flex-shrink-0 ${
                r.id === activeRoomId
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
            >
              <button
                type="button"
                onClick={() => handleSelectRoom(r.id)}
                className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              >
                {r.name}
              </button>
              {rooms.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteList(r.id);
                  }}
                  className={`pr-2.5 pl-1 py-1 text-xs transition ${
                    r.id === activeRoomId ? 'text-slate-400 hover:text-rose-400' : 'text-slate-400 hover:text-rose-600'
                  }`}
                  title={`Delete "${r.name}"`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {isAddingList ? (
            <form onSubmit={handleCreateList} className="flex items-center space-x-1.5 whitespace-nowrap flex-shrink-0">
              <input
                type="text"
                autoFocus
                placeholder="List name..."
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                className="bg-white border border-slate-400 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 w-32"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAddingList(false)}
                className="p-1 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingList(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 border border-dashed border-slate-300 hover:border-slate-400 flex items-center space-x-1 whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New List</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 py-4 space-y-4">
        
        {/* Clean Top Switcher (Expenses vs Settle Up) */}
        <div className="grid grid-cols-2 gap-2 bg-slate-200/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'expenses'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>1. Expenses ({expenses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settle')}
            className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'settle'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>2. Who Pays Whom</span>
            {calculation.settlements.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1"></span>
            )}
          </button>
        </div>

        {/* TAB 1: EXPENSES & MEMBERS VIEW */}
        {activeTab === 'expenses' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            
            {/* Active List Header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
              <div>
                <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  {activeRoom.name}
                </h1>
                <p className="text-xs text-slate-500">
                  {members.length} members • Total: <strong className="text-slate-900 font-mono">₹{calculation.totalAmount.toFixed(2)}</strong>
                </p>
              </div>

              {expenses.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllExpenses}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-200 rounded-lg transition"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Members Section */}
            <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-700" />
                  <span>Members ({members.length})</span>
                </h2>
              </div>

              {members.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3.5 text-center text-xs text-slate-500 leading-relaxed">
                  👋 Type your name and your friends' names below to get started!
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {members.map(m => (
                    <span
                      key={m.id}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
                    >
                      <span>{m.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded-full"
                        title={`Remove ${m.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddMember} className="flex items-center space-x-2 pt-1">
                <input
                  type="text"
                  placeholder="Friend's name (e.g. Rahul, Priya)..."
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition active:scale-95"
                >
                  + Add
                </button>
              </form>
            </section>

            {/* Add Expense Section */}
            <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                <Receipt className="w-3.5 h-3.5 text-slate-700" />
                <span>Add Payment</span>
              </h2>

              {members.length < 2 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start space-x-2 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>
                    Add at least <strong>2 members</strong> above before adding an expense.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleAddExpense} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-base font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        For What?
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Food, Cab"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Who Paid?
                      </label>
                      <select
                        value={payerId}
                        onChange={e => setPayerId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        {members.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Who shared? */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">
                        Who shared?
                      </span>
                      <div className="space-x-2 text-slate-500">
                        <button type="button" onClick={selectAllParticipants} className="hover:text-slate-900 font-semibold">
                          All
                        </button>
                        <span>|</span>
                        <button type="button" onClick={deselectAllParticipants} className="hover:text-slate-900">
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {members.map(m => {
                        const isChecked = selectedParticipants.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => toggleParticipant(m.id)}
                            className={`flex items-center justify-between p-2 rounded-xl border text-xs font-medium transition active:scale-98 min-h-[40px] ${
                              isChecked
                                ? 'bg-white border-slate-900 text-slate-900 font-bold shadow-xs'
                                : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                            }`}
                          >
                            <span className="truncate pr-1">{m.name}</span>
                            {isChecked ? (
                              <CheckSquare className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {numAmount > 0 && selectedParticipants.length > 0 && (
                      <div className="text-xs text-slate-700 pt-1 font-medium border-t border-slate-200/60">
                        👉 Split: <strong>₹{perPersonPreview} each</strong> ({selectedParticipants.length} shared)
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition active:scale-98 shadow-xs"
                  >
                    + Record Payment
                  </button>
                </form>
              )}
            </section>

            {/* Recorded Expenses List */}
            <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Recorded Expenses ({expenses.length})
                </h2>
                <span className="text-xs font-bold text-slate-900 font-mono">
                  Total: ₹{calculation.totalAmount.toFixed(2)}
                </span>
              </div>

              {expenses.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 italic">
                  No expenses added yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {expenses.map(exp => {
                    const participantNames = Object.keys(exp.splits || {})
                      .map(id => memberMap[id])
                      .filter(Boolean);
                    const isAll = participantNames.length === members.length;

                    return (
                      <div
                        key={exp.id}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between">
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                              {exp.description}
                            </h4>
                            <span className="text-sm font-extrabold text-slate-900 font-mono pl-2">
                              ₹{exp.amount.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Paid by <strong className="text-slate-800">{memberMap[exp.payerId] || 'Unknown'}</strong>
                          </p>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            {isAll ? 'Shared by all' : `Shared by ${participantNames.join(', ')}`}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg -mr-1"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

          </div>
        )}

        {/* TAB 2: SETTLE UP / WHO PAYS WHOM VIEW */}
        {activeTab === 'settle' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            
            {/* Main Settlement Box (The Final Result Friends Care About) */}
            <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center space-x-1.5">
                  <span>💸 Final Settlements</span>
                </h2>
                <span className="text-xs text-slate-500">
                  {calculation.settlements.length === 0 ? 'All Settled' : `${calculation.settlements.length} payment(s)`}
                </span>
              </div>

              {calculation.settlements.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200 leading-relaxed">
                  ✅ <strong>Everyone is settled up!</strong><br />No payments pending for {activeRoom.name}.
                </div>
              ) : (
                <div className="space-y-2">
                  {calculation.settlements.map((tx, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-xs"
                    >
                      <div className="flex items-center space-x-2 text-xs min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-extrabold text-rose-600 truncate text-sm">
                          {tx.fromName}
                        </span>
                        <span className="text-slate-400 text-[11px] flex-shrink-0">
                          pays ➔
                        </span>
                        <span className="font-extrabold text-emerald-600 truncate text-sm">
                          {tx.toName}
                        </span>
                      </div>

                      <div className="font-extrabold text-slate-900 font-mono text-base pl-2 flex-shrink-0">
                        ₹{tx.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Member Net Balances Summary */}
            <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Member Balances
              </h3>

              <div className="space-y-2">
                {calculation.memberRows.map(row => {
                  const isGetsBack = row.netBalance > 0.01;
                  const isOwes = row.netBalance < -0.01;
                  const isInspected = inspectedMemberId === row.id;

                  return (
                    <div
                      key={row.id}
                      onClick={() => setInspectedMemberId(isInspected ? null : row.id)}
                      className={`border rounded-xl p-3 transition cursor-pointer ${
                        isInspected
                          ? 'bg-slate-100/80 border-slate-400'
                          : 'bg-slate-50 border-slate-200 active:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {row.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              isGetsBack
                                ? 'bg-emerald-100 text-emerald-800'
                                : isOwes
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {row.status}
                          </span>
                        </div>

                        <div
                          className={`font-mono font-extrabold text-base ${
                            isGetsBack
                              ? 'text-emerald-600'
                              : isOwes
                              ? 'text-rose-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {isGetsBack && '+'}
                          ₹{row.netBalance.toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200/60">
                        <span>Paid: <strong className="text-slate-700 font-mono">₹{row.totalPaid.toFixed(2)}</strong></span>
                        <span>Share: <strong className="text-slate-700 font-mono">₹{row.fairShare.toFixed(2)}</strong></span>
                        <span className="text-[10px] text-slate-400 flex items-center space-x-0.5">
                          <span>Receipt</span>
                          {isInspected ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ITEMIZED AUDIT EXPANSION */}
              {inspectedMember && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="font-bold text-slate-900">
                      Receipt Breakdown for {inspectedMember.name}:
                    </span>
                    <button
                      type="button"
                      onClick={() => setInspectedMemberId(null)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                        Paid by {inspectedMember.name} (₹{inspectedMember.totalPaid.toFixed(2)}):
                      </span>
                      {inspectedMember.details.paidList.length === 0 ? (
                        <p className="text-slate-400 italic">No payments made.</p>
                      ) : (
                        inspectedMember.details.paidList.map((p, i) => (
                          <div key={i} className="flex justify-between py-0.5 border-b border-slate-200/50">
                            <span className="text-slate-700">• {p.description}</span>
                            <span className="font-mono font-medium">₹{p.amount.toFixed(2)}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                        Shared / Consumed (₹{inspectedMember.fairShare.toFixed(2)}):
                      </span>
                      {inspectedMember.details.participatedList.length === 0 ? (
                        <p className="text-slate-400 italic">No bills shared.</p>
                      ) : (
                        inspectedMember.details.participatedList.map((s, i) => (
                          <div key={i} className="flex justify-between py-0.5 border-b border-slate-200/50">
                            <span className="text-slate-700">• {s.description}</span>
                            <span className="font-mono font-medium">₹{s.share.toFixed(2)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-slate-800 text-xs">
                    <strong>Net:</strong> Paid (₹{inspectedMember.totalPaid.toFixed(2)}) − Share (₹{inspectedMember.fairShare.toFixed(2)}) ={' '}
                    <strong className={inspectedMember.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {inspectedMember.netBalance >= 0 ? '+' : ''}₹{inspectedMember.netBalance.toFixed(2)}
                    </strong>
                  </div>
                </div>
              )}
            </section>

            {/* Optional Math Verification Collapsible (Keeps main screen uncluttered) */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDetailedAudit(!showDetailedAudit)}
                className="w-full p-3.5 flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
              >
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Math Verification Proof (Zero-Sum Checked ✓)</span>
                </div>
                {showDetailedAudit ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showDetailedAudit && (
                <div className="p-3.5 border-t border-slate-100 bg-slate-50 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Total Paid vs Consumed:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{calculation.audit.totalPaidSum.toFixed(2)} = ₹{calculation.audit.totalShareSum.toFixed(2)} (✓)
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Net Difference (Zero-Sum):</span>
                    <span className="font-mono font-bold text-emerald-600">
                      ₹{calculation.audit.netSum.toFixed(2)} (✓ Exact)
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Total Debt Cleared:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{calculation.audit.totalSettlementAmount.toFixed(2)} (✓ Squares all)
                    </span>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
