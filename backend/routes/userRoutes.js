// backend/routes/userRoutes.js
const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");
const { authRequired, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * Helper: can MANAGER touch this user?
 * - Managers can only manage CASHIER accounts
 */
async function ensureManagerCanTouchUser(req, res, userId) {
  if (req.user.role !== "MANAGER") return true; // only restrict managers

  const target = await pool.query(
    `SELECT u.id, r.name AS role
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.id = $1`,
    [userId]
  );

  if (target.rows.length === 0) {
    res.status(404).json({ message: "User not found" });
    return false;
  }

  const targetRole = target.rows[0].role;

  if (targetRole !== "CASHIER") {
    res
      .status(403)
      .json({ message: "Managers can only manage CASHIER accounts" });
    return false;
  }

  return true;
}

/**
 * GET /api/users
 * List all users (ADMIN + MANAGER only)
 */
router.get(
  "/",
  authRequired,
  requireRole("ADMIN", "MANAGER"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT u.id,
                u.username,
                r.name AS role,
                u.created_at
         FROM users u
         JOIN roles r ON u.role_id = r.id
         ORDER BY u.id ASC`
      );

      res.json(result.rows);
    } catch (err) {
      console.error("GET /users error", err);
      res.status(500).json({ message: "Failed to load users" });
    }
  }
);

/**
 * POST /api/users
 * Create a new user
 * - ADMIN: can create any role
 * - MANAGER: can ONLY create CASHIER (role is forced to CASHIER)
 */
router.post(
  "/",
  authRequired,
  requireRole("ADMIN", "MANAGER"),
  async (req, res) => {
    const { username, password, roleName } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    try {
      // check duplicate username
      const existing = await pool.query(
        "SELECT id FROM users WHERE username = $1",
        [username]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ message: "Username already exists" });
      }

      let finalRoleName = roleName || "CASHIER";

      // managers are only allowed to create cashiers
      if (req.user.role === "MANAGER") {
        finalRoleName = "CASHIER";
      }

      const roleRes = await pool.query(
        "SELECT id FROM roles WHERE name = $1",
        [finalRoleName]
      );
      if (roleRes.rows.length === 0) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const roleId = roleRes.rows[0].id;
      const hash = await bcrypt.hash(password, 10);

      const insertRes = await pool.query(
        `INSERT INTO users (username, password_hash, role_id)
         VALUES ($1, $2, $3)
         RETURNING id, username, role_id, created_at`,
        [username, hash, roleId]
      );

      const newUser = insertRes.rows[0];

      // attach role name in response
      newUser.role = finalRoleName;

      res.status(201).json(newUser);
    } catch (err) {
      console.error("POST /users error", err);
      res.status(500).json({ message: "Failed to create user" });
    }
  }
);

/**
 * PUT /api/users/:id
 * Update username / password / role
 * - ADMIN: can change anything
 * - MANAGER: can ONLY modify CASHIER accounts, and role is forced to CASHIER
 */
router.put(
  "/:id",
  authRequired,
  requireRole("ADMIN", "MANAGER"),
  async (req, res) => {
    const { id } = req.params;
    const { username, password, roleName } = req.body;

    try {
      // managers: verify target is CASHIER
      const ok = await ensureManagerCanTouchUser(req, res, id);
      if (!ok) return;

      let updates = [];
      let params = [];
      let idx = 1;

      if (username) {
        updates.push(`username = $${idx++}`);
        params.push(username);
      }

      if (password) {
        const hash = await bcrypt.hash(password, 10);
        updates.push(`password_hash = $${idx++}`);
        params.push(hash);
      }

      let finalRoleId = null;
      let finalRoleName = null;

      if (roleName) {
        let useRoleName = roleName;

        if (req.user.role === "MANAGER") {
          // managers cannot change role to anything else
          useRoleName = "CASHIER";
        }

        const roleRes = await pool.query(
          "SELECT id, name FROM roles WHERE name = $1",
          [useRoleName]
        );
        if (roleRes.rows.length === 0) {
          return res.status(400).json({ message: "Invalid role" });
        }

        finalRoleId = roleRes.rows[0].id;
        finalRoleName = roleRes.rows[0].name;
        updates.push(`role_id = $${idx++}`);
        params.push(finalRoleId);
      }

      if (updates.length === 0) {
        return res
          .status(400)
          .json({ message: "No fields provided to update" });
      }

      params.push(id);

      const updateRes = await pool.query(
        `UPDATE users
         SET ${updates.join(", ")}
         WHERE id = $${idx}
         RETURNING id, username, role_id, created_at`,
        params
      );

      if (updateRes.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = updateRes.rows[0];

      // attach role name in response if we changed it
      if (finalRoleName) {
        updatedUser.role = finalRoleName;
      }

      res.json(updatedUser);
    } catch (err) {
      console.error("PUT /users/:id error", err);
      res.status(500).json({ message: "Failed to update user" });
    }
  }
);

/**
 * DELETE /api/users/:id
 * - ADMIN: can delete any user (you may want to protect the very first admin id=1 later if needed)
 * - MANAGER: can ONLY delete CASHIER users
 */
router.delete(
  "/:id",
  authRequired,
  requireRole("ADMIN", "MANAGER"),
  async (req, res) => {
    const { id } = req.params;

    try {
      // managers: verify target is CASHIER
      const ok = await ensureManagerCanTouchUser(req, res, id);
      if (!ok) return;

      const delRes = await pool.query(
        "DELETE FROM users WHERE id = $1 RETURNING id",
        [id]
      );

      if (delRes.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted" });
    } catch (err) {
      console.error("DELETE /users/:id error", err);
      res.status(500).json({ message: "Failed to delete user" });
    }
  }
);

module.exports = router;
