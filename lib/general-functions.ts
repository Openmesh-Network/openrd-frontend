export function timestampToDate(deadline: string) {
  const date = new Date(Number(deadline) * 1000)

  const formattedDate = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  return formattedDate
}

export function timestampToDateFormatted(timestamp: string) {
  if (!timestamp) {
    return ""
  }

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const date = new Date(Number(timestamp) * 1000)

  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()

  return `${day || ""} ${month || ""} ${year || ""}`
}

export function daysUntil(timestamp: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset time to start of the day for accurate comparison
  const targetDate = new Date(Number(timestamp) * 1000)
  const timeDifference = targetDate.getTime() - today.getTime()
  const daysDifference = timeDifference / (1000 * 3600 * 24)

  if (daysDifference > 0) {
    return `${Math.floor(daysDifference)} days left`
  } else if (daysDifference === 0) {
    return "today"
  } else {
    return "ended"
  }
}

export function statusToString(status: string) {
  if (status === "1" || status === "2" || status === "0") {
    const statusObj = {
      "0": "Open",
      "1": "Active",
      "2": "Completed",
    }
    return statusObj[status]
  }
  return ""
}

export function statusToColor(status: string) {
  if (status === "1" || status === "2" || status === "0") {
    const statusObj = {
      "0": "#12AD50",
      "1": "#0354EC",
      "2": "#000000",
    }
    return statusObj[status]
  }
  return ""
}

export function formatAddress(address: string) {
  return `${address?.slice(0, 6)}...${address?.slice(-4)}`
}
