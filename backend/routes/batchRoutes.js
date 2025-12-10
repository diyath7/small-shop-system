// backend/routes/batchRoutes.js
const express = require("express");
const pool = require("../db");
const { authRequired, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/batches/next-supplier-invoice
// Returns the next auto-generated supplier invoice number (e.g. SUPINV00001)
router.get(
  "/next-supplier-invoice",
  authRequired,
  requireRole("ADMIN", "MANAGER"),
  async (req, res) => {
    try {
      const lastRes = await pool.query(
        `
        SELECT supplier_invoice_no
        FROM product_batches
        WHERE supplier_invoice_no IS NOT NULL
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        `
      );

      let nextNum = 1;
      if (lastRes.rows.length > 0) {
        const last = lastRes.rows[0].supplier_invoice_no;
        const match = last && last.match(/(\d+)$/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }

      const prefix = "SUPINV";
      const padded = String(nextNum).padStart(5, "0"); // SUPINV00001, ...
      const invoiceNo = `${prefix}${padded}`;

      res.json({ supplier_invoice_no: invoiceNo });
    } catch (err) {
      console.error("Error generating next supplier invoice no:", err);
      res
        .status(500)
        .json({ error: "Failed to generate supplier invoice number" });
    }
  }
);

/**
 * POST /api/batches
 * Create a new stock batch (stock IN).
 * Body:
 * {
 *   "product_id": 1,
 *   "batch_code": "SPR1_2025_01",
 *   "expiry_date": "2025-12-31",        // or null
 *   "quantity": 100,
 *   "unit_cost": 200.00,
 *   "supplier_id": 3,                   // OPTIONAL – can be null
 *   "supplier_invoice_no": "INV-1234"   // OPTIONAL – can be null. If omitted, we auto-generate.
 * }
 */
router.post(
  "/",
  authRequired,
  requireRole("ADMIN", "MANAGER"),
  async (req, res) => {
    const {
      product_id,
      batch_code,
      expiry_date,
      quantity,
      unit_cost,
      supplier_id,
      supplier_invoice_no,
    } = req.body;

    if (!product_id || !batch_code || !quantity || !unit_cost) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const qtyNum = Number(quantity);
    const costNum = Number(unit_cost);

    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      return res
        .status(400)
        .json({ error: "Quantity must be a positive number" });
    }
    if (!Number.isFinite(costNum) || costNum < 0) {
      return res.status(400).json({ error: "Unit cost must be >= 0" });
    }

    // supplier_id is optional; if not provided or invalid → null
    let supplierIdValue = null;
    if (
      supplier_id !== undefined &&
      supplier_id !== null &&
      supplier_id !== ""
    ) {
      const sid = Number(supplier_id);
      if (!Number.isInteger(sid) || sid <= 0) {
        return res.status(400).json({
          error: "supplier_id must be a positive integer if provided",
        });
      }
      supplierIdValue = sid;
    }

    // If user typed a value, we'll respect it; otherwise we auto-generate.
    let invoiceNoValue =
      supplier_invoice_no && String(supplier_invoice_no).trim() !== ""
        ? String(supplier_invoice_no).trim()
        : null;

    try {
      // 🔹 Auto-generate supplier invoice number if missing
      if (!invoiceNoValue) {
        const lastRes = await pool.query(
          `
          SELECT supplier_invoice_no
          FROM product_batches
          WHERE supplier_invoice_no IS NOT NULL
          ORDER BY created_at DESC, id DESC
          LIMIT 1
          `
        );

        let nextNum = 1;
        if (lastRes.rows.length > 0) {
          const last = lastRes.rows[0].supplier_invoice_no;
          const match = last && last.match(/(\d+)$/);
          if (match) {
            nextNum = parseInt(match[1], 10) + 1;
          }
        }

        const prefix = "SUPINV";
        const padded = String(nextNum).padStart(5, "0"); // SUPINV00001, SUPINV00002, ...
        invoiceNoValue = `${prefix}${padded}`;
      }

      const result = await pool.query(
        `
        INSERT INTO product_batches
          (product_id, batch_code, expiry_date, quantity,
           unit_cost, supplier_id, supplier_invoice_no)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        `,
        [
          product_id,
          batch_code,
          expiry_date || null,
          qtyNum,
          costNum,
          supplierIdValue,
          invoiceNoValue,
        ]
      );

      const batch = result.rows[0];
      res.status(201).json(batch);
    } catch (err) {
      console.error("Error creating product batch:", err);
      res.status(500).json({ error: "Failed to create product batch" });
    }
  }
);

/**
 * GET /api/batches/recent
 * Show latest 20 batches (for admin view).
 */
router.get(
  "/recent",
  authRequired,
  requireRole("ADMIN", "MANAGER"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          pb.id,
          pb.batch_code,
          pb.expiry_date,
          pb.quantity,
          pb.unit_cost,
          pb.created_at,
          pb.supplier_id,
          pb.supplier_invoice_no,
          pb.is_paid,
          pb.paid_at,
          p.name AS product_name,
          p.category,
          s.name AS supplier_name
        FROM product_batches pb
        JOIN products p ON p.id = pb.product_id
        LEFT JOIN suppliers s ON s.id = pb.supplier_id
        ORDER BY pb.created_at DESC
        LIMIT 20
        `
      );

      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching recent batches:", err);
      res.status(500).json({ error: "Failed to fetch recent batches" });
    }
  }
);
/**
 * GET /api/batches/supplier-summary
 *
 * Quick view of what you owe each supplier.
 *
 * Query params (all optional):
 *   from   = 'YYYY-MM-DD'  (filter by batch created_at >= from)
 *   to     = 'YYYY-MM-DD'  (filter by batch created_at <= to)
 *   status = 'unpaid' | 'paid' | 'all'   (default = 'unpaid')
 *
 * Returns one row per supplier:
 *   supplier_id, supplier_name,
 *   batch_count, paid_batches, unpaid_batches,
 *   total_amount, first_batch, last_batch
 */
router.get(
  "/supplier-summary",
  authRequired,
  requireRole("ADMIN", "MANAGER"),
  async (req, res) => {
    const { from, to, status } = req.query;

    // default: only unpaid
    let where = "pb.supplier_id IS NOT NULL";
    const params = [];

    if (status === "paid") {
      params.push(true);
      where += ` AND pb.is_paid = $${params.length}`;
    } else if (status === "unpaid" || !status) {
      // unpaid = false OR null
      where += ` AND (pb.is_paid = FALSE OR pb.is_paid IS NULL)`;
    } else if (status === "all") {
      // no extra is_paid filter
    }

    if (from) {
      params.push(from);
      where += ` AND pb.created_at::date >= $${params.length}`;
    }

    if (to) {
      params.push(to);
      where += ` AND pb.created_at::date <= $${params.length}`;
    }

    try {
      const result = await pool.query(
        `
        SELECT
          s.id AS supplier_id,
          s.name AS supplier_name,
          COUNT(*) AS batch_count,
          COUNT(*) FILTER (WHERE pb.is_paid = TRUE) AS paid_batches,
          COUNT(*) FILTER (
            WHERE pb.is_paid = FALSE OR pb.is_paid IS NULL
          ) AS unpaid_batches,
          SUM(pb.quantity * pb.unit_cost) AS total_amount,
          MIN(pb.created_at) AS first_batch,
          MAX(pb.created_at) AS last_batch
        FROM product_batches pb
        JOIN suppliers s ON s.id = pb.supplier_id
        WHERE ${where}
        GROUP BY s.id, s.name
        ORDER BY s.name ASC
        `,
        params
      );

      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching supplier summary:", err);
      res.status(500).json({ error: "Failed to fetch supplier summary" });
    }
  }
);



/**
 * GET /api/batches/supplier-unpaid?supplier_id=4
 * Returns all UNPAID batches for a given supplier.
 */
router.get(
  "/supplier-unpaid",
  authRequired,
  requireRole("ADMIN", "MANAGER"),
  async (req, res) => {
    const { supplier_id } = req.query;

    const sid = Number(supplier_id);
    if (!sid || !Number.isInteger(sid) || sid <= 0) {
      return res
        .status(400)
        .json({ error: "Valid supplier_id query param is required" });
    }

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
          pb.unit_cost,
          (pb.quantity * pb.unit_cost) AS total_amount,
          pb.created_at,
          pb.supplier_id,
          s.name AS supplier_name,
          pb.supplier_invoice_no,
          pb.is_paid
        FROM product_batches pb
        JOIN products p ON p.id = pb.product_id
        LEFT JOIN suppliers s ON s.id = pb.supplier_id
        WHERE
          pb.supplier_id = $1
          AND (pb.is_paid IS FALSE OR pb.is_paid IS NULL)
        ORDER BY pb.created_at ASC
        `,
        [sid]
      );

      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching unpaid batches:", err);
      res.status(500).json({ error: "Failed to fetch unpaid batches" });
    }
  }
);

