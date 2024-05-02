import { useEffect, useState } from "react"
import { Task } from "@/openrd-indexer/types/tasks"
import { replacer } from "@/openrd-indexer/utils/json"
import axios from "axios"

import { GetPriceRequest, GetPriceResponse } from "@/app/api/getPrice/route"

export function usePrice({ chainId, task }: { chainId: number; task?: Task }) {
  const [price, setPrice] = useState<number | undefined>(undefined)
  useEffect(() => {
    const getPrice = async () => {
      if (!task) {
        setPrice(undefined)
        return
      }

      const request: GetPriceRequest = {
        chainId: chainId,
        nativeBudget: task.nativeBudget,
        budget: task.budget,
      }
      const newPrice = await axios
        .post("/api/getPrice", JSON.parse(JSON.stringify(request, replacer)))
        .then((res) => res.data as GetPriceResponse)
        .then((res) => res.price)
        .catch((err) => {
          console.error(err)
          return undefined
        })
      setPrice(newPrice)
    }

    getPrice().catch(console.error)
  }, [chainId, task])
  return price
}
