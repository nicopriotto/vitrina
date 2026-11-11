"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AllCommunityModule, ModuleRegistry, colorSchemeDark, themeQuartz, type ColDef, type ICellRendererParams, type GetRowIdParams, type RowClassRules, type RowHeightParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Download, Search } from "lucide-react";
import type { ApiOrder } from "./types";

/**
 * The merchant's order book, built on AG Grid Community (MIT).
 * Sorting, column filters, quick search, pagination and CSV export come from AG Grid;
 * the cells (status, ship-to, "Mark as shipped") are React renderers.
 */

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeQuartz.withPart(colorSchemeDark).withParams({
  browserColorScheme: "dark",
  backgroundColor: "#141415",
  chromeBackgroundColor: "#141415",
  foregroundColor: "#ededed",
  headerTextColor: "#85858b",
  borderColor: "rgb(237 237 237 / 0.08)",
  accentColor: "#ff7a45",
  oddRowBackgroundColor: "#141415",
  selectedRowBackgroundColor: "rgb(255 122 69 / 0.08)",
  inputBackgroundColor: "#232325",
  fontFamily: "inherit",
  fontSize: 14,
  headerFontSize: 13,
  headerFontWeight: 400,
  spacing: 8,
  wrapperBorder: false,
  columnBorder: false,
  headerColumnBorder: false,
});

type Filter = "all" | "to-ship" | "paid" | "unpaid";
const FILTERS: { id: Filter; label: string; test: (o: ApiOrder) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "to-ship", label: "To ship", test: (o) => o.status === "PAID" && !o.shippedAt },
  { id: "paid", label: "Paid", test: (o) => o.status === "PAID" },
  { id: "unpaid", label: "Not paid", test: (o) => o.status !== "PAID" },
];

const STATUS_COLOR: Record<ApiOrder["status"], string> = { PAID: "text-pos", CREATED: "text-fg3", APPROVED: "text-warn", FAILED: "text-neg" };

