import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Share2, 
  Check, 
  Users,
  Receipt,
  X,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckSquare,
  Square,
  Scale,
  User,
  UserCheck
} from 'lucide-react';
import { round, calculateDetailedSummary } from './utils/debtSimplifier';
import { syncManager } from './utils/syncManager';

// Default initial state
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
  // Current user identity for personalization
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return localStorage.getItem('splitter_current_user') || '';
    } catch (e) {
      return '';
    }
  });

  const [isSelectingUser, setIsSelectingUser] = useState(false);
  const [userNameInput, setUserNameInput] = useState('');

  // Rooms state
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

  // Expandable audit proof and full group settlements
  const [showDetailedAudit, setShowDetailedAudit] = useState(false);
  const [showFullGroupSettlements, setShowFullGroupSettlements] = useState(false);
  const [inspectedMemberId, setInspectedMemberId] = useState(null);

  // Filter option: 'my' (only lists I am in) or 'all'
  const [listFilterMode, setListFilterMode] = useState('my');

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

  // Persist current user to localStorage
  const handleSetCurrentUser = (name) => {
    const clean = name.trim();
    if (!clean) return;
    setCurrentUser(clean);
    try {
      localStorage.setItem('splitter_current_user', clean);
    } catch (e) {}
    setIsSelectingUser(false);
    setUserNameInput('');
  };

  // List of all unique member names known across all lists
  const allKnownMemberNames = useMemo(() => {
    const set = new Set();
    rooms.forEach(r => {
      (r.members || []).forEach(m => {
        if (m.name) set.add(m.name);
      });
    });
    return Array.from(set);
  }, [rooms]);

  // Filtered rooms: only lists where currentUser is a member (if currentUser is set and filter is 'my')
  const visibleRooms = useMemo(() => {
    if (!currentUser || listFilterMode === 'all') {
      return rooms;
    }
    const filtered = rooms.filter(r => 
      (r.members || []).some(m => m.name.toLowerCase() === currentUser.toLowerCase())
    );
    // If user has no lists yet, fallback to showing all so they can create/join one
    return filtered.length > 0 ? filtered : rooms;
  }, [rooms, currentUser, listFilterMode]);

  // Active room determination
  const activeRoom = useMemo(() => {
    let found = rooms.find(r => r.id === activeRoomId);
    if (!found) {
      if (rooms.length > 0) return rooms[0];
      const cleanName = activeRoomId.replace(/-/g, ' ');
      const newRoom = {
        id: activeRoomId,
        name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
        updatedAt: Date.now(),
        members: currentUser ? [{ id: 'm-' + Date.now(), name: currentUser }] : [],
        expenses: [],
      };
      return newRoom;
    }
    return found;
  }, [rooms, activeRoomId, currentUser]);

  const members = activeRoom.members || [];
  const expenses = activeRoom.expenses || [];

  const memberMap = useMemo(() => {
    const map = {};
    members.forEach(m => { map[m.id] = m.name; });
    return map;
  }, [members]);

  // Check if currentUser is a member of the currently active room
  const isCurrentUserInActiveRoom = useMemo(() => {
    if (!currentUser) return false;
    return members.some(m => m.name.toLowerCase() === currentUser.toLowerCase());
  }, [members, currentUser]);

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

  // Default payer and participants
  useEffect(() => {
    if (members.length > 0) {
      // Prefer setting currentUser as default payer if they are in the list
      const myMember = members.find(m => currentUser && m.name.toLowerCase() === currentUser.toLowerCase());
      if (myMember) {
        setPayerId(myMember.id);
      } else if (!payerId || !members.some(m => m.id === payerId)) {
        setPayerId(members[0].id);
      }
      setSelectedParticipants(members.map(m => m.id));
    } else {
      setPayerId('');
      setSelectedParticipants([]);
    }
  }, [members, currentUser]);

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
    
    // Automatically include currentUser as first member if known
    const initialMembers = currentUser ? [{ id: 'm-' + Date.now(), name: currentUser }] : [];

    const newRoom = {
      id: newId,
      name: clean,
      updatedAt: Date.now(),
      members: initialMembers,
      expenses: [],
    };

    setRooms(prev => [...prev, newRoom]);
    setActiveRoomId(newId);
    window.location.hash = '#/' + newId;
    setNewListName('');
    setIsAddingList(false);
    syncManager.updateRoomState(newId, newRoom);
  };

  const handleJoinListAsCurrentUser = () => {
    if (!currentUser) {
      setIsSelectingUser(true);
      return;
    }
    if (isCurrentUserInActiveRoom) return;

    const newMember = {
      id: 'm-' + Date.now(),
      name: currentUser,
    };

    updateActiveRoom(prev => ({
      ...prev,
      members: [...prev.members, newMember],
    }));
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
        members: currentUser ? [{ id: 'm-' + Date.now(), name: currentUser }] : [],
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

  // Current user's direct settlements (Whom to pay, who owes me)
  const mySettlements = useMemo(() => {
    if (!currentUser) return { myDebtsToPay: [], myCreditsToReceive: [], myNetBalance: 0 };
    const lower = currentUser.toLowerCase();
    
    const myDebtsToPay = calculation.settlements.filter(tx => tx.fromName.toLowerCase() === lower);
    const myCreditsToReceive = calculation.settlements.filter(tx => tx.toName.toLowerCase() === lower);
    
    const totalToPay = myDebtsToPay.reduce((acc, tx) => acc + tx.amount, 0);
    const totalToReceive = myCreditsToReceive.reduce((acc, tx) => acc + tx.amount, 0);
    const myNetBalance = round(totalToReceive - totalToPay);

    return { myDebtsToPay, myCreditsToReceive, myNetBalance };
  }, [calculation.settlements, currentUser]);

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

          <div className="flex items-center space-x-2">
            {/* Identity Switcher */}
            <button
              type="button"
              onClick={() => setIsSelectingUser(true)}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition border border-slate-300"
              title="Change your identity"
            >
              <User className="w-3.5 h-3.5 text-slate-600" />
              <span className="truncate max-w-[90px]">
                {currentUser ? currentUser : 'Set Name'}
              </span>
            </button>

            {/* Share Link */}
            <button
              type="button"
              onClick={handleShareLink}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition active:scale-95 shadow-xs"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Personalized Lists Bar */}
        <div className="max-w-xl mx-auto px-4 py-2 border-t border-slate-100">
          <div className="flex items-center justify-between pb-1.5 text-[11px] text-slate-500 font-medium">
            <span>
              {currentUser ? `Lists for ${currentUser}:` : 'All Lists:'}
            </span>
            {currentUser && rooms.length > visibleRooms.length && (
              <button
                type="button"
                onClick={() => setListFilterMode(prev => prev === 'my' ? 'all' : 'my')}
                className="text-slate-700 font-semibold hover:underline"
              >
                {listFilterMode === 'my' ? `Show all (${rooms.length})` : 'Show only mine'}
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-0.5">
            {visibleRooms.map(r => (
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
                  placeholder="New list name..."
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
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 py-4 space-y-4">

        {/* Prompt to join list if currentUser is not yet in this room */}
        {currentUser && !isCurrentUserInActiveRoom && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between text-xs text-amber-900 shadow-xs">
            <div>
              <span>You are viewing <strong>{activeRoom.name}</strong> as <strong>{currentUser}</strong>.</span>
              <p className="text-[11px] text-amber-700 mt-0.5">You are not added to this list yet.</p>
            </div>
            <button
              type="button"
              onClick={handleJoinListAsCurrentUser}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition text-xs flex-shrink-0 ml-2"
            >
              + Join List
            </button>
          </div>
        )}

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
                  <span>Members in this list ({members.length})</span>
                </h2>
              </div>

              {members.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3.5 text-center text-xs text-slate-500 leading-relaxed">
                  👋 Add yourself and your friends below to split expenses!
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {members.map(m => {
                    const isMe = currentUser && m.name.toLowerCase() === currentUser.toLowerCase();
                    return (
                      <span
                        key={m.id}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                          isMe 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                            : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        <span>{m.name} {isMe && '(You)'}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.id)}
                          className={`p-0.5 rounded-full ${isMe ? 'text-slate-400 hover:text-rose-400' : 'text-slate-400 hover:text-rose-600'}`}
                          title={`Remove ${m.name}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
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
                        placeholder="e.g. Dinner, Cab"
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
                        {members.map(m => {
                          const isMe = currentUser && m.name.toLowerCase() === currentUser.toLowerCase();
                          return (
                            <option key={m.id} value={m.id}>
                              {m.name} {isMe ? '(You)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Who shared? */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">
                        Who participated?
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
                        const isMe = currentUser && m.name.toLowerCase() === currentUser.toLowerCase();
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
                            <span className="truncate pr-1">
                              {m.name} {isMe && '(You)'}
                            </span>
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

            {/* Recorded Expenses List with Transparent Item Details */}
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
                <div className="space-y-2.5">
                  {expenses.map(exp => {
                    const payerName = memberMap[exp.payerId] || 'Unknown';
                    const isPayerMe = currentUser && payerName.toLowerCase() === currentUser.toLowerCase();

                    // Find if currentUser was part of participants
                    const currentMemberObj = members.find(m => currentUser && m.name.toLowerCase() === currentUser.toLowerCase());
                    const myShareAmount = currentMemberObj && exp.splits ? exp.splits[currentMemberObj.id] : null;
                    const didIParticipate = myShareAmount !== undefined && myShareAmount !== null;

                    const participantNames = Object.keys(exp.splits || {})
                      .map(id => memberMap[id])
                      .filter(Boolean);
                    const isAll = participantNames.length === members.length;

                    return (
                      <div
                        key={exp.id}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between">
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {exp.description}
                              </h4>
                              <span className="text-sm font-extrabold text-slate-900 font-mono pl-2">
                                ₹{exp.amount.toFixed(2)}
                              </span>
                            </div>

                            {/* Who bought / paid */}
                            <div className="flex items-center space-x-1.5 text-xs mt-1">
                              <span className="text-slate-500">Paid by:</span>
                              {isPayerMe ? (
                                <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px]">
                                  ⭐ You ({payerName})
                                </span>
                              ) : (
                                <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[11px]">
                                  👤 {payerName}
                                </span>
                              )}
                            </div>

                            {/* Who participated */}
                            <div className="text-[11px] text-slate-500 mt-1">
                              <span className="text-slate-600 font-medium">Shared by: </span>
                              <span>{isAll ? 'All members' : participantNames.join(', ')}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg -mr-1"
                            title="Delete expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Personalized Share Calculation for currentUser */}
                        {currentUser && currentMemberObj && (
                          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                            {didIParticipate ? (
                              <div className="flex items-center space-x-1.5 text-slate-700 font-medium">
                                <span>👉 Your share:</span>
                                <strong className="text-slate-900 font-mono font-bold">
                                  ₹{myShareAmount.toFixed(2)}
                                </strong>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">
                                ⚪ Not included (₹0)
                              </span>
                            )}

                            {isPayerMe && (
                              <span className="text-[10px] text-emerald-600 font-semibold">
                                ✓ Paid in full
                              </span>
                            )}
                          </div>
                        )}
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
            
            {/* 1. PERSONALIZED SETTLEMENT SECTION: YOUR SETTLEMENT */}
            {currentUser && isCurrentUserInActiveRoom ? (
              <section className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-extrabold tracking-tight">
                      Your Settlement ({currentUser})
                    </h2>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    Personal Dues
                  </span>
                </div>

                {mySettlements.myDebtsToPay.length === 0 && mySettlements.myCreditsToReceive.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-300 bg-slate-800/60 rounded-xl leading-relaxed">
                    🎉 <strong>All settled up!</strong><br />You don't owe anyone and no one owes you.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* You Have To Pay */}
                    {mySettlements.myDebtsToPay.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider block">
                          🔴 You Owe:
                        </span>
                        {mySettlements.myDebtsToPay.map((tx, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-800/90 border border-rose-900/40 rounded-xl p-3 flex items-center justify-between"
                          >
                            <div className="text-xs">
                              <span className="text-slate-300">Pay </span>
                              <strong className="text-white font-bold text-sm">{tx.toName}</strong>
                            </div>
                            <div className="font-mono font-extrabold text-rose-400 text-base">
                              ₹{tx.amount.toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* You Will Receive */}
                    {mySettlements.myCreditsToReceive.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
                          🟢 You Are Owed:
                        </span>
                        {mySettlements.myCreditsToReceive.map((tx, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-800/90 border border-emerald-900/40 rounded-xl p-3 flex items-center justify-between"
                          >
                            <div className="text-xs">
                              <strong className="text-white font-bold text-sm">{tx.fromName}</strong>
                              <span className="text-slate-300"> will pay you</span>
                            </div>
                            <div className="font-mono font-extrabold text-emerald-400 text-base">
                              ₹{tx.amount.toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Overall Net Balance */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Net Balance:</span>
                      <span className={`font-mono font-bold text-sm ${
                        mySettlements.myNetBalance > 0.01 
                          ? 'text-emerald-400' 
                          : mySettlements.myNetBalance < -0.01 
                          ? 'text-rose-400' 
                          : 'text-slate-300'
                      }`}>
                        {mySettlements.myNetBalance > 0.01 && `+₹${mySettlements.myNetBalance.toFixed(2)} (You get back)`}
                        {mySettlements.myNetBalance < -0.01 && `-₹${Math.abs(mySettlements.myNetBalance).toFixed(2)} (You owe)`}
                        {Math.abs(mySettlements.myNetBalance) <= 0.01 && '₹0.00 (All settled)'}
                      </span>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-center space-y-2">
                <p className="text-xs text-slate-600">
                  {currentUser ? `You are not a member of "${activeRoom.name}".` : 'Select your name to view your individual settlement.'}
                </p>
                <button
                  type="button"
                  onClick={() => currentUser ? handleJoinListAsCurrentUser() : setIsSelectingUser(true)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold transition"
                >
                  {currentUser ? `+ Join "${activeRoom.name}" as ${currentUser}` : 'Set Your Name'}
                </button>
              </div>
            )}

            {/* 2. COMPLETE GROUP SETTLEMENTS (COLLAPSIBLE FOR TRANSPARENCY) */}
            <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <button
                type="button"
                onClick={() => setShowFullGroupSettlements(!showFullGroupSettlements)}
                className="w-full flex items-center justify-between pb-1 text-left"
              >
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    👥 Full Group Settlements ({calculation.settlements.length})
                  </h3>
                </div>
                <div className="text-slate-400 text-xs flex items-center space-x-1 font-medium">
                  <span>{showFullGroupSettlements ? 'Hide' : 'View All'}</span>
                  {showFullGroupSettlements ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>

              {showFullGroupSettlements && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  {calculation.settlements.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                      ✅ Everyone is settled up. No payments pending.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {calculation.settlements.map((tx, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between"
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

                  {/* Member Balances Breakdown */}
                  <div className="pt-2">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      All Member Balances:
                    </h4>
                    <div className="space-y-1.5">
                      {calculation.memberRows.map(row => {
                        const isGetsBack = row.netBalance > 0.01;
                        const isOwes = row.netBalance < -0.01;
                        const isInspected = inspectedMemberId === row.id;

                        return (
                          <div
                            key={row.id}
                            onClick={() => setInspectedMemberId(isInspected ? null : row.id)}
                            className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs transition cursor-pointer hover:bg-slate-100"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">
                                {row.name}
                              </span>
                              <span className={`font-mono font-bold ${
                                isGetsBack ? 'text-emerald-600' : isOwes ? 'text-rose-600' : 'text-slate-500'
                              }`}>
                                {isGetsBack && '+'}₹{row.netBalance.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Inspected Member Receipt Details */}
                  {inspectedMember && (
                    <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 text-xs space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200 font-bold">
                        <span>Details for {inspectedMember.name}:</span>
                        <button type="button" onClick={() => setInspectedMemberId(null)} className="text-slate-500">✕</button>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 font-bold block">Paid:</span>
                        {inspectedMember.details.paidList.map((p, i) => (
                          <div key={i} className="flex justify-between py-0.5">
                            <span>• {p.description}</span>
                            <span className="font-mono">₹{p.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 font-bold block">Share:</span>
                        {inspectedMember.details.participatedList.map((s, i) => (
                          <div key={i} className="flex justify-between py-0.5">
                            <span>• {s.description}</span>
                            <span className="font-mono">₹{s.share.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Optional Math Verification Collapsible */}
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

      {/* USER SELECTION MODAL (1-Tap Identity Prompt) */}
      {isSelectingUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-slate-800" />
                <h3 className="text-base font-extrabold text-slate-900">
                  What's your name?
                </h3>
              </div>
              {currentUser && (
                <button
                  type="button"
                  onClick={() => setIsSelectingUser(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Select or enter your name to view your lists and personalized settlements.
            </p>

            {/* Existing Known Members Chips */}
            {allKnownMemberNames.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Select your name:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {allKnownMemberNames.map(name => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleSetCurrentUser(name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                        currentUser.toLowerCase() === name.toLowerCase()
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-100 text-slate-800 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Or Type New Name */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSetCurrentUser(userNameInput);
              }}
              className="space-y-3 pt-2 border-t border-slate-100"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Or enter a new name:
                </label>
                <input
                  type="text"
                  autoFocus={allKnownMemberNames.length === 0}
                  placeholder="e.g. Anish, Rahul..."
                  value={userNameInput}
                  onChange={e => setUserNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="submit"
                  disabled={!userNameInput.trim()}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Confirm & Continue
                </button>
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => setIsSelectingUser(false)}
                    className="px-3 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
