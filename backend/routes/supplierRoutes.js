// backend/routes/supplierRoutes.js
const express = require('express');
const pool = require('../db');
const { authRequired, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GET /api/suppliers
 * List all suppliers (for dropdowns + management screens)
 */
router.get(
  '/',
  authRequired,
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT * FROM suppliers ORDER BY name ASC'
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
  }
);

/**
 * POST /api/suppliers
 * Create a new supplier
 * Body: { name, phone, email, address }
 */
router.post(
  '/',
  authRequired,
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    const { name, phone, email, address } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Supplier name is required.' });
    }

    try {
      const result = await pool.query(
        `
        INSERT INTO suppliers (name, phone, email, address)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [name.trim(), phone || null, email || null, address || null]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating supplier:', err);
      res.status(500).json({ error: 'Failed to create supplier' });
    }
  }
);

/**
 * PUT /api/suppliers/:id
 * Update existing supplier
 */
router.put(
  '/:id',
  authRequired,
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    const { id } = req.params;
    const { name, phone, email, address } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Supplier name is required.' });
    }

    try {
      const result = await pool.query(
        `
        UPDATE suppliers
        SET name = $1,
            phone = $2,
            email = $3,
            address = $4
        WHERE id = $5
        RETURNING *
        `,
        [name.trim(), phone || null, email || null, address || null, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Supplier not found.' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error updating supplier:', err);
      res.status(500).json({ error: 'Failed to update supplier' });
    }
  }
);

/**
 * DELETE /api/suppliers/:id
 * Safely delete supplier:
 *  - set supplier_id = NULL on products and product_batches
 *  - then delete supplier
 */
router.delete(
  '/:id',
  authRequired,
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    const { id } = req.params;

    try {
      // Clear references first
      await pool.query(
        'UPDATE products SET supplier_id = NULL WHERE supplier_id = $1',
        [id]
      );
      await pool.query(
        'UPDATE product_batches SET supplier_id = NULL WHERE supplier_id = $1',
        [id]
      );

      // Now delete supplier
      const result = await pool.query(
        'DELETE FROM suppliers WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Supplier not found.' });
      }

      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting supplier:', err);
      res.status(500).json({ error: 'Failed to delete supplier' });
    }
  }
);

module.exports = router;
