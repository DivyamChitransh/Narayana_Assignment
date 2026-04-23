import { createFileRoute } from '@tanstack/react-router'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'

export const Route = createFileRoute('/')({ component: App })

type OrderItem = {
  id: number
  itemText: string
  position: number
}

type Order = {
  id: number
  legacyOrderId: string
  customerName: string | null
  customerPhone: string | null
  tableNumber: string | null
  waiterName: string | null
  waiterPhone: string | null
  orderDateIso: string | null
  orderDateEpochMs: number | null
  status: string | null
  priceCents: number | null
  rawOrderId: string
  rawOrderDate: string | null
  rawStatus: string | null
  rawMetadata: string | null
  rawPrice: string | null
  rawFoodItems: string | null
  metadataJson: string | null
  metadataText: string | null
  createdAt: string
  updatedAt: string
  items: OrderItem[]
}

type OrderPage = {
  items: Order[]
  nextCursor: string | null
  hasMore: boolean
}

const API_BASE = 'http://localhost:3001'

function App() {
  const [rows, setRows] = useState<Order[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  const columnHelper = createColumnHelper<Order>()
  const columns = useMemo(
    () => [
      columnHelper.accessor('id', { header: 'ID' }),
      columnHelper.accessor('legacyOrderId', { header: 'Order ID' }),
      columnHelper.accessor('customerName', {
        header: 'Customer',
        cell: (info) => info.getValue() ?? '-',
      }),
      columnHelper.accessor('tableNumber', {
        header: 'Table',
        cell: (info) => info.getValue() ?? '-',
      }),
      columnHelper.accessor('waiterName', {
        header: 'Waiter',
        cell: (info) => info.getValue() ?? '-',
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => info.getValue() ?? '-',
      }),
      columnHelper.accessor('priceCents', {
        header: 'Price',
        cell: (info) =>
          info.getValue() === null ? '-' : `$${(info.getValue()! / 100).toFixed(2)}`,
      }),
      columnHelper.accessor((row) => row.items.length, {
        id: 'itemCount',
        header: 'Items',
      }),
    ],
    [columnHelper],
  )

  const table = useReactTable({
    data: rows,
    columns,
    defaultColumn: {
      cell: (info) => {
        const value = info.getValue()
        if (value === null || value === undefined || value === '') return '-'
        return String(value)
      },
    },
    getCoreRowModel: getCoreRowModel(),
  })

  const loadOrders = async (cursor?: string | null) => {
    setLoading(true)
    setError(null)
    try {
      const url = new URL('/orders', API_BASE)
      url.searchParams.set('limit', '20')
      if (cursor) {
        url.searchParams.set('cursor', cursor)
      }
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      const payload = (await response.json()) as OrderPage
      setRows((prev) => (cursor ? [...prev, ...payload.items] : payload.items))
      setNextCursor(payload.nextCursor)
      setHasMore(payload.hasMore)
      setInitialized(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialized && !loading) {
      void loadOrders(null)
    }
  }, [initialized, loading])

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="island-kicker">Operations</p>
            <h1 className="text-2xl font-bold text-[var(--sea-ink)]">Orders</h1>
          </div>
          <button
            type="button"
            onClick={() => void loadOrders(null)}
            className="rounded-lg border border-[rgba(23,58,64,0.2)] bg-white/60 px-3 py-2 text-sm"
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="border-b px-3 py-2 font-semibold">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void loadOrders(nextCursor)}
            className="rounded-lg border border-[rgba(23,58,64,0.2)] bg-white/60 px-3 py-2 text-sm"
            disabled={loading || !hasMore || !nextCursor}
          >
            {loading ? 'Loading...' : hasMore ? 'Load more' : 'No more orders'}
          </button>
          <span className="text-xs text-[var(--sea-ink-soft)]">{rows.length} loaded</span>
        </div>
      </section>
    </main>
  )
}
