// backend/routes/invoiceRoutes.js

const express = require('express');
const pool = require('../db');
const { authRequired, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Helper: normalize a JS Date to "local noon" to avoid UTC day-shift.
 * We also compare only dates (ignoring time).
 */
function normalizeToLocalNoon(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    return null;
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

/**
 * POST /api/invoices
 * Create a new invoice + deduct stock using FEFO (First-Expired, First-Out)
 */
router.post(
  '/',
  authRequired,
  requireRole('ADMIN', 'MANAGER', 'CASHIER'),
  async (req, res) => {
    const { customer_name, invoice_date, items, discount } = req.body;

    // --- Discount validation ---
    const discountAmount = Number(discount) || 0;
    if (discountAmount < 0) {
      return res.status(400).json({ message: 'Discount cannot be negative.' });
    }

    // basic items validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Invoice items are required' });
    }

    // --- Validate & normalize invoice_date (no future dates) ---
    const clientDate = invoice_date ? new Date(invoice_date) : new Date();
    const invDate = normalizeToLocalNoon(clientDate);
    const today = normalizeToLocalNoon(new Date());

    if (!invDate) {
      return res.status(400).json({ message: 'Invalid invoice date.' });
    }

    if (invDate.getTime() > today.getTime()) {
      return res
        .status(400)
        .json({ message: 'Invoice date cannot be in the future.' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1) Generate next invoice number
      const nextIdResult = await client.query(`
        SELECT COALESCE(MAX(id), 0) + 1 AS next_id
        FROM invoices
      `);
      const nextId = nextIdResult.rows[0].next_id;
      const invoiceNumber = `INV${nextId.toString().padStart(5, '0')}`; // e.g. INV00001

      // 2) Insert invoice header with placeholder total_amount (will update later)
      const insertInvoiceResult = await client.query(
        `
        INSERT INTO invoices (
          invoice_number,
          customer_name,
          invoice_date,
          discount,
          total_amount,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, invoice_number;
        `,
        [
          invoiceNumber,
          customer_name || 'Walk-in Customer',
          invDate,
          discountAmount,
          0,
          'PAID',
        ]
      );

      const invoiceId = insertInvoiceResult.rows[0].id;
      let invoiceSubtotal = 0; // sum of line totals BEFORE discount

      // 🔴 collect all "not enough stock" messages here
      const insufficientMessages = [];

      // 3) FEFO stock deduction + invoice_lines insert
      for (const item of items) {
        const { product_id, quantity, unit_price } = item;

        if (!product_id || !quantity || quantity <= 0) {
          throw new Error('Invalid item data');
        }

        // 3a) Check total available stock + get product name
        const stockCheckResult = await client.query(
          `
          SELECT 
            p.name AS product_name,
            COALESCE(SUM(pb.quantity), 0) AS total_qty
          FROM products p
          LEFT JOIN product_batches pb
            ON pb.product_id = p.id
           AND pb.quantity > 0
          WHERE p.id = $1
          GROUP BY p.name;
          `,
          [product_id]
        );

        const stockRow = stockCheckResult.rows[0];
        const productName =
          stockRow?.product_name || `Product ${product_id}`;
        const availableTotal = Number(stockRow?.total_qty || 0);

        if (availableTotal < quantity) {
          // not enough stock for this item → collect a human-readable message
          insufficientMessages.push(
            `Not enough stock for ${productName}. Requested ${quantity}, available ${availableTotal}.`
          );
          // do NOT deduct stock or insert invoice_lines for this product
          continue;
        }

        // 3b) We have enough stock → get batches ordered by earliest expiry
        const batchesResult = await client.query(
          `
          SELECT id, quantity, expiry_date
          FROM product_batches
          WHERE product_id = $1 AND quantity > 0
          ORDER BY expiry_date ASC, id ASC;
          `,
          [product_id]
        );

        let remaining = quantity;

        // Deduct from batches FEFO-style
        for (const batch of batchesResult.rows) {
          if (remaining <= 0) break;

          const batchQty = Number(batch.quantity);
          const toDeduct = Math.min(remaining, batchQty);

          await client.query(
            `
            UPDATE product_batches
            SET quantity = quantity - $1
            WHERE id = $2;
            `,
            [toDeduct, batch.id]
          );

          remaining -= toDeduct;
        }

        const price = Number(unit_price) || 0;
        const lineTotal = price * quantity;
        invoiceSubtotal += lineTotal;

        await client.query(
          `
          INSERT INTO invoice_lines (invoice_id, product_id, quantity, unit_price, line_total)
          VALUES ($1, $2, $3, $4, $5);
          `,
          [invoiceId, product_id, quantity, price, lineTotal]
        );
      }

      // 🔴 If any product was short on stock, rollback everything and return ALL messages
      if (insufficientMessages.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: 'Not enough stock for one or more products.',
          errors: insufficientMessages, // <-- array used by frontend
        });
      }

      // 4) Apply discount + update invoice totals
      const finalTotal = Math.max(0, invoiceSubtotal - discountAmount);

      await client.query(
        `
        UPDATE invoices
        SET total_amount = $1,
            discount     = $2
        WHERE id = $3;
        `,
        [finalTotal, discountAmount, invoiceId]
      );

      await client.query('COMMIT');

      res.status(201).json({
        id: invoiceId,
        invoice_number: invoiceNumber,
        subtotal: invoiceSubtotal,
        discount: discountAmount,
        total_amount: finalTotal,
        status: 'PAID',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ message: 'Failed to create invoice' });
    } finally {
      client.release();
    }
  }
);