/**
 * POST /api/batches/mark-paid
 * Body: { batch_ids: [1,2,...], supplier_invoice_no?, paid_at? }
 * Marks those batches as paid.
 */
router.post(
  "/mark-paid",
  authRequired,
  requireRole("ADMIN", "MANAGER"),
  async (req, res) => {
    const { batch_ids, supplier_invoice_no, paid_at } = req.body;

    if (!Array.isArray(batch_ids) || batch_ids.length === 0) {
      return res
        .status(400)
        .json({ error: "batch_ids array is required and cannot be empty" });
    }

    const ids = batch_ids
      .map((id) => Number(id))
      .filter((n) => Number.isInteger(n) && n > 0);

    if (ids.length === 0) {
      return res
        .status(400)
        .json({ error: "batch_ids must contain valid positive integers" });
    }

    // If paid_at not provided, use NOW()
    const paidAtValue = paid_at ? new Date(paid_at) : new Date();
    const supplierInvNo = supplier_invoice_no || null;

    try {
      const result = await pool.query(
        `
        UPDATE product_batches
        SET
          is_paid = TRUE,
          paid_at = $2,
          supplier_invoice_no = COALESCE($3, supplier_invoice_no)
        WHERE id = ANY($1::int[])
        RETURNING *
        `,
        [ids, paidAtValue, supplierInvNo]
      );

      if (result.rowCount === 0) {
        return res
          .status(404)
          .json({ error: "No batches were updated (check batch_ids)" });
      }

      res.json({
        updated_count: result.rowCount,
        updated_batches: result.rows,
      });
    } catch (err) {
      console.error("Error marking batches as paid:", err);
      res.status(500).json({ error: "Failed to mark batches as paid" });
    }
  }
);


module.exports = router;
