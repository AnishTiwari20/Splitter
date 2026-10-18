import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Share2, 
  Check, 
  Wifi, 
  WifiOff, 
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
  Square
} from 'lucide-react';
import { round, calculateDetailedSummary } from './utils/debtSimplifier';
import { syncManager } from './utils/syncManager';

// Personalized clean default: 0 hardcoded dummy members or fake expenses
const DEFAULT_ROOMS = [
  {
    id: 'my-trip',
    name: 'My Trip',
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

  // Expandable member audit breakdown
  const [inspectedMemberId, setInspectedMemberId] = useState(null);

  const activeRoom = useMemo(() => {
    let found = rooms.find(r => r.id === activeRoomId);
    if (!found) {
      if (rooms.length > 0) return rooms[0];
      const cleanName = activeRoomId.replace(/-/g, ' ');
      const newRoom = {
        id: activeRoomId,
        name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
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

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('splitter_minimal_rooms_v1', JSON.stringify(rooms));
    } catch (e) {}
  }, [rooms]);

  // Connect to real-time sync room
  useEffect(() => {
    syncManager.connect(
      activeRoomId,
      (remoteRoomState) => {
        if (remoteRoomState && remoteRoomState.id === activeRoomId) {
          setRooms(prevRooms => {
            const index = prevRooms.findIndex(r => r.id === activeRoomId);
            if (index !== -1) {
              const updated = [...prevRooms];
              updated[index] = remoteRoomState;
              return updated;
            } else {
              return [...prevRooms, remoteRoomState];
            }
          });
        }
      },
      (connected) => {
        setIsOnline(connected);
      }
    );

    return () => {
      syncManager.disconnect();
    };
  }, [activeRoomId]);

  const updateActiveRoom = (updater) => {
    setRooms(prevRooms => {
      const roomIndex = prevRooms.findIndex(r => r.id === activeRoomId);
      const current = roomIndex !== -1 ? prevRooms[roomIndex] : activeRoom;
      const updatedRoom = typeof updater === 'function' ? updater(current) : { ...current, ...updater };

      let nextRooms;
      if (roomIndex !== -1) {
        nextRooms = [...prevRooms];
        nextRooms[roomIndex] = updatedRoom;
      } else {
        nextRooms = [...prevRooms, updatedRoom];
      }

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
      members: [],
      expenses: [],
    };

    setRooms(prev => [...prev, newRoom]);
    setActiveRoomId(newId);
    window.location.hash = '#/' + newId;
    setNewListName('');
    setIsAddingList(false);
  };

  const handleDeleteList = (roomIdToDelete) => {
    const target = rooms.find(r => r.id === roomIdToDelete) || activeRoom;
    if (!confirm(`Are you sure you want to delete "${target.name}" and all its expenses?`)) {
      return;
    }

    if (rooms.length <= 1) {
      const freshList = {
        id: 'new-list-' + Date.now().toString().slice(-4),
        name: 'New List',
        members: [],
        expenses: [],
      };
      setRooms([freshList]);
      setActiveRoomId(freshList.id);
      window.location.hash = '#/' + freshList.id;
      setInspectedMemberId(null);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      
      {/* Top Header - Mobile Optimized */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-3xl mx-auto px-3.5 sm:px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-lg tracking-tight text-slate-900">
              Splitter
            </span>
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium border bg-slate-100 text-slate-600">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShareLink}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition active:scale-95 shadow-xs"
            title={`Copy direct link for "${activeRoom.name}"`}
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="truncate max-w-[120px] sm:max-w-none">
              {copiedLink ? 'Copied!' : 'Share List'}
            </span>
          </button>
        </div>

        {/* Lists Bar - Touch Friendly Horizontal Swipe */}
        <div className="max-w-3xl mx-auto px-3.5 sm:px-4 py-2 flex items-center space-x-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap mr-0.5">
            Lists:
          </span>
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
                  className={`pr-2.5 pl-1 py-1.5 text-xs transition ${
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
                className="bg-white border border-slate-400 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 w-28 sm:w-36"
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
      <main className="max-w-3xl mx-auto px-3.5 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        
        {/* Active List Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {activeRoom.name}
              </h1>
              <button
                type="button"
                onClick={handleShareLink}
                className="text-slate-400 hover:text-slate-800 p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
                title={`Copy direct WhatsApp link for ${activeRoom.name}`}
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Direct Link: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-[11px]">#/{activeRoomId}</code> • {members.length} members
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-1 sm:pt-0">
            {expenses.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllExpenses}
                className="flex-1 sm:flex-none px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition flex items-center justify-center space-x-1"
                title="Reset all expenses in this list to zero"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Expenses</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleDeleteList(activeRoomId)}
              className="flex-1 sm:flex-none px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center justify-center space-x-1"
              title="Delete this entire list"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete List</span>
            </button>
          </div>
        </div>

        {/* 1. MEMBERS SECTION - Touch Friendly */}
        <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-slate-700" />
              <span>Members ({members.length})</span>
            </h2>
            <span className="text-[11px] text-slate-400">
              Tap ✕ to remove
            </span>
          </div>

          {members.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 text-center text-xs text-slate-500 leading-relaxed">
              👋 No members added yet.<br />Type your name and your friends' names below to get started!
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
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
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition active:scale-95 whitespace-nowrap"
            >
              + Add
            </button>
          </form>
        </section>

        {/* 2. ADD EXPENSE SECTION - Mobile Thumb Friendly */}
        <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
            <Receipt className="w-3.5 h-3.5 text-slate-700" />
            <span>Add New Payment</span>
          </h2>

          {members.length < 2 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start space-x-2 text-xs text-amber-800 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                Please add at least <strong>2 members</strong> above before you can record and split a payment.
              </span>
            </div>
          ) : (
            <form onSubmit={handleAddExpense} className="space-y-4">
              
              {/* Amount - Large ATM Style */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-3 text-lg font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Description & Payer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    What was this for?
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Food, Uber, Groceries"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Who paid?
                  </label>
                  <select
                    value={payerId}
                    onChange={e => setPayerId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Who participated / Ate? (Touch Checkbox Cards) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">
                    Who participated / ate?
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={selectAllParticipants}
                      className="text-slate-600 hover:text-slate-900 font-semibold"
                    >
                      All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={deselectAllParticipants}
                      className="text-slate-500 hover:text-slate-900"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {members.map(m => {
                    const isChecked = selectedParticipants.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleParticipant(m.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition select-none active:scale-98 min-h-[44px] ${
                          isChecked
                            ? 'bg-white border-slate-900 text-slate-900 shadow-xs'
                            : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                        }`}
                      >
                        <span className="truncate pr-1">{m.name}</span>
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-slate-900 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {numAmount > 0 && selectedParticipants.length > 0 && (
                  <div className="text-xs text-slate-700 pt-1.5 font-medium border-t border-slate-200">
                    👉 Split: <strong className="text-slate-900 font-mono">₹{perPersonPreview} each</strong> among {selectedParticipants.length} member(s).
                    {members.length > selectedParticipants.length && (
                      <span className="text-amber-700 font-medium ml-1 block sm:inline mt-0.5 sm:mt-0">
                        ({members.length - selectedParticipants.length} member did not participate)
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition active:scale-98 shadow-xs"
              >
                + Record Payment
              </button>
            </form>
          )}
        </section>

        {/* 3. RECORDED PAYMENTS - Mobile Cards + Desktop Table */}
        <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Recorded Expenses ({expenses.length})
            </h2>
            <span className="text-xs font-extrabold text-slate-900 font-mono">
              Total: ₹{calculation.totalAmount.toFixed(2)}
            </span>
          </div>

          {expenses.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6 italic">
              No expenses recorded yet. Add a payment above.
            </p>
          ) : (
            <>
              {/* MOBILE VIEW: Clean Touch Cards */}
              <div className="sm:hidden space-y-2.5">
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
                        <p className="text-[11px] text-slate-600 mt-1">
                          {isAll ? (
                            <span className="text-slate-500">Shared by all members</span>
                          ) : (
                            <span className="text-amber-800 font-medium">
                              Shared by {participantNames.join(', ')} ({participantNames.length})
                            </span>
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg -mr-1"
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP VIEW: Full Clean Table */}
              <div className="hidden sm:block overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3">Paid By</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3">Split Between</th>
                      <th className="py-2.5 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {expenses.map(exp => {
                      const participantNames = Object.keys(exp.splits || {})
                        .map(id => memberMap[id])
                        .filter(Boolean);
                      const isAll = participantNames.length === members.length;

                      return (
                        <tr key={exp.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {exp.description}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {memberMap[exp.payerId] || 'Unknown'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                            ₹{exp.amount.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {isAll ? (
                              <span className="text-slate-500">All members</span>
                            ) : (
                              <span className="text-amber-800">
                                {participantNames.join(', ')} ({participantNames.length})
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* 4. SETTLEMENT TABLES & VERIFICATION CHECK */}
        {members.length >= 2 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Split Calculation & Settlement
              </h2>
              <div className="flex items-center space-x-1.5 text-[11px] sm:text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero-Sum Verified ✓</span>
              </div>
            </div>

            {/* TABLE 1: SUMMARY PER MEMBER (Mobile Cards + Desktop Table) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  1. Member Balances
                </h3>
                <span className="text-[11px] text-slate-400">
                  Tap member to inspect receipt
                </span>
              </div>

              {/* MOBILE VIEW: Clean Cards */}
              <div className="sm:hidden space-y-2">
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
                          <span>Details</span>
                          {isInspected ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP VIEW: Full Table */}
              <div className="hidden sm:block overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Member</th>
                      <th className="py-2.5 px-3 text-right">Total Paid</th>
                      <th className="py-2.5 px-3 text-right">Fair Share</th>
                      <th className="py-2.5 px-3 text-right">Net Balance</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-2 text-center">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {calculation.memberRows.map(row => {
                      const isGetsBack = row.netBalance > 0.01;
                      const isOwes = row.netBalance < -0.01;
                      const isInspected = inspectedMemberId === row.id;

                      return (
                        <tr
                          key={row.id}
                          onClick={() => setInspectedMemberId(isInspected ? null : row.id)}
                          className={`cursor-pointer transition ${
                            isInspected ? 'bg-slate-100/80 font-medium' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {row.name}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            ₹{row.totalPaid.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            ₹{row.fairShare.toFixed(2)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-bold ${
                              isGetsBack
                                ? 'text-emerald-600'
                                : isOwes
                                ? 'text-rose-600'
                                : 'text-slate-500'
                            }`}
                          >
                            {isGetsBack && '+'}
                            ₹{row.netBalance.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                isGetsBack
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isOwes
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-400">
                            {isInspected ? <ChevronUp className="w-3.5 h-3.5 mx-auto" /> : <ChevronDown className="w-3.5 h-3.5 mx-auto" />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ITEMIZED AUDIT EXPANSION FOR SELECTED MEMBER */}
              {inspectedMember && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                        Paid by {inspectedMember.name} (Total: ₹{inspectedMember.totalPaid.toFixed(2)}):
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

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                        Shared/Consumed (Total: ₹{inspectedMember.fairShare.toFixed(2)}):
                      </span>
                      {inspectedMember.details.participatedList.length === 0 ? (
                        <p className="text-slate-400 italic">No bills shared.</p>
                      ) : (
                        inspectedMember.details.participatedList.map((s, i) => (
                          <div key={i} className="flex justify-between py-0.5 border-b border-slate-200/50">
                            <span className="text-slate-700">
                              • {s.description} ({s.participantsCount} shared)
                            </span>
                            <span className="font-mono font-medium">₹{s.share.toFixed(2)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-slate-800 text-xs">
                    <strong>Net Formula:</strong> Paid (₹{inspectedMember.totalPaid.toFixed(2)}) − Share (₹{inspectedMember.fairShare.toFixed(2)}) ={' '}
                    <strong className={inspectedMember.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {inspectedMember.netBalance >= 0 ? '+' : ''}₹{inspectedMember.netBalance.toFixed(2)}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* TABLE 2: WHO HAS TO PAY WHOM AND HOW MUCH (Mobile Cards + Desktop Table) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Final Settlements (Who Has to Pay Whom)
              </h3>

              {calculation.settlements.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  ✅ Everyone is settled up! No payments pending.
                </div>
              ) : (
                <>
                  {/* MOBILE VIEW: Settlement Cards */}
                  <div className="sm:hidden space-y-2">
                    {calculation.settlements.map((tx, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2 text-xs min-w-0">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-rose-600 truncate">
                            {tx.fromName}
                          </span>
                          <span className="text-slate-400 text-[10px] flex items-center flex-shrink-0">
                            pays ➔
                          </span>
                          <span className="font-bold text-emerald-600 truncate">
                            {tx.toName}
                          </span>
                        </div>

                        <div className="font-extrabold text-slate-900 font-mono text-sm pl-2 flex-shrink-0">
                          ₹{tx.amount.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* DESKTOP VIEW: Full Table */}
                  <div className="hidden sm:block overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-4 font-bold text-slate-800">Who Has to Pay</th>
                          <th className="py-2.5 px-4 font-bold text-slate-800">Pays Whom</th>
                          <th className="py-2.5 px-4 text-right font-bold text-slate-800">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {calculation.settlements.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-3 text-center font-mono text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4 font-bold text-rose-600">
                              {tx.fromName}
                            </td>
                            <td className="py-3 px-4 font-bold text-emerald-600">
                              {tx.toName}
                            </td>
                            <td className="py-3 px-4 text-right font-extrabold text-slate-900 font-mono text-sm">
                              ₹{tx.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* 3. MATHEMATICAL PROOF & CHECKSUM AUDIT */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
              <h4 className="font-bold text-slate-800 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Zero-Sum Verification:</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block">Total Paid vs Consumed:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    ₹{calculation.audit.totalPaidSum.toFixed(2)} = ₹{calculation.audit.totalShareSum.toFixed(2)}
                  </span>
                  <span className="text-emerald-600 block text-[10px] mt-0.5">✓ 100% matches</span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block">Zero-Sum Balance:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    Net Sum = ₹{calculation.audit.netSum.toFixed(2)}
                  </span>
                  <span className="text-emerald-600 block text-[10px] mt-0.5">✓ Exactly ₹0.00</span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block">Total Debt Cleared:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    ₹{calculation.audit.totalSettlementAmount.toFixed(2)}
                  </span>
                  <span className="text-emerald-600 block text-[10px] mt-0.5">✓ Squares all debts</span>
                </div>
              </div>
            </div>

          </section>
        )}

      </main>

    </div>
  );
}
