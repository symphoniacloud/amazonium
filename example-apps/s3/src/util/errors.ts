export function throwFunction(message?: string) {
  return () => {
    throw new Error(message)
  }
}
