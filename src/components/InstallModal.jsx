import React, { useState, useEffect } from 'react';
import { X, Smartphone, Download, WifiOff, CheckCircle2, Globe, Share2, HelpCircle } from 'lucide-react';

export default function InstallModal({ isOpen, onClose }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('To install, use your mobile browser menu:\n\n• On Android Chrome: Tap ⋮ menu ➔ "Install app" / "Add to Home screen"\n• On iPhone Safari: Tap Share button ➔ "Add to Home Screen"');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Use on Smartphone & Offline</h2>
              <p className="text-xs text-slate-400">How to install & keep it on your phone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Offline Capability Card */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex items-start space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-300">
                100% Offline Capability (PWA)
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                This app uses Progressive Web App technology and a local Service Worker. All data is saved directly on your phone in local storage. Once opened or installed, you can use it anytime anywhere without an active internet connection!
              </p>
            </div>
          </div>

          {/* Quick Install Action if available */}
          {deferredPrompt && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Install Splitter App Now</span>
            </button>
          )}

          {/* Step by step for Android & iOS */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Installation Instructions
            </h4>

            {/* Android */}
            <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center space-x-2 text-white font-semibold text-xs">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                  A
                </span>
                <span>On Android (Google Chrome)</span>
              </div>
              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside pl-1">
                <li>Open the app URL in <strong>Google Chrome</strong>.</li>
                <li>Tap the <strong>three dots menu (⋮)</strong> in the top right.</li>
                <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                <li>The app icon will appear on your phone home screen just like an APK!</li>
              </ol>
            </div>

            {/* iPhone */}
            <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center space-x-2 text-white font-semibold text-xs">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">
                  i
                </span>
                <span>On iPhone (Apple Safari)</span>
              </div>
              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside pl-1">
                <li>Open the app URL in <strong>Safari</strong>.</li>
                <li>Tap the <strong>Share button</strong> (square with arrow pointing up).</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                <li>Tap <strong>Add</strong> in the top right corner.</li>
              </ol>
            </div>

            {/* How to open on phone from this computer */}
            <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center space-x-2 text-white font-semibold text-xs">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>Opening from your phone right now (Local Wi-Fi)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Make sure your phone is connected to the same Wi-Fi as your PC. Run the included <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300">python start-mobile.py</code> or open your PC's local IP address (e.g. <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300">http://192.168.x.x:5173</code>) in your mobile browser.
              </p>
              <p className="text-xs text-slate-400">
                💡 <em>Bonus: You can also deploy this free to GitHub Pages or Vercel with 1 click so your friends can use it anywhere even when your PC is turned off!</em>
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
