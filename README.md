# 💸 Splitter — Smart Friends Expense Splitter (PWA)

A mobile-first expense splitting application built for friends. Solves real-world messy split scenarios (e.g. *one friend pays ₹100 for food, but only 3 ate and 1 didn't*), supports selective participants, calculates minimal settlements, and works **100% offline on your smartphone like a native app**.

---

## 🌟 Key Features

### 1. 👥 Flexible Friends & Group Management
- Input any number of friends and custom names (e.g., *You, Rahul, Priya, Aman*).
- Distinct color-coded avatars.
- Support for multiple groups/trips (e.g., *Goa Trip, Flatmates, Friday Dinner*).

### 2. 🍕 Smart Payment & Selective Splitting
- **The "3 ate, 1 didn't eat" problem solved**:
  - Simply uncheck the friend who didn't participate.
  - Automatically splits the bill equally among only the people who ate (e.g., ₹33.33 each for 3 people, ₹0 for the 4th).
- **Multiple Split Modes**:
  - **Equal (with Custom Selection)**: Pick exactly who participated.
  - **Exact Amounts**: Enter custom ₹ amounts for each person.
  - **Shares / Ratios**: Split by weights (e.g., 2 shares vs 1 share).
  - **Percentages**: Specify exact % per person.
- **Payment Details**: Record amount, description/reason, category (Food 🍕, Travel 🚗, Stay 🏠, Drinks 🍹, Entertainment 🎟️, Shopping 🛍️, Groceries 🛒, Other 📦), date, payer, and optional notes.

### 3. 🏁 "Clear Table" & Settlement Checkpoints
- **Clear the Table / Mark All Settled**:
  - When everyone squares up or a trip ends, tap **"Clear Table & Mark Split Done"**.
  - Creates a **Settlement Checkpoint** that archives all current expenses into history and resets balances back to **₹0.00**.
  - Launches celebratory confetti!
  - **Settled History**: View past cleared checkpoints at any time, with an "Undo / Restore" option in case it was cleared by accident.
- **Direct Payments**: Record individual settlements (e.g., *Priya paid Rahul ₹50*).

### 4. ⚖️ Min-Cash-Flow Debt Simplification
- Automatically computes "Who Owes Whom" using a greedy minimization algorithm.
- Instead of everyone paying back and forth in multiple transactions, it condenses debts into the minimum number of payments.

### 5. 📊 Analytics & WhatsApp Sharing
- Total group spending and average per person.
- Visual category spending bars.
- Paid vs. Consumed breakdown per friend.
- **One-Click "Copy for WhatsApp"**: Generates a cleanly formatted text summary ready to paste into your friends' WhatsApp group.

### 6. 📱 100% Offline Smartphone Experience (PWA)
- Built as an installable **Progressive Web App (PWA)** with a Service Worker.
- Saves all data safely in your smartphone's `localStorage`.
- Works without internet connection once loaded or installed!

---

## 🚀 How to Run and Open on Your Smartphone

### Quick Launch on Windows:
1. Double-click **`start.bat`** (or open a terminal and run `python start-mobile.py`).
2. It will display your computer's local Wi-Fi IP address:
   ```
   📱 Open on your smartphone (connected to the same Wi-Fi):
      👉 http://<YOUR-IP>:5173
   ```
3. Open that URL on your phone's browser!

---

## 📲 How to Install as an App on Your Smartphone

### On Android (Google Chrome):
1. Open the URL in **Chrome**.
2. Tap the **three dots menu (⋮)** in the top right corner.
3. Tap **"Install app"** or **"Add to Home screen"**.
4. The Splitter icon will appear on your home screen. You can now open it full-screen and use it completely **offline**!

### On iPhone / iPad (Safari):
1. Open the URL in **Safari**.
2. Tap the **Share button** (square with arrow pointing up `⎋`).
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add** in the top right corner.

---

## ☁️ Permanent Free Hosting (Optional)
If you want to access the app anytime on 4G/5G without keeping your computer on:
1. **Vercel / Netlify**: Connect this folder or repository and deploy with 1 click (Build command: `npm run build`, Output directory: `dist`).
2. **GitHub Pages**: Push this project to GitHub and enable GitHub Pages on the `dist` folder.
Once loaded once on your phone, the Service Worker caches it so it continues to work offline forever!

---

## 🛠️ Tech Stack
- **Framework**: React 19 + Vite 8
- **Styling**: Tailwind CSS v4 (Mobile-First, Dark Theme)
- **Icons**: Lucide React
- **PWA**: Service Worker (`sw.js`) + Web App Manifest (`manifest.json`)
- **Persistence**: Browser `localStorage` (Instant auto-save) + JSON Backup Export/Import
