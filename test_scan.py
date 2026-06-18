import socket

def test_port(port):
    s = socket.socket()
    try:
        s.bind(('127.0.0.1', port))
        s.listen(1)
        s.close()
        return True
    except Exception as e:
        s.close()
        return False

success_ports = []
for p in range(8000, 9000):
    if test_port(p):
        success_ports.append(p)

print(f"Found {len(success_ports)} successful ports.")
if success_ports:
    print(f"First 10: {success_ports[:10]}")
