export function arrayToObject<
  T extends { [K1 in K]: string | number },
  K extends keyof T,
>(array: T[], key: K): { [P in T[K]]: Omit<T, K> } {
  return array.reduce(
    (acc, obj) => {
      const { [key]: keyValue, ...rest } = obj
      acc[keyValue as T[K]] = rest
      return acc
    },
    {} as { [P in T[K]]: Omit<T, K> }
  )
}

export function arrayToIndexObject<T>(array: T[]): { [index: number]: T } {
  return array.reduce(
    (acc, obj, i) => {
      acc[i] = obj
      return acc
    },
    {} as { [index: number]: T }
  )
}
