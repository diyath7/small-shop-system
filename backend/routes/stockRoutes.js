// backend/routes/stockRoutes.js
const express = require("express");
const pool = require("../db");
const { authRequired, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * GET /api/stock/summary
 * Returns one row per product with total quantity and expiry info.
 */
router.get(
  "/summary",
  authRequired,
  requireRole("ADMIN", "MANAGER"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          p.id AS product_id,
          p.name,
          p.category,
          p.reorder_level,
          COALESCE(SUM(pb.quantity), 0) AS total_quantity,
          COUNT(*) FILTER (WHERE pb.quantity > 0) AS batch_count,
          MIN(pb.expiry_date) FILTER (WHERE pb.quantity > 0) AS nearest_expiry
        FROM products p
        LEFT JOIN product_batches pb
          ON pb.product_id = p.id
        GROUP BY
          p.id, p.name, p.category, p.reorder_level
        ORDER BY
          p.name ASC
        `
      );

      const rows = result.rows.map((row) => {
        const total = Number(row.total_quantity) || 0;
        const reorder = Number(row.reorder_level) || 0;

        return {
          ...row,
          total_quantity: total,
          reorder_level: reorder,
          is_low_stock: reorder > 0 && total < reorder,
        };
      });

      res.json(rows);
    } catch (err) {
      console.error("Error fetching stock summary:", err);
      res.status(500).json({ error: "Failed to fetch stock summary" });
    }
  }
);

/**
 * GET /api/stock/expired
 * Returns all expired batches that still have quantity > 0.
 */
router.get(
  "/expired",
  authRequired,
  requireRole("ADMIN", "MANAGER"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          pb.id AS batch_id,
          pb.product_id,
          p.name AS product_name,
          p.category,
          pb.batch_code,
          pb.quantity,
          pb.expiry_date,
          pb.unit_cost
        FROM product_batches pb
        JOIN products p
          ON p.id = pb.product_id
        WHERE
          pb.quantity > 0
          AND pb.expiry_date < CURRENT_DATE
        ORDER BY
          pb.expiry_date ASC
        `
      );

      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching expired stock:", err);
      res.status(500).json({ error: "Failed to fetch expired stock" });
    }
  }
);

/**
 * POST /api/stock/write-off
 * Body: { batch_id, quantity, reason?, notes? }
 * - Reduces quantity in product_batches
 * - Inserts a row into stock_write_offs (loss record)
 */
router.post(
  "/write-off",
  authRequired,
  requireRole("ADMIN"), // only admin can write off stock
  async (req, res) => {
    const { batch_id, quantity, reason = "EXPIRED", notes } = req.body;

    const qty = Number(quantity);

    if (!batch_id || !qty || qty <= 0) {
      return res
        .status(400)
        .json({ message: "batch_id and a positive quantity are required" });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1) Lock the batch row
      const batchRes = await client.query(
        `
        SELECT
          id,
          product_id,
          quantity,
          expiry_date,
          unit_cost
        FROM product_batches
        WHERE id = $1
        FOR UPDATE
        `,
        [batch_id]
      );

      if (batchRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Batch not found" });
      }

      const batch = batchRes.rows[0];

      if (qty > batch.quantity) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ message: "Quantity exceeds available batch stock" });
      }

      // use your real unit_cost from product_batches
      const unitCost = Number(batch.unit_cost) || 0;
      const totalCost = unitCost * qty;

      const createdBy = req.user.id; // from auth middleware

      // 2) Insert write-off record (loss)
      const writeOffRes = await client.query(
        `
        INSERT INTO stock_write_offs
          (product_id, batch_id, quantity, reason,
           unit_cost, total_cost, write_off_date,
           created_by, notes)
        VALUES
          ($1, $2, $3, $4,
           $5, $6, CURRENT_DATE,
           $7, $8)
        RETURNING *
        `,
        [
          batch.product_id,
          batch.id,
          qty,
          reason,
          unitCost,
          totalCost,
          createdBy,
          notes || null,
        ]
      );

      // 3) Reduce batch quantity
      await client.query(
        `
        UPDATE product_batches
        SET quantity = quantity - $1
        WHERE id = $2
        `,
        [qty, batch.id]
      );

      await client.query("COMMIT");

      res.status(201).json({
        message: "Stock written off successfully",
        writeOff: writeOffRes.rows[0],
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error writing off stock:", err);
      res.status(500).json({ message: "Failed to write off stock" });
    } finally {
      client.release();
    }
  }
);
/**
 * GET /api/stock/write-offs
 * Returns list of write-off records (losses).
 */
router.get(
  "/write-offs",
  authRequired,
  requireRole("ADMIN", "MANAGER"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          w.id,
          w.write_off_date,
          w.product_id,
          p.name AS product_name,
          w.batch_id,
          pb.batch_code,
          w.quantity,
          w.unit_cost,
          w.total_cost,
          w.reason,
          w.notes,
          u.username AS created_by
        FROM stock_write_offs w
        JOIN products p       ON p.id = w.product_id
        LEFT JOIN product_batches pb ON pb.id = w.batch_id
        LEFT JOIN users u      ON u.id = w.created_by
        ORDER BY w.write_off_date DESC, w.id DESC;
        `
      );

      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching stock write-offs:", err);
      res.status(500).json({ error: "Failed to fetch stock write-offs" });
    }
  }
);

module.exports = router;
