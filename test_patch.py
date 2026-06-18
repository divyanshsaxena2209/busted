import socket

def my_patch(*args, **kwargs):
    print("PATCH CALLED")
    return socket._original_socketpair(*args, **kwargs)

socket._original_socketpair = socket.socketpair
socket.socketpair = my_patch

import asyncio
from asyncio.proactor_events import BaseProactorEventLoop

class Dummy(BaseProactorEventLoop):
    def __init__(self):
        self._make_self_pipe()

try:
    Dummy()
except Exception as e:
    print(e)