function ago(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

const itemsText = (o: ApiOrder) => o.items.map((it) => `${it.quantity} × ${it.name}${it.variantLabel ? ` · ${it.variantLabel}` : ""}`).join("\n");
const shipText = (o: ApiOrder) => {
  const a = o.shipping;
  return a ? `${a.name ?? ""}, ${a.line1}, ${a.city}${a.state ? ` ${a.state}` : ""} ${a.postalCode ?? ""}`.trim() : "";
};

const rowId = (p: GetRowIdParams<ApiOrder>) => p.data.id;

/** Rows are sized from their data (20px lines, 12px padding), so long orders never clip. */
function rowHeight(o: ApiOrder, canShip: boolean) {
  const items = o.items.length * 20;
  let ship = 20;
  if (o.status === "PAID") ship = (o.shipping ? 40 : 20) + (o.shippedAt ? 28 : canShip ? 40 : 0);
  return Math.max(48, Math.max(items, ship) + 24);
}

export function OrdersGrid({ orders, fresh, onShip }: { orders: ApiOrder[]; fresh: Set<string>; onShip?: (id: string) => void }) {
  const grid = useRef<AgGridReact<ApiOrder>>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const rows = useMemo(() => orders.filter(FILTERS.find((f) => f.id === filter)!.test), [orders, filter]);

  // The page re-renders on every poll. Keep everything the grid receives stable, or AG Grid
  // would rebuild its columns each time and drop open filter popups.
  const canShip = Boolean(onShip);
  const shipRef = useRef(onShip);
  const freshRef = useRef(fresh);
  useEffect(() => {
    shipRef.current = onShip;
    freshRef.current = fresh;
  });
  const ship = useCallback((id: string) => shipRef.current?.(id), []);
  const rowClassRules = useMemo<RowClassRules<ApiOrder>>(() => ({ "vitrina-fresh-row": (p) => Boolean(p.data && freshRef.current.has(p.data.id)) }), []);
  const getRowHeight = useCallback((p: RowHeightParams<ApiOrder>) => (p.data ? rowHeight(p.data, canShip) : undefined), [canShip]);
  const defaultColDef = useMemo<ColDef<ApiOrder>>(() => ({ sortable: true, resizable: true }), []);

  const columns = useMemo<ColDef<ApiOrder>[]>(
    () => [
      { headerName: "Order", field: "id", width: 110, valueFormatter: (p) => `#${String(p.value).slice(0, 8)}`, cellClass: "font-mono text-[13px] text-fg2" },
      {
        headerName: "When",
        field: "createdAt",
        width: 110,
        sort: "desc",
        filter: "agDateColumnFilter",
        filterValueGetter: (p) => (p.data ? new Date(p.data.createdAt) : null),
        valueFormatter: (p) => ago(String(p.value)),
        cellClass: "text-fg3",
      },
      {
        headerName: "Items",
        colId: "items",
        flex: 2,
        minWidth: 200,
        valueGetter: (p) => (p.data ? itemsText(p.data) : ""),
        filter: "agTextColumnFilter",
        cellRenderer: (p: ICellRendererParams<ApiOrder>) => (
          <div className="py-3 leading-5">
            {p.data?.items.map((it, i) => (
              <div key={i} className="truncate">
                {it.quantity} × {it.name}
                {it.variantLabel && <span className="text-fg3"> · {it.variantLabel}</span>}
              </div>
            ))}
          </div>
        ),
      },
      {
        headerName: "Ship to",
        colId: "shipTo",
        flex: 2,
        minWidth: 200,
        valueGetter: (p) => (p.data ? shipText(p.data) : ""),
        filter: "agTextColumnFilter",
        sortable: false,
        cellRenderer: (p: ICellRendererParams<ApiOrder>) => (p.data ? <ShipCell o={p.data} onShip={canShip ? ship : undefined} /> : null),
      },
      {
        headerName: "Channel",
        field: "channel",
        width: 110,
        filter: true,
        cellRenderer: (p: ICellRendererParams<ApiOrder>) => <span className={`font-mono text-[13px] ${p.value === "mcp" ? "text-accent" : "text-fg2"}`}>{p.value}</span>,
      },
      {
        headerName: "Status",
        field: "status",
        width: 110,
        filter: true,
        cellRenderer: (p: ICellRendererParams<ApiOrder>) => (
          <span className={`inline-flex items-center gap-2 font-mono text-[13px] ${STATUS_COLOR[p.value as ApiOrder["status"]]}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {p.value}
          </span>
        ),
      },
      {
        headerName: "Total",
        field: "total",
        width: 100,
        type: "rightAligned",
        filter: "agNumberColumnFilter",
        valueGetter: (p) => (p.data ? Number(p.data.total) : 0),
        valueFormatter: (p) => `$${Number(p.value).toFixed(2)}`,
        cellClass: "tnum font-mono",
      },
    ],
    [canShip, ship],
  );

  const exportCsv = () =>
    grid.current?.api.exportDataAsCsv({
      fileName: `orders-${new Date().toISOString().slice(0, 10)}.csv`,
      processCellCallback: (p) => (p.column.getColId() === "createdAt" ? String(p.value) : p.formatValue ? p.formatValue(p.value) : p.value),
    });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-hair p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`h-8 rounded-md px-3 text-[13px] transition-colors ${filter === f.id ? "bg-raised text-fg" : "text-fg3 hover:text-fg"}`}
            >
              {f.label}
              <span className="ml-1.5 font-mono text-fg3">{orders.filter(f.test).length}</span>
            </button>
          ))}
        </div>
        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-hair px-3 focus-within:border-fg3 sm:max-w-xs">
          <Search className="h-4 w-4 shrink-0 text-fg3" strokeWidth={1.5} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-fg3" />
        </label>
        <button type="button" onClick={exportCsv} className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border border-hair px-3 text-[13px] text-fg2 transition-colors hover:border-fg3 hover:text-fg">
          <Download className="h-4 w-4" strokeWidth={1.5} />
          Export CSV
        </button>
      </div>
      <AgGridReact<ApiOrder>
        ref={grid}
        theme={theme}
        rowData={rows}
        columnDefs={columns}
        defaultColDef={defaultColDef}
        getRowId={rowId}
        rowClassRules={rowClassRules}
        quickFilterText={search}
        domLayout="autoHeight"
        pagination
        paginationPageSize={20}
        paginationPageSizeSelector={[20, 50, 100]}
        enableCellTextSelection
        animateRows
        getRowHeight={getRowHeight}
        onRowDataUpdated={(e) => e.api.resetRowHeights()}
        overlayNoRowsTemplate='<span style="color:#85858b">No orders match</span>'
      />
    </div>
  );
}

/** Ship-to from the buyer's PayPal account, and the one thing the merchant does by hand: ship it. */
function ShipCell({ o, onShip }: { o: ApiOrder; onShip?: (id: string) => void }) {
  if (o.status !== "PAID") return <div className="py-3 leading-5 text-fg3">—</div>;
  const a = o.shipping;
  return (
    <div className="flex flex-col gap-2 py-3 leading-5">
      {a ? (
        <div>
          <div className="truncate">{a.name}</div>
          <div className="truncate text-fg3">
            {a.line1}, {a.city}
            {a.state ? ` ${a.state}` : ""} {a.postalCode}
          </div>
        </div>
      ) : (
        <span className="text-fg3">In your PayPal account</span>
      )}
      {o.shippedAt ? (
        <span className="font-mono text-[13px] text-pos">Shipped</span>
      ) : onShip ? (
        <button type="button" onClick={() => onShip(o.id)} className="h-8 self-start rounded-lg bg-raised px-3 text-[13px] transition-colors hover:bg-hair">
          Mark as shipped
        </button>
      ) : null}
    </div>
  );
}
