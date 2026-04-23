import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { z } from "zod";
import { db } from "./db";
import { decodeCursor, encodeCursor } from "./cursor";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

const orderItemSchema = z.object({
  id: z.number().int(),
  itemText: z.string(),
  position: z.number().int(),
});

const orderSchema = z.object({
  id: z.number().int(),
  legacyOrderId: z.string(),
  customerName: z.string().nullable(),
  customerPhone: z.string().nullable(),
  tableNumber: z.string().nullable(),
  waiterName: z.string().nullable(),
  waiterPhone: z.string().nullable(),
  orderDateIso: z.string().nullable(),
  orderDateEpochMs: z.number().int().nullable(),
  status: z.string().nullable(),
  priceCents: z.number().int().nullable(),
  rawOrderId: z.string(),
  rawOrderDate: z.string().nullable(),
  rawStatus: z.string().nullable(),
  rawMetadata: z.string().nullable(),
  rawPrice: z.string().nullable(),
  rawFoodItems: z.string().nullable(),
  metadataJson: z.string().nullable(),
  metadataText: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(orderItemSchema),
});

const listResponseSchema = z.object({
  items: z.array(orderSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

const createOrderSchema = z.object({
  legacyOrderId: z.string().min(1),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  tableNumber: z.string().nullable().optional(),
  waiterName: z.string().nullable().optional(),
  waiterPhone: z.string().nullable().optional(),
  orderDateIso: z.string().nullable().optional(),
  orderDateEpochMs: z.number().int().nullable().optional(),
  status: z.string().nullable().optional(),
  priceCents: z.number().int().nullable().optional(),
  rawOrderId: z.string().min(1),
  rawOrderDate: z.string().nullable().optional(),
  rawStatus: z.string().nullable().optional(),
  rawMetadata: z.string().nullable().optional(),
  rawPrice: z.string().nullable().optional(),
  rawFoodItems: z.string().nullable().optional(),
  metadataJson: z.string().nullable().optional(),
  metadataText: z.string().nullable().optional(),
  items: z.array(z.object({ itemText: z.string().min(1) })).default([]),
});

const updateOrderSchema = createOrderSchema.partial().extend({
  items: z.array(z.object({ itemText: z.string().min(1) })).optional(),
});

type OrderRecord = z.infer<typeof orderSchema>;

function nullable(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return String(value);
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function getOrderById(id: number): OrderRecord | null {
  const row = db.query(`SELECT * FROM orders WHERE id = ?`).get(id) as any;
  if (!row) return null;

  const items = db
    .query("SELECT id, item_text, position FROM order_items WHERE order_id = ? ORDER BY position ASC")
    .all(id) as Array<{ id: number; item_text: string; position: number }>;

  return orderSchema.parse({
    id: row.id,
    legacyOrderId: row.legacy_order_id,
    customerName: nullable(row.customer_name),
    customerPhone: nullable(row.customer_phone),
    tableNumber: nullable(row.table_number),
    waiterName: nullable(row.waiter_name),
    waiterPhone: nullable(row.waiter_phone),
    orderDateIso: nullable(row.order_date_iso),
    orderDateEpochMs: row.order_date_epoch_ms ?? null,
    status: nullable(row.status),
    priceCents: row.price_cents ?? null,
    rawOrderId: row.raw_order_id,
    rawOrderDate: nullable(row.raw_order_date),
    rawStatus: nullable(row.raw_status),
    rawMetadata: nullable(row.raw_metadata),
    rawPrice: nullable(row.raw_price),
    rawFoodItems: nullable(row.raw_food_items),
    metadataJson: nullable(row.metadata_json),
    metadataText: nullable(row.metadata_text),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items.map((i) => ({
      id: i.id,
      itemText: i.item_text,
      position: i.position,
    })),
  });
}

const app = new Elysia()
  .use(cors())
  .get("/", () => "Hello Elysia")

  .get("/orders", ({ query, set }) => {
    const parsedQuery = listQuerySchema.safeParse(query ?? {});
    if (!parsedQuery.success) {
      set.status = 400;
      return { error: "Invalid query parameters" };
    }

    const { limit, cursor } = parsedQuery.data;

    let afterId = 0;
    if (cursor) {
      try {
        afterId = decodeCursor(cursor).id;
      } catch {
        set.status = 400;
        return { error: "Invalid cursor" };
      }
    }

    const take = limit + 1;
    const rows = db
      .query(`SELECT id FROM orders WHERE id > ? ORDER BY id ASC LIMIT ?`)
      .all(afterId, take) as { id: number }[];

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const items = page
      .map((r) => getOrderById(r.id))
      .filter((r): r is OrderRecord => r !== null);

    const nextCursor =
      hasMore && page.length
        ? encodeCursor({ id: page[page.length - 1].id })
        : null;

    return listResponseSchema.parse({ items, nextCursor, hasMore });
  })

  .post("/orders", ({ body, set }) => {
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return { error: "Invalid payload" };
    }

    const input = parsed.data;

    db.run("BEGIN");
    try {
      db.run(
        `INSERT INTO orders (legacy_order_id, raw_order_id, created_at, updated_at)
         VALUES (?, ?, datetime('now'), datetime('now'))`,
        [input.legacyOrderId, input.rawOrderId]
      );

      const { id } = db.query("SELECT last_insert_rowid() AS id").get() as { id: number };

      input.items.forEach((item, i) => {
        db.run(
          "INSERT INTO order_items (order_id, item_text, position) VALUES (?, ?, ?)",
          [id, item.itemText, i]
        );
      });

      db.run("COMMIT");

      set.status = 201;
      return getOrderById(id);
    } catch (e) {
      db.run("ROLLBACK");
      throw e;
    }
  })

  .put("/orders/:id", ({ params, body, set }) => {
    const id = Number.parseInt(params.id);
    if (!Number.isInteger(id)) {
      set.status = 400;
      return { error: "Invalid id" };
    }

    const parsed = updateOrderSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return { error: "Invalid payload" };
    }

    db.run("BEGIN");
    try {
      db.run("UPDATE orders SET updated_at = datetime('now') WHERE id = ?", [id]);

      if (parsed.data.items) {
        db.run("DELETE FROM order_items WHERE order_id = ?", [id]);
        parsed.data.items.forEach((item, i) => {
          db.run(
            "INSERT INTO order_items (order_id, item_text, position) VALUES (?, ?, ?)",
            [id, item.itemText, i]
          );
        });
      }

      db.run("COMMIT");
      return getOrderById(id);
    } catch (e) {
      db.run("ROLLBACK");
      throw e;
    }
  })

  .delete("/orders/:id", ({ params }) => {
    const id = Number(params.id);
    db.run("DELETE FROM orders WHERE id = ?", [id]);
    return { deleted: true };
  })

  .listen(3001);

console.log(`🚀 Server running on ${app.server?.port}`);