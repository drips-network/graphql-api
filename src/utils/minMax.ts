export default function minMax(
  mode: 'min' | 'max',
  ...args: (number | undefined)[]
) {
  const filtered: number[] = args.filter((a): a is number => a !== undefined);

  return Math[mode](...filtered);
}
