/*
|--------------------------------------------------------------------------
| Password Hashing & Verification Utilities
|--------------------------------------------------------------------------
|
| CONTEXT:
| --------
| These utilities implement a secure password-handling strategy using
| PBKDF2 with SHA-256, designed for environments like Cloudflare Workers.
|
| Passwords are NEVER stored or compared directly.
|
| FLOW OVERVIEW:
| 1. During signup:
|    - A random salt is generated.
|    - The password is encoded to bytes.
|    - PBKDF2 derives a slow hash using the salt.
|    - The result is stored as: "salt:hash" (hex encoded).
|
| 2. During login:
|    - The stored salt is extracted.
|    - The entered password is hashed again using the SAME parameters.
|    - The newly derived hash is compared to the stored hash
|      using a constant-time comparison to prevent timing attacks.
|
| SECURITY PROPERTIES:
| - Resistant to brute-force attacks
| - Resistant to rainbow-table attacks
| - Resistant to timing attacks
| - Compatible with Cloudflare Workers & Hono
|
|--------------------------------------------------------------------------
*/




/*
|--------------------------------------------------------------------------
| hashPassword
|--------------------------------------------------------------------------
|
| PURPOSE:
| --------
| Securely hashes a plaintext password for storage.
|
| HOW IT WORKS:
| -------------
| - Generates a cryptographically secure random salt.
| - Encodes the password into bytes.
| - Uses PBKDF2 with a high iteration count to derive a hash.
| - Converts both salt and hash to hex for safe database storage.
|
| RETURNS:
| --------
| A string in the format:
|   "<saltHex>:<hashHex>"
|
| This value is safe to store in a database.
|
|--------------------------------------------------------------------------
*/
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const enc = new TextEncoder();
  const passwordBytes = enc.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 310000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  const saltHex = Array.from(salt)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return `${saltHex}:${hashHex}`;
}


/*
|--------------------------------------------------------------------------
| verifyPassword
|--------------------------------------------------------------------------
|
| PURPOSE:
| --------
| Verifies whether a plaintext password matches a previously
| stored password hash.
|
| HOW IT WORKS:
| -------------
| - Extracts the salt and hash from stored data.
| - Re-hashes the entered password using the same salt and parameters.
| - Compares the computed hash with the stored hash using
|   a constant-time comparison to prevent timing attacks.
|
| RETURNS:
| --------
| - true  → password is valid
| - false → password is invalid
|
|--------------------------------------------------------------------------
*/
async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");

  const salt = new Uint8Array(
    saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16))
  );

  const enc = new TextEncoder();
  const passwordBytes = enc.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 310000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  const storedHashBytes = new Uint8Array(
    hashHex.match(/.{2}/g)!.map(b => parseInt(b, 16))
  );

  return constantTimeEqual(
    new Uint8Array(derivedBits),
    storedHashBytes
  );
}


/*
|--------------------------------------------------------------------------
| constantTimeEqual
|--------------------------------------------------------------------------
|
| PURPOSE:
| --------
| Compares two byte arrays in constant time.
|
| WHY THIS MATTERS:
| -----------------
| Normal comparisons may exit early on mismatch, leaking timing
| information that attackers can exploit.
|
| This function ensures:
| - Every byte is always compared
| - Execution time does not depend on input values
|
| RETURNS:
| --------
| - true  → arrays are identical
| - false → arrays differ
|
|--------------------------------------------------------------------------
*/
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}
