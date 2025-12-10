// backend/routes/productRoutes.js
const express = require('express');
const pool = require('../db');
const { authRequired, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/products  (list all)
router.get('/', authRequired, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, s.name AS supplier_name
       FROM products p
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       ORDER BY p.id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// POST /api/products  (create new product) – only ADMIN or MANAGER
router.post(
  '/',
  authRequired,
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    const { name, category, unit_price, reorder_level, supplier_id } = req.body;

    try {
      const result = await pool.query(
        `INSERT INTO products (name, category, unit_price, reorder_level, supplier_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, category, unit_price, reorder_level, supplier_id || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to create product' });
    }
  }
);

module.exports = router;
