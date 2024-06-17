export default function groupBy<T, K extends keyof any>(
  array: T[],
  getKey: (item: T) => K,
) {
  const map = new Map<K, T[]>();
  array.forEach((item) => {
    const key = getKey(item);
    const collection = map.get(key);
    if (collection == null) {
      map.set(key, [item]);
    } else {
      collection.push(item);
    }
  });
  return map;
}

export function singleOrDefault<T>(array: T[]): T | null {
  if (array.length === 1) {
    return array[0];
  }

  if (array.length === 0) {
    return null;
  }

  throw new Error('The array contains more than one element.');
}
