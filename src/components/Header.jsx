import React from 'react';
import { 
  Users, 
  Smartphone, 
  Plus, 
  ChevronDown, 
  Download, 
  Settings, 
  Coins,
  Wifi,
  Share2
} from 'lucide-react';
import { CURRENCIES } from '../types';

export default function Header({
  groups,
  activeGroup,
  onSelectGroup,
  onOpenNewGroup,
  onOpenEditGroup,
  onOpenInstall,
  currency,
  onChangeCurrency,
  onOpenExport,
}) {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        
        {/* Left: Logo & Group Switcher */}
        <div className="flex items-center space-x-3">
          {/* App Logo */}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20 flex-shrink-0 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <span className="text-xl">💸</span>
            </div>
          </div>

          {/* Group Picker Dropdown */}
          <div className="relative group">
            <div className="flex items-center space-x-1.5 cursor-pointer">
              <h1 className="text-base font-bold text-white tracking-tight flex items-center space-x-1">
                <span>{activeGroup?.name || 'Splitter'}</span>
              </h1>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition" />
            </div>
            
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
              <span>{activeGroup?.friends?.length || 0} friends</span>
              <span>•</span>
              <button
                type="button"
                onClick={onOpenEditGroup}
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Edit Friends
              </button>
            </div>

            {/* Dropdown Menu */}
            <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Switch Group / Trip
              </div>
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onSelectGroup(g.id)}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition ${
                    g.id === activeGroup?.id
                      ? 'bg-indigo-600/20 text-indigo-400 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="truncate">{g.name}</span>
                  <span className="text-[10px] text-slate-500">{g.friends?.length} friends</span>
                </button>
              ))}

              <div className="border-t border-slate-800 mt-1 pt-1">
                <button
                  type="button"
                  onClick={onOpenNewGroup}
                  className="w-full text-left px-3.5 py-2 text-xs text-indigo-400 hover:bg-slate-800 font-medium flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Group / Trip</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Currency Selector & Install on Mobile Button */}
        <div className="flex items-center space-x-2">
          {/* Currency Selector */}
          <select
            value={currency}
            onChange={(e) => onChangeCurrency(e.target.value)}
            className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-2 py-1.5 text-xs text-slate-300 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            title="Change currency"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.symbol}>
                {c.symbol} ({c.code})
              </option>
            ))}
          </select>

          {/* Smartphone PWA Button */}
          <button
            type="button"
            onClick={onOpenInstall}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 hover:from-indigo-500/20 hover:to-emerald-500/20 border border-indigo-500/30 text-indigo-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-medium transition shadow-sm"
            title="How to install on phone & offline"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Phone & Offline</span>
          </button>

          {/* Backup / Export Button */}
          <button
            type="button"
            onClick={onOpenExport}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Export / Backup data"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
