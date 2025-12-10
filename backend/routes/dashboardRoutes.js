// backend/routes/dashboardRoutes.js
const express = require("express");
const pool = require("../db");
const { authRequired, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * GET /api/dashboard/summary
 *
 * Returns:
 *  {
 *    lowStockCount,
 *    expiringSoonCount,
 *    unpaidSupplierInvoicesCount,
 *    todayIncome,
 *    monthly: [
 *      { month_label: '2025-08', income: '1234.00', expenses: '567.00' },
 *      ...
 *    ]
 *  }
 */
router.get(
  "/summary",
  authRequired,
  requireRole("ADMIN", "MANAGER"),
  async (req, res) => {
    try {
      // 1) Low stock items
      const lowStockRes = await pool.query(`
        SELECT COUNT(*) AS low_count
        FROM (
          SELECT
            p.id,
            COALESCE(SUM(pb.quantity), 0) AS total_qty,
            p.reorder_level
          FROM products p
          LEFT JOIN product_batches pb ON pb.product_id = p.id
          GROUP BY p.id, p.reorder_level
        ) t
        WHERE t.reorder_level IS NOT NULL
          AND t.reorder_level > 0
          AND t.total_qty < t.reorder_level
      `);

      const lowStockCount = Number(lowStockRes.rows[0]?.low_count || 0);

      // 2) Items about to expire (next 30 days)
      const expSoonRes = await pool.query(`
        SELECT COUNT(*) AS expiring_count
        FROM product_batches
        WHERE quantity > 0
          AND expiry_date IS NOT NULL
          AND expiry_date >= CURRENT_DATE
          AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
      `);

      const expiringSoonCount = Number(expSoonRes.rows[0]?.expiring_count || 0);

      // 3) Unpaid supplier invoices
      // We treat each (supplier_id, supplier_invoice_no) group as one "invoice".
      const unpaidRes = await pool.query(`
        SELECT COUNT(*) AS unpaid_count
        FROM (
          SELECT
            supplier_id,
            COALESCE(supplier_invoice_no, 'NO-INVOICE') AS inv_no
          FROM product_batches
          WHERE (is_paid IS FALSE OR is_paid IS NULL)
            AND supplier_id IS NOT NULL
          GROUP BY supplier_id, COALESCE(supplier_invoice_no, 'NO-INVOICE')
        ) t
      `);

      const unpaidSupplierInvoicesCount = Number(
        unpaidRes.rows[0]?.unpaid_count || 0
      );

      // 4) Today's income (sales)
      const todayIncomeRes = await pool.query(`
        SELECT COALESCE(SUM(total_amount), 0) AS today_income
        FROM invoices
        WHERE invoice_date::date = CURRENT_DATE
      `);

      const todayIncome = Number(todayIncomeRes.rows[0]?.today_income || 0);

      // 5) Monthly income vs expenses (last 7 months, including current)
      const monthlyRes = await pool.query(`
        WITH months AS (
          SELECT date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' * g AS month
          FROM generate_series(0, 6) AS g
        ),
        income AS (
          SELECT
            date_trunc('month', invoice_date) AS month,
            SUM(total_amount) AS income
          FROM invoices
          GROUP BY 1
        ),
        expenses AS (
          SELECT
            date_trunc('month', created_at) AS month,
            SUM(quantity * unit_cost) AS expenses
          FROM product_batches
          WHERE is_paid IS TRUE
          GROUP BY 1
        )
        SELECT
          to_char(m.month, 'YYYY-MM') AS month_label,
          COALESCE(i.income, 0) AS income,
          COALESCE(e.expenses, 0) AS expenses
        FROM months m
        LEFT JOIN income i ON i.month = m.month
        LEFT JOIN expenses e ON e.month = m.month
        ORDER BY m.month
      `);

      res.json({
        lowStockCount,
        expiringSoonCount,
        unpaidSupplierInvoicesCount,
        todayIncome,
        monthly: monthlyRes.rows,
      });
    } catch (err) {
      console.error("Error in /api/dashboard/summary:", err);
      res.status(500).json({ error: "Failed to load dashboard statistics." });
    }
  }
);

module.exports = router;