/**
 * OLD list endpoint (kept for other pages)
 * GET /api/invoices?date=YYYY-MM-DD
 */
router.get('/', authRequired, async (req, res) => {
  const { date } = req.query;

  try {
    let result;

    if (date) {
      result = await pool.query(
        `
        SELECT
          id,
          invoice_number,
          customer_name,
          TO_CHAR(invoice_date::date, 'YYYY-MM-DD') AS invoice_date,
          discount,
          total_amount,
          status
        FROM invoices
        WHERE invoice_date::date = $1::date
        ORDER BY created_at DESC, id DESC;
        `,
        [date]
      );
    } else {
      result = await pool.query(
        `
        SELECT
          id,
          invoice_number,
          customer_name,
          TO_CHAR(invoice_date::date, 'YYYY-MM-DD') AS invoice_date,
          discount,
          total_amount,
          status
        FROM invoices
        ORDER BY invoice_date::date DESC, id DESC;
        `
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch invoices' });
  }
});

/**
 * NEW: GET /api/invoices/range?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns invoices in a date range (used by Sales page).
 */
router.get('/range', authRequired, async (req, res) => {
  const { from, to } = req.query;

  try {
    const params = [];
    let where = '1=1';

    if (from) {
      params.push(from);
      where += ` AND invoice_date::date >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      where += ` AND invoice_date::date <= $${params.length}`;
    }

    const result = await pool.query(
      `
      SELECT
        id,
        invoice_number,
        customer_name,
        TO_CHAR(invoice_date::date, 'YYYY-MM-DD') AS invoice_date,
        discount,
        total_amount,
        status
      FROM invoices
      WHERE ${where}
      ORDER BY invoice_date::date DESC, id DESC;
      `,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch invoices for range' });
  }
});

/**
 * GET /api/invoices/:id
 * Return invoice header + items
 */
router.get('/:id', authRequired, async (req, res) => {
  const { id } = req.params;

  try {
    const headerResult = await pool.query(
      `
      SELECT
        id,
        invoice_number,
        customer_name,
        TO_CHAR(invoice_date::date, 'YYYY-MM-DD') AS invoice_date,
        discount,
        total_amount,
        status
      FROM invoices
      WHERE id = $1;
      `,
      [id]
    );

    if (headerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const linesResult = await pool.query(
      `
      SELECT
        il.product_id,
        p.name AS product_name,
        il.quantity,
        il.unit_price,
        il.line_total
      FROM invoice_lines il
      JOIN products p ON p.id = il.product_id
      WHERE il.invoice_id = $1;
      `,
      [id]
    );

    res.json({
      invoice: headerResult.rows[0],
      items: linesResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch invoice details' });
  }
});

module.exports = router;
