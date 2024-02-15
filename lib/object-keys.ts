import { Address, isAddress } from "viem"

export function objectKeysAddress(obj: object): Address[] {
  return Object.keys(obj).map((item) => {
    if (!isAddress(item)) {
      throw new Error(`Object key was not address ${item}`)
    }
    return item
  })
}

export function objectKeysInt(obj: object): number[] {
  return Object.keys(obj).map((item) => {
    const itemAsNumber = parseInt(item)
    if (Number.isNaN(itemAsNumber)) {
      throw new Error(`Object key was not int ${item}`)
    }
    return itemAsNumber
  })
}
