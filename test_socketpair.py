import socket
import os
import traceback

def monkey_patch():
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
                
                print(f"Monkeypatch bound to port {port}")
                csock = socket.socket(family, type, proto)
                csock.setblocking(False)
                try:
                    csock.connect(lsock.getsockname())
                except (BlockingIOError, InterruptedError):
                    pass
                except Exception as e:
                    print(f"Exception during csock.connect: {e}")
                    raise
                
                ssock, _ = lsock.accept()
                csock.setblocking(True)
                return (ssock, csock)
            finally:
                lsock.close()
        socket.socketpair = _custom_socketpair
        socket._patched = True

if __name__ == "__main__":
    print("Testing STANDARD socket.socketpair()...")
    try:
        s1, s2 = socket.socketpair()
        print("STANDARD SUCCEEDED.")
        s1.close()
        s2.close()
    except Exception as e:
        print(f"STANDARD FAILED: {e}")
        traceback.print_exc()

    print("Testing MONKEYPATCH socketpair()...")
    monkey_patch()
    try:
        s1, s2 = socket.socketpair()
        print("MONKEYPATCH SUCCEEDED.")
        s1.close()
        s2.close()
    except Exception as e:
        print(f"MONKEYPATCH FAILED: {e}")
        traceback.print_exc()

    print("Testing asyncio event loop creation...")
    import asyncio
    try:
        loop = asyncio.ProactorEventLoop()
        print("asyncio loop created successfully.")
        loop.close()
    except Exception as e:
        print(f"asyncio loop creation FAILED: {e}")
        traceback.print_exc()
