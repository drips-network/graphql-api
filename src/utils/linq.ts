export default function groupBy<T, K extends keyof any>(
  array: T[],
  getKey: (item: T) => K,
): Map<K, T[]> {
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
