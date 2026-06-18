import socket
import uvicorn
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}

if __name__ == "__main__":
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(('127.0.0.1', 8081))
    sock.set_inheritable(True)
    
    config = uvicorn.Config(app=app, fd=sock.fileno(), log_level="info")
    server = uvicorn.Server(config)
    server.run()
