import os
import subprocess
import time
import sys
import asyncio
import socket

# --- MONKEYPATCH FOR WINERROR 10013 ---
if os.name == 'nt' and not hasattr(socket, '_patched'):
    def _custom_socketpair(family=socket.AF_INET, type=socket.SOCK_STREAM, proto=0):
        try:
            port = 58000
            for _ in range(1000):
                lsock = socket.socket(family, type, proto)
                try:
                    lsock.bind(('127.0.0.1', port))
                    lsock.listen()
                    break
                except OSError:
                    port += 1
                    lsock.close()
                    continue
            else:
                raise OSError("Could not find a free port for socketpair")
            
            csock = socket.socket(family, type, proto)
            csock.setblocking(False)
            try:
                csock.connect(lsock.getsockname())
            except (BlockingIOError, InterruptedError):
                pass
            ssock, _ = lsock.accept()
            csock.setblocking(True)
            return (ssock, csock)
        finally:
            lsock.close()
    
    socket.socketpair = _custom_socketpair
    socket._patched = True
# --------------------------------------

import uvicorn

def kill_zombies():
    try:
        result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True)
        for line in result.stdout.splitlines():
            if ":8005" in line and 'LISTENING' in line:
                parts = line.strip().split()
                if len(parts) >= 5:
                    pid = parts[-1]
                    print(f"Killing hanging process (PID: {pid}) on port 8005", flush=True)
                    subprocess.run(['taskkill', '/F', '/PID', pid], capture_output=True)
    except Exception:
        pass

if __name__ == "__main__":
    max_retries = 10
    for i in range(max_retries):
        try:
            kill_zombies()
            print(f"Starting AI backend (Attempt {i+1}/{max_retries})...", flush=True)
            
            # Start uvicorn directly
            uvicorn.run("main:app", host="::1", port=8005, log_level="info")
            
            print("AI backend stopped gracefully.", flush=True)
            break
        except KeyboardInterrupt:
            print("Shutting down AI backend...")
            break
        except Exception as e:
            print(f"Warning: AI backend crashed: {e}. Retrying in 2 seconds...")
            time.sleep(2)
