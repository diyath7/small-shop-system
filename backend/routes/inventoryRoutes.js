// backend/routes/inventoryRoutes.js

const express = require('express');
const pool = require('../db');
const { authRequired, requireRole } = require("../middleware/authMiddleware");


const router = express.Router();

/**
 * GET /api/inventory
 * Full inventory view for all products
 * - total_quantity = sum of all batch quantities
 * - stock_status = OK / LOW_STOCK / OUT_OF_STOCK
 */
router.get('/', authRequired, async (req, res) => {
  try {
    const result = await pool.query(`
      WITH inv AS (
        SELECT
          p.id AS product_id,
          p.name,
          p.category,
          p.reorder_level,
          COALESCE(SUM(b.quantity), 0) AS total_quantity
        FROM products p
        LEFT JOIN product_batches b ON b.product_id = p.id   -- 👈 changed
        GROUP BY p.id, p.name, p.category, p.reorder_level
      )
      SELECT
        product_id,
        name,
        category,
        reorder_level,
        total_quantity,
        CASE
          WHEN total_quantity = 0 THEN 'OUT_OF_STOCK'
          WHEN total_quantity <= reorder_level THEN 'LOW_STOCK'
          ELSE 'OK'
        END AS stock_status
      FROM inv
      ORDER BY product_id;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch inventory' });
  }
});

/**
 * GET /api/inventory/low-stock
 * Only products that are LOW_STOCK or OUT_OF_STOCK
 */
router.get('/low-stock', authRequired, async (req, res) => {
  try {
    const result = await pool.query(`
      WITH inv AS (
        SELECT
          p.id AS product_id,
          p.name,
          p.category,
          p.reorder_level,
          COALESCE(SUM(b.quantity), 0) AS total_quantity
        FROM products p
        LEFT JOIN product_batches b ON b.product_id = p.id   -- 👈 changed
        GROUP BY p.id, p.name, p.category, p.reorder_level
      ),
      inv_with_status AS (
        SELECT
          product_id,
          name,
          category,
          reorder_level,
          total_quantity,
          CASE
            WHEN total_quantity = 0 THEN 'OUT_OF_STOCK'
            WHEN total_quantity <= reorder_level THEN 'LOW_STOCK'
            ELSE 'OK'
          END AS stock_status
        FROM inv
      )
      SELECT
        product_id,
        name,
        category,
        reorder_level,
        total_quantity,
        stock_status
      FROM inv_with_status
      WHERE stock_status IN ('LOW_STOCK', 'OUT_OF_STOCK')
      ORDER BY stock_status DESC, name;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch low-stock items' });
  }
});

/**
 * GET /api/inventory/expiring?days=30
 * Products whose **nearest batch expiry** is within X days (default 30)
 * FEFO view: we look at the earliest expiry per product.
 */
router.get('/expiring', authRequired, async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;

  try {
    const result = await pool.query(
      `
      WITH batch_view AS (
        SELECT
          b.product_id,
          MIN(b.expiry_date) AS nearest_expiry,
          SUM(b.quantity)   AS total_quantity
        FROM product_batches b                              -- 👈 changed
        WHERE b.quantity > 0
        GROUP BY b.product_id
      )
      SELECT
        p.id   AS product_id,
        p.name,
        p.category,
        p.reorder_level,
        bv.total_quantity,
        bv.nearest_expiry
      FROM batch_view bv
      JOIN products p ON p.id = bv.product_id
      WHERE bv.nearest_expiry <= NOW() + $1 * INTERVAL '1 day'
      ORDER BY bv.nearest_expiry ASC;
      `,
      [days]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch expiring items' });
  }
});
// GET /api/invoices/range?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns invoices within a date range (or all if no from/to).
router.get(
  "/range",
  authRequired,
  requireRole("ADMIN", "MANAGER"),
  async (req, res) => {
    const { from, to } = req.query;

    const params = [];
    let where = "1=1";

    if (from) {
      params.push(from);
      where += ` AND i.invoice_date::date >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      where += ` AND i.invoice_date::date <= $${params.length}`;
    }

    try {
      const result = await pool.query(
        `
        SELECT
          i.id,
          i.invoice_number,
          i.customer_name,
          i.invoice_date,
          i.total_amount
        FROM invoices i
        WHERE ${where}
        ORDER BY i.invoice_date DESC, i.id DESC
        `,
        params
      );

      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching invoices by range:", err);
      res.status(500).json({ error: "Failed to fetch invoices for range" });
    }
  }
);


module.exports = router;
