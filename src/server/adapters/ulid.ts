// Minimal ULID-like ID generator (no external dep)
// Outputs: 26-char alphanumeric string prefixed with "msg_" or "toolu_"

const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TIME_LEN = 10;
const RANDOM_LEN = 16;

function randomChars(len: number): string {
  let result = "";
  const buf = new Uint8Array(len);
  // Use Math.random as fallback (crypto.getRandomValues may not be available in all contexts)
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < len; i++) {
      buf[i] = Math.floor(Math.random() * 256);
    }
  }
  for (let i = 0; i < len; i++) {
    result += ENCODING[buf[i] % ENCODING.length];
  }
  return result;
}

export function ulid(): string {
  const timeChars = randomChars(TIME_LEN);
  const randChars = randomChars(RANDOM_LEN);
  return timeChars + randChars;
}
