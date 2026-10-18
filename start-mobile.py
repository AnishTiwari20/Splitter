#!/usr/bin/env python3
"""
Splitter Real-Time Mobile & Internet Server
Launches the minimal, collaborative Splitter app.
"""

import os
import sys
import socket
import subprocess
import webbrowser
import time

def get_local_ip():
    """Detect local Wi-Fi / LAN IP address"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    local_ip = get_local_ip()
    port = 3000

    print("=" * 65)
    print("  💸 SPLITTER - REAL-TIME EXPENSE SPLITTER")
    print("=" * 65)
    print()
    print("  📱 OPEN ON YOUR SMARTPHONE (SAME WI-FI):")
    print(f"     👉 http://{local_ip}:{port}")
    print()
    print("  💻 OPEN ON THIS PC:")
    print(f"     👉 http://localhost:{port}")
    print()
    print("  ⚡ REAL-TIME SYNC:")
    print("     Whenever you or your friend adds an expense or clears it,")
    print("     it syncs instantly across all connected phones!")
    print()
    print("  📲 HOW TO INSTALL ON PHONE LIKE AN APP:")
    print("     • Android Chrome: Tap ⋮ menu ➔ 'Install app' / 'Add to Home screen'")
    print("     • iPhone Safari: Tap Share ➔ 'Add to Home Screen'")
    print()
    print("=" * 65)
    print("Starting real-time server... Press Ctrl+C to stop.")
    print("=" * 65)
    print()

    # Automatically launch browser on PC
    try:
        webbrowser.open(f"http://localhost:{port}")
    except Exception:
        pass

    # Run Node server
    cmd = ["node", "server.js"]
    if sys.platform == "win32":
        subprocess.run(cmd, shell=True)
    else:
        subprocess.run(cmd)

if __name__ == "__main__":
    main()
