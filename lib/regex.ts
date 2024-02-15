const addressRegex = "^0x[a-fA-F0-9]{40}$"
const emptyRegex = "^$"

export const validAddress = new RegExp(addressRegex)
export const validAddressOrEmpty = new RegExp(`${emptyRegex}|${addressRegex}`)
