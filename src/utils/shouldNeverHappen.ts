export default function shouldNeverHappen(message?: string): never {
  throw new Error(`This should never happen. ${message ?? ''}`);
}
