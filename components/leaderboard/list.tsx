"use client"

import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { checksumAddress, isAddress } from "viem"

import { DroplistItem } from "."
import { DataTable } from "../ui/data-table"
import { DataTablePagination } from "../ui/data-table-pagination"
import { Link } from "../ui/link"
import { ScrollArea, ScrollBar } from "../ui/scroll-area"

export function LeaderboardList({ droplist }: { droplist: DroplistItem[] }) {
  const columns: ColumnDef<DroplistItem>[] = [
    {
      header: "#",
      cell: ({ row }) => <span>{row.index + 1}</span>,
    },
    {
      header: "Address",
      cell: ({ row }) => (
        <Link
          href={`https://etherscan.io/address/${row.original.address}`}
          target="_blank"
        >
          {isAddress(row.original.address)
            ? checksumAddress(row.original.address, 1)
            : row.original.address}
        </Link>
      ),
    },
    {
      header: "X",
      cell: ({ row }) => (
        <Link href={`https://x.com/${row.original.x}`} target="_blank">
          @{row.original.x}
        </Link>
      ),
    },
    {
      header: "Date",
      cell: ({ row }) => {
        const date = new Date(row.original.time)
        return (
          <span>
            {date.getDate()} Oct {date.getHours().toString().padStart(2, "0")}:
            {date.getMinutes().toString().padStart(2, "0")}
          </span>
        )
      },
    },
  ]
  const table = useReactTable({
    columns: columns,
    data: droplist,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className="hidden flex-col gap-3 md:flex">
      <span className="text-3xl">Whitelisting stats</span>
      <div className="flex-col gap-1">
        <ScrollArea className="w-full">
          <DataTable table={table} />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <DataTablePagination table={table} />
      </div>
    </div>
  )
}
