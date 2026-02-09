import os

file_path = 'src/server/auth.ts'
search_block = """async function subtleDigest(data: Uint8Array) {
  return crypto.subtle.digest("SHA-256", data);
}"""

replace_block = """async function subtleDigest(data: Uint8Array) {
  return crypto.subtle.digest("SHA-256", data as unknown as BufferSource);
}"""

with open(file_path, 'r') as f:
    content = f.read()

if search_block in content:
    new_content = content.replace(search_block, replace_block)
    with open(file_path, 'w') as f:
        f.write(new_content)
    print("Successfully fixed digest type error.")
else:
    print("Search block not found.")
