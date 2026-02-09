import os

file_path = 'src/server/auth.ts'
search_block = """  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    key,
    256
  );"""

replace_block = """  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    key,
    256
  );"""

with open(file_path, 'r') as f:
    content = f.read()

if search_block in content:
    new_content = content.replace(search_block, replace_block)
    with open(file_path, 'w') as f:
        f.write(new_content)
    print("Successfully fixed auth type error.")
else:
    print("Search block not found. Check indentation or file content.")
    # Debugging: print a snippet where it should be
    start_idx = content.find("const bits = await crypto.subtle.deriveBits")
    if start_idx != -1:
        print("Found 'deriveBits' at index", start_idx)
        print("Surrounding content:")
        print(content[start_idx:start_idx+200])
    else:
        print("Could not find 'deriveBits'")
