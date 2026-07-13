export function stripEmpty<T extends object>(payload: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ) as Partial<T>
}

export function mergeDefined<T extends object>(base: T, patch: Partial<T>): T {
  return { ...base, ...stripEmpty(patch) } as T
}
