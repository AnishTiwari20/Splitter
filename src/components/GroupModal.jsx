import React, { useState } from 'react';
import { X, Users, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { AVATAR_COLORS } from '../types';

export default function GroupModal({ isOpen, onClose, onSaveGroup, initialGroup = null }) {
  const isEditing = Boolean(initialGroup);
  
  const [groupName, setGroupName] = useState(initialGroup ? initialGroup.name : 'Weekend Trip');
  const [friendCount, setFriendCount] = useState(initialGroup ? initialGroup.friends.length : 4);
  const [friends, setFriends] = useState(
    initialGroup
      ? initialGroup.friends.map(f => ({ ...f }))
      : [
          { id: 'f-' + Date.now() + '-1', name: 'You', color: AVATAR_COLORS[0] },
          { id: 'f-' + Date.now() + '-2', name: 'Friend 2', color: AVATAR_COLORS[1] },
          { id: 'f-' + Date.now() + '-3', name: 'Friend 3', color: AVATAR_COLORS[2] },
          { id: 'f-' + Date.now() + '-4', name: 'Friend 4', color: AVATAR_COLORS[3] },
        ]
  );

  if (!isOpen) return null;

  const handleCountChange = (count) => {
    const newCount = Math.max(2, Math.min(20, count));
    setFriendCount(newCount);

    setFriends(prev => {
      const updated = [...prev];
      if (newCount > prev.length) {
        for (let i = prev.length; i < newCount; i++) {
          updated.push({
            id: 'f-' + Date.now() + '-' + (i + 1),
            name: `Friend ${i + 1}`,
            color: AVATAR_COLORS[i % AVATAR_COLORS.length]
          });
        }
      } else if (newCount < prev.length) {
        return updated.slice(0, newCount);
      }
      return updated;
    });
  };

  const handleNameChange = (index, name) => {
    setFriends(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], name };
      return copy;
    });
  };

  const addCustomFriend = () => {
    const nextIdx = friends.length;
    setFriends(prev => [
      ...prev,
      {
        id: 'f-' + Date.now() + '-' + (nextIdx + 1),
        name: `Friend ${nextIdx + 1}`,
        color: AVATAR_COLORS[nextIdx % AVATAR_COLORS.length]
      }
    ]);
    setFriendCount(friends.length + 1);
  };

  const removeFriend = (index) => {
    if (friends.length <= 2) {
      alert('A group must have at least 2 friends.');
      return;
    }
    const updated = friends.filter((_, i) => i !== index);
    setFriends(updated);
    setFriendCount(updated.length);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = groupName.trim() || 'My Friends Group';
    const cleanFriends = friends.map((f, i) => ({
      ...f,
      name: f.name.trim() || `Friend ${i + 1}`,
      color: f.color || AVATAR_COLORS[i % AVATAR_COLORS.length]
    }));

    onSaveGroup({
      name: cleanName,
      friends: cleanFriends,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isEditing ? 'Edit Friends & Group' : 'Create New Group / Trip'}
              </h2>
              <p className="text-xs text-slate-400">
                Set how many friends and input their names
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Group Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Group / Trip Name
            </label>
            <input
              type="text"
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Goa Trip, Flatmates, Friday Dinner"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition"
            />
          </div>

          {/* Number of Friends Stepper */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Number of Friends
            </label>
            <div className="flex items-center space-x-3">
              {[2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleCountChange(num)}
                  className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition border ${
                    friendCount === num
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {num}
                </button>
              ))}
              <div className="flex items-center bg-slate-800/60 border border-slate-700 rounded-xl px-2 py-1">
                <input
                  type="number"
                  min="2"
                  max="25"
                  value={friendCount}
                  onChange={(e) => handleCountChange(parseInt(e.target.value) || 2)}
                  className="w-12 bg-transparent text-center text-white font-bold text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Friends Name Input List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Friends' Names ({friends.length})
              </label>
              <button
                type="button"
                onClick={addCustomFriend}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add another</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {friends.map((friend, idx) => (
                <div
                  key={friend.id || idx}
                  className="flex items-center space-x-3 bg-slate-800/40 p-2.5 rounded-2xl border border-slate-800"
                >
                  <div
                    className={`w-9 h-9 rounded-xl ${friend.color || AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0`}
                  >
                    {(friend.name.trim() || '?')[0].toUpperCase()}
                  </div>

                  <input
                    type="text"
                    required
                    value={friend.name}
                    onChange={(e) => handleNameChange(idx, e.target.value)}
                    placeholder={`Friend ${idx + 1}`}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  {friends.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeFriend(idx)}
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                      title="Remove friend"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-500/25 transition flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{isEditing ? 'Save Changes' : 'Start Splitting with This Group'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
