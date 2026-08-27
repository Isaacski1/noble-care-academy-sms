with open("server/server.js", "rb") as f:
    content = f.read()
old = b"error: 'Invalid login credentials. Please verify the phone number and your child\x27s Date of Birth.'"
new = b'error: "Invalid login credentials. Please verify the phone number and your child\x27s Date of Birth."'
content = content.replace(old, new)
with open("server/server.js", "wb") as f:
    f.write(content)
print("Fixed")
