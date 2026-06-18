import uvicorn
from fastapi import FastAPI
import socket
import builtins

_orig_socket = socket.socket

class MySocket(_orig_socket):
    def setsockopt(self, level, optname, value):
        print(f"[DEBUG] setsockopt: level={level}, optname={optname}, value={value}")
        super().setsockopt(level, optname, value)
    
    def bind(self, address):
        print(f"[DEBUG] bind: address={address}")
        try:
            super().bind(address)
            print(f"[DEBUG] bind SUCCESS: {address}")
        except Exception as e:
            print(f"[DEBUG] bind FAILED: {address} -> {e}")
            raise

socket.socket = MySocket

app = FastAPI()


if __name__ == "__main__":
    uvicorn.run(app, host="::1", port=8005)
