export default function unreachableError(message?: string): never {
  throw new Error(`Unreachable code${message ? `: ${message}` : '.'}`);
}
