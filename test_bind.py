import socket

def test_bind(host, port):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            s.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        s.bind((host, port))
        s.listen(1)
        s.close()
        return True, ""
    except Exception as e:
        return False, str(e)

if __name__ == "__main__":
    for port in [41944, 8000, 8080]:
        ok, err = test_bind("127.0.0.1", port)
        status = "SUCCESS" if ok else f"FAILED ({err})"
        print(f"Port {port}: {status}")
