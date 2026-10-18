import React, { useRef } from 'react';
import { X, Download, Upload, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { exportBackupJSON, INITIAL_DATA } from '../utils/storage';

export default function ExportModal({
  isOpen,
  onClose,
  appData,
  onImportData,
  onResetData,
}) {
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result);
        if (parsed && Array.isArray(parsed.groups)) {
          onImportData(parsed);
          alert('Backup restored successfully!');
          onClose();
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Could not read JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div>
            <h2 className="text-xl font-bold text-white">Data & Backup</h2>
            <p className="text-xs text-slate-400">Save or transfer your splits</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          
          {/* Download JSON Backup */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-white">Export Backup File</h4>
              <p className="text-xs text-slate-400 mt-0.5">Download JSON file with all trips & splits</p>
            </div>
            <button
              type="button"
              onClick={() => exportBackupJSON(appData)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow transition flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>

          {/* Import JSON Backup */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-white">Import Backup File</h4>
              <p className="text-xs text-slate-400 mt-0.5">Restore data from another smartphone or PC</p>
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5"
              >
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>Import</span>
              </button>
            </div>
          </div>

          {/* Reset App */}
          <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-rose-300">Reset Demo Data</h4>
              <p className="text-xs text-slate-400 mt-0.5">Restore initial sample expenses</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm('Reset to initial sample data? Current unsaved custom data will be cleared.')) {
                  onResetData();
                  onClose();
                }
              }}
              className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
