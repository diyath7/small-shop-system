// backend/routes/reportRoutes.js
const express = require("express");
const pool = require("../db");
const { authRequired, requireRole } = require("../middleware/authMiddleware");
const PDFDocument = require("pdfkit");

const router = express.Router();

/**
 * GET /api/reports/sales
 * Query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
router.get(
  "/sales",
  authRequired,
  requireRole("ADMIN", "MANAGER"), // ✅ allow MANAGER as well
  async (req, res) => {
    try {
      let { from, to } = req.query;

      // If no date range → default last 30 days
      if (!from || !to) {
        const today = new Date();
        const toDate = today.toISOString().slice(0, 10);

        const past = new Date();
        past.setDate(past.getDate() - 30);
        const fromDate = past.toISOString().slice(0, 10);

        from = from || fromDate;
        to = to || toDate;
      }

      const result = await pool.query(
        `
        SELECT
          invoice_date::date AS date,
          COUNT(*) AS invoice_count,
          COALESCE(SUM(total_amount), 0) AS total_sales
        FROM invoices
        WHERE invoice_date::date BETWEEN $1 AND $2
        GROUP BY invoice_date::date
        ORDER BY invoice_date::date;
        `,
        [from, to]
      );

      res.json({
        from,
        to,
        rows: result.rows,
      });
    } catch (err) {
      console.error("Error in /api/reports/sales:", err);
      res.status(500).json({ message: "Failed to load sales report" });
    }
  }
);

/**
 * GET /api/reports/sales/pdf
 * Query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns a PDF file of the sales report, including per-day invoice details
 */
