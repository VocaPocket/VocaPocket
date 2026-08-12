export function shuffle<T>(a: T[]): T[] {
  return a
    .map((v) => [Math.random(), v] as [number, T])
    .sort((x, y) => x[0] - y[0])
    .map((x) => x[1]);
}
