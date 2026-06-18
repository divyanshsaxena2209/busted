import asyncio
import socket
import builtins

_orig_socket = socket.socket

class MySocket(_orig_socket):
    def setsockopt(self, level, optname, value):
        if optname == socket.SO_EXCLUSIVEADDRUSE:
            print(f"[DEBUG] IGNORING setsockopt: SO_EXCLUSIVEADDRUSE")
            return
        super().setsockopt(level, optname, value)
    
    def bind(self, address):
        print(f"[DEBUG] bind: address={address}")
        try:
            super().bind(address)
            print(f"[DEBUG] bind SUCCESS: {address}")
        except Exception as e:
            print(f"[DEBUG] bind FAILED: {address} -> {e}")
            raise

    def listen(self, backlog=None):
        print(f"[DEBUG] listen: backlog={backlog}")
        try:
            if backlog is None:
                super().listen()
            else:
                super().listen(backlog)
            print(f"[DEBUG] listen SUCCESS")
        except Exception as e:
            print(f"[DEBUG] listen FAILED: {e}")
            raise

socket.socket = MySocket

async def main():
    loop = asyncio.get_event_loop()
    try:
        server = await loop.create_server(asyncio.Protocol, host='127.0.0.1', port=8002)
        print("create_server succeeded on 8002!")
        server.close()
        await server.wait_closed()
    except Exception as e:
        print(f"create_server failed on 8002: {repr(e)}")

asyncio.run(main())
