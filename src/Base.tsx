// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assert(predicate: any, message?: string): void {
  if (!predicate) {
    throw new Error(message ?? 'This should never happen.');
  }
}

export function assertNotReached(message?: string): void {
  assert(false, message);
}

export function defined<T>(variable: T | undefined): T {
  if (variable === undefined) {
    throw new Error('This should never happen.');
  }
  return variable;
}