router.get(
  "/sales/pdf",
  authRequired,
  requireRole("ADMIN", "MANAGER"), // ✅ allow MANAGER
  async (req, res) => {
    try {
      let { from, to } = req.query;

      // same default range as /sales
      if (!from || !to) {
        const today = new Date();
        const toDate = today.toISOString().slice(0, 10);

        const past = new Date();
        past.setDate(past.getDate() - 30);
        const fromDate = past.toISOString().slice(0, 10);

        from = from || fromDate;
        to = to || toDate;
      }

      // ---------- 1) SUMMARY PER DAY ----------
      const summaryResult = await pool.query(
        `
        SELECT
          invoice_date::date AS date,
          COUNT(*) AS invoice_count,
          COALESCE(SUM(total_amount), 0) AS total_sales
        FROM invoices
        WHERE invoice_date::date BETWEEN $1 AND $2
        GROUP BY invoice_date::date
        ORDER BY invoice_date::date;
        `,
        [from, to]
      );
      const summaryRows = summaryResult.rows || [];

      // ---------- 2) DETAILED INVOICES WITH ITEMS ----------
      const detailsResult = await pool.query(
        `
        SELECT
          i.invoice_date::date AS date,
          i.invoice_number,
          i.customer_name,
          SUM(il.line_total) AS invoice_total,
          STRING_AGG(
            p.name || ' x' || il.quantity,
            ', ' ORDER BY p.name
          ) AS items_summary
        FROM invoices i
        JOIN invoice_lines il ON il.invoice_id = i.id
        JOIN products p ON p.id = il.product_id
        WHERE i.invoice_date::date BETWEEN $1 AND $2
        GROUP BY i.id, i.invoice_date::date, i.invoice_number, i.customer_name
        ORDER BY i.invoice_date::date, i.invoice_number;
        `,
        [from, to]
      );
      const detailRows = detailsResult.rows || [];

      // ---------- Build PDF ----------
      const doc = new PDFDocument({ margin: 40 });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="sales-report-${from}-to-${to}.pdf"`
      );

      doc.pipe(res);

      const formatDate = (isoOrDate) =>
        new Date(isoOrDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

      // ─── column positions for summary ───
      const SUM_COL_DATE = 50;
      const SUM_COL_INV = 260;
      const SUM_COL_TOTAL = 400;

      // helper for details section to avoid splitting rows
      const ensureSpace = (needed = 80) => {
        const bottom = doc.page.height - doc.page.margins.bottom;
        if (doc.y + needed > bottom) {
          doc.addPage();
          // Title on continuation pages
          doc
            .fontSize(14)
            .text("Invoice Details by Day (cont.)", { align: "left" })
            .moveDown(0.5);
        }
      };

      // ===== TITLE =====
      doc
        .fontSize(18)
        .text("Sales Report", { align: "center" })
        .moveDown(0.5);

      // Date range
      doc
        .fontSize(12)
        .text(`From: ${from}`, { align: "left" })
        .text(`To:   ${to}`, { align: "left" })
        .moveDown(1);

      // ===== SECTION 1: DAILY SUMMARY =====
      doc.fontSize(14).text("Daily Summary", { align: "left" }).moveDown(0.5);

      doc.fontSize(12);
      doc.text("Date", SUM_COL_DATE, doc.y, { width: 120 });
      doc.text("Invoices", SUM_COL_INV, doc.y, {
        width: 80,
        align: "right",
      });
      doc.text("Total Sales (LKR)", SUM_COL_TOTAL, doc.y, {
        width: 140,
        align: "right",
      });

      doc.moveDown(0.4);
      doc.moveTo(SUM_COL_DATE, doc.y).lineTo(560, doc.y).stroke();

      let totalInvoices = 0;
      let totalSales = 0;

      summaryRows.forEach((row) => {
        totalInvoices += Number(row.invoice_count || 0);
        totalSales += Number(row.total_sales || 0);

        const dateStr = formatDate(row.date);

        doc.moveDown(0.3);
        doc.fontSize(11);
        doc.text(dateStr, SUM_COL_DATE, doc.y, { width: 120 });
        doc.text(String(row.invoice_count), SUM_COL_INV, doc.y, {
          width: 80,
          align: "right",
        });
        doc.text(Number(row.total_sales).toFixed(2), SUM_COL_TOTAL, doc.y, {
          width: 140,
          align: "right",
        });
      });

      // Totals
      doc.moveDown(0.7);
      doc.moveTo(SUM_COL_DATE, doc.y).lineTo(560, doc.y).stroke();

      doc.moveDown(0.3).fontSize(12);
      doc.text("Total", SUM_COL_DATE, doc.y, { width: 120 });
      doc.text(String(totalInvoices), SUM_COL_INV, doc.y, {
        width: 80,
        align: "right",
      });
      doc.text(totalSales.toFixed(2), SUM_COL_TOTAL, doc.y, {
        width: 140,
        align: "right",
      });

      // ===== SECTION 2: INVOICE DETAILS BY DAY =====
      doc.addPage(); // new page for details

      doc
        .fontSize(14)
        .text("Invoice Details by Day", { align: "left" })
        .moveDown(0.5);

      if (detailRows.length === 0) {
        doc.fontSize(11).text("No invoice details for this period.");
      } else {
        let currentDate = null;

        const drawTableHeader = () => {
          doc.moveDown(0.3);
          doc.fontSize(11);
          doc.text("Invoice #", 50, doc.y, { width: 80 });
          doc.text("Customer", 140, doc.y, { width: 250 });
          doc.text("Total (LKR)", 430, doc.y, { width: 120, align: "right" });
          doc.moveDown(0.3);
          doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
        };

        detailRows.forEach((row) => {
          const dateStr = formatDate(row.date);

          // Make sure full row + items fits on the page
          ensureSpace(90);

          // When date changes, print date heading + header row
          if (currentDate !== dateStr) {
            currentDate = dateStr;
            doc.moveDown(0.8);
            doc.fontSize(12).text(dateStr, { underline: true });
            drawTableHeader();
          }

          const customer =
            row.customer_name && row.customer_name.trim().length > 0
              ? row.customer_name
              : "Walk-in Customer";

          // --- main table row: Invoice # | Customer | Total ---
          doc.fontSize(10);
          const yStart = doc.y;

          doc.text(row.invoice_number, 50, yStart, { width: 80 });
          doc.text(customer, 140, yStart, { width: 250 });
          doc.text(Number(row.invoice_total).toFixed(2), 430, yStart, {
            width: 120,
            align: "right",
          });

          doc.moveDown(0.35);

          // --- second line: Items (indented, full width) ---
          doc.fontSize(9);
          doc.text(`Items: ${row.items_summary}`, 60, doc.y, {
            width: 480,
          });

          // separator line between rows + extra spacing
          doc.moveDown(0.5);
          doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
        });
      }

      doc.end();
    } catch (err) {
      console.error("Error in /api/reports/sales/pdf:", err);
      if (!res.headersSent) {
        res
          .status(500)
          .json({ message: "Failed to generate sales PDF report" });
      }
    }
  }
);

/**
 * GET /api/reports/losses/pdf
 * Query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns a PDF file of stock write-off losses (expired + damaged, etc.)
 */
router.get(
  "/losses/pdf",
  authRequired,
  requireRole("ADMIN", "MANAGER"), // ✅ allow MANAGER here too
  async (req, res) => {
    try {
      let { from, to } = req.query;

      // Default to last 30 days if not provided
      if (!from || !to) {
        const today = new Date();
        const toDate = today.toISOString().slice(0, 10);

        const past = new Date();
        past.setDate(past.getDate() - 30);
        const fromDate = past.toISOString().slice(0, 10);

        from = from || fromDate;
        to = to || toDate;
      }

      // ---- Summary by reason (EXPIRED, DAMAGED, etc.) ----
      const reasonSummaryRes = await pool.query(
        `
        SELECT
          reason,
          COALESCE(SUM(total_cost), 0) AS total_loss
        FROM stock_write_offs
        WHERE write_off_date::date BETWEEN $1 AND $2
        GROUP BY reason
        ORDER BY reason;
        `,
        [from, to]
      );
      const reasonSummary = reasonSummaryRes.rows || [];

      // ---- Daily summary ----
      const dailySummaryRes = await pool.query(
        `
        SELECT
          write_off_date::date AS date,
          COALESCE(SUM(total_cost), 0) AS total_loss
        FROM stock_write_offs
        WHERE write_off_date::date BETWEEN $1 AND $2
        GROUP BY write_off_date::date
        ORDER BY write_off_date::date;
        `,
        [from, to]
      );
      const dailySummary = dailySummaryRes.rows || [];

      // ---- Detailed rows ----
      const detailsRes = await pool.query(
        `
        SELECT
          swo.write_off_date::date AS date,
          p.name AS product_name,
          pb.batch_code,
          swo.quantity,
          swo.unit_cost,
          swo.total_cost,
          swo.reason,
          u.username AS created_by
        FROM stock_write_offs swo
        JOIN products p ON p.id = swo.product_id
        LEFT JOIN product_batches pb ON pb.id = swo.batch_id
        LEFT JOIN users u ON u.id = swo.created_by
        WHERE swo.write_off_date::date BETWEEN $1 AND $2
        ORDER BY swo.write_off_date::date, p.name;
        `,
        [from, to]
      );
      const detailRows = detailsRes.rows || [];

      // ---- Compute totals ----
      let totalLoss = 0;
      let expiredLoss = 0;
      let otherLoss = 0;

      reasonSummary.forEach((row) => {
        const amount = Number(row.total_loss) || 0;
        totalLoss += amount;
        if ((row.reason || "").toUpperCase() === "EXPIRED") {
          expiredLoss += amount;
        } else {
          otherLoss += amount;
        }
      });

      // ---- Build PDF ----
      const doc = new PDFDocument({ margin: 40 });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="loss-report-${from}-to-${to}.pdf"`
      );

      doc.pipe(res);

      const formatDate = (isoOrDate) =>
        new Date(isoOrDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

      const ensureSpace = (needed = 60) => {
        const bottom = doc.page.height - doc.page.margins.bottom;
        if (doc.y + needed > bottom) {
          doc.addPage();
        }
      };

      // Useful x-positions so header + rows line up nicely
      const LEFT = 50;
      const RIGHT = 550;
      const COL_DATE = LEFT;
      const COL_PRODUCT = 110;
      const COL_BATCH = 280;
      const COL_QTY = 360;
      const COL_UNIT = 405;
      const COL_REASON = 455;
      const COL_TOTAL = 515; // last column (Total)

      // ===== TITLE =====
      doc
        .fontSize(18)
        .text("Stock Loss Report", { align: "center" })
        .moveDown(0.5);

      // Date range
      doc
        .fontSize(12)
        .text(`From: ${from}`, { align: "left" })
        .text(`To:   ${to}`, { align: "left" })
        .moveDown(0.7);

      // ===== SUMMARY SECTION =====
      doc.fontSize(14).text("Summary", { align: "left" }).moveDown(0.4);

      doc.fontSize(12);
      doc.text(`Total loss (all reasons): Rs. ${totalLoss.toFixed(2)}`);
      doc.text(`Due to expiry:           Rs. ${expiredLoss.toFixed(2)}`);
      doc.text(`Other reasons:           Rs. ${otherLoss.toFixed(2)}`);
      doc.moveDown(0.6);

      if (reasonSummary.length > 0) {
        doc.fontSize(12).text("Loss by Reason:", { underline: true });
        reasonSummary.forEach((row) => {
          const reason = row.reason || "UNKNOWN";
          const amt = Number(row.total_loss) || 0;
          doc.fontSize(11).text(`• ${reason}: Rs. ${amt.toFixed(2)}`);
        });
        doc.moveDown(0.6);
      } else {
        doc
          .fontSize(11)
          .text("No write-offs recorded in this period.")
          .moveDown(0.6);
      }

      // ===== DAILY LOSS SUMMARY TABLE =====
      if (dailySummary.length > 0) {
        ensureSpace(80);
        doc.fontSize(13).text("Daily Loss Summary", { align: "left" });
        doc.moveDown(0.4);

        doc.fontSize(11);
        doc.text("Date", LEFT, doc.y, { width: 100 });
        doc.text("Total Loss (LKR)", 260, doc.y, { width: 150 });
        doc.moveDown(0.35);
        doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).stroke();

        dailySummary.forEach((row) => {
          const dateStr = formatDate(row.date);
          const amt = Number(row.total_loss).toFixed(2);

          ensureSpace(24);
          doc.moveDown(0.35);
          const yRow = doc.y;

          doc.text(dateStr, LEFT, yRow, { width: 120 });
          doc.text(amt, 260, yRow, { width: 150 });
        });

        doc.moveDown(0.9);
      }

      // ===== DETAILED WRITE-OFFS TABLE =====
      ensureSpace(90);
      doc.fontSize(13).text("Detailed Write-offs", { align: "left" });
      doc.moveDown(0.8);

      if (detailRows.length === 0) {
        doc.fontSize(11).text("No write-off records found for this period.");
      } else {
        const drawDetailHeader = () => {
          doc.fontSize(11);
          const headerY = doc.y;

          doc.text("Date", COL_DATE, headerY, { width: 65 });
          doc.text("Product", COL_PRODUCT, headerY, { width: 160 });
          doc.text("Batch", COL_BATCH, headerY, { width: 70 });
          doc.text("Qty", COL_QTY, headerY, { width: 30, align: "right" });
          doc.text("Unit", COL_UNIT, headerY, { width: 45, align: "right" });
          doc.text("Reason", COL_REASON, headerY, { width: 60 });
          doc.text("Total", COL_TOTAL, headerY, { width: 60, align: "right" });

          doc.moveDown(0.4);
          doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).stroke();
        };

        drawDetailHeader();

        const ROW_SPACING = 40;

        detailRows.forEach((row) => {
          ensureSpace(40);

          const dateStr = formatDate(row.date);
          const product = row.product_name || "";
          const batch = row.batch_code || "-";
          const qty = Number(row.quantity || 0);
          const unit = Number(row.unit_cost || 0).toFixed(2);
          const total = Number(row.total_cost || 0).toFixed(2);
          const reason = row.reason || "";

          doc.moveDown(0.9);

          doc.fontSize(10);
          const y = doc.y;

          doc.text(dateStr, COL_DATE, y, { width: 55 });
          doc.text(product, COL_PRODUCT, y, { width: 160 });
          doc.text(batch, COL_BATCH, y, { width: 70 });
          doc.text(String(qty), COL_QTY, y, {
            width: 30,
            align: "right",
          });
          doc.text(unit, COL_UNIT, y, {
            width: 45,
            align: "right",
          });
          doc.text(reason, COL_REASON, y, { width: 60 });
          doc.text(total, COL_TOTAL, y, {
            width: 60,
            align: "right",
          });

          doc.y = y + ROW_SPACING;

          doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).stroke();
          doc.moveDown(0.9);
        });
      }

      doc.end();
    } catch (err) {
      console.error("Error in /api/reports/losses/pdf:", err);
      if (!res.headersSent) {
        res
          .status(500)
          .json({ message: "Failed to generate loss PDF report" });
      }
    }
  }
);

module.exports = router;
