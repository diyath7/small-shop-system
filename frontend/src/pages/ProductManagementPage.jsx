// src/pages/ProductManagementPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import "./DashboardPage.css";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

const ProductManagementPage = () => {
  const { user, token } = useAuth();

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]); // 🔹 NEW

  const [form, setForm] = useState({
    name: "",
    category: "",
    unit_price: "",
    reorder_level: "",
    supplier_id: "",
  });

  // null = Add mode, id = Edit mode
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // 🔽 sorting state for Products table
  const [sortField, setSortField] = useState("name"); // default: name
  const [sortDirection, setSortDirection] = useState("asc"); // "asc" or "desc"

  // 🔁 Load product list + suppliers from backend
  useEffect(() => {
    if (!token) {
      setErrorMessage("No auth token found. Please login again.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [prodRes, supplierRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/products`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE_URL}/api/suppliers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setProducts(prodRes.data || []);

        // sort suppliers by name so dropdown is nice
        const supplierList = (supplierRes.data || []).slice().sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        );
        setSuppliers(supplierList);
      } catch (err) {
        console.error(err);
        const backendMsg =
          err.response?.data?.error || err.response?.data?.message;
        setErrorMessage(
          backendMsg || "Failed to load products / suppliers."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const clearForm = () => {
    setForm({
      name: "",
      category: "",
      unit_price: "",
      reorder_level: "",
      supplier_id: "",
    });
    setEditingId(null);
    setErrorMessage("");
    setSuccessMessage("");
  };

  // When user clicks "Edit" in table
  const startEdit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      category: product.category || "",
      unit_price: product.unit_price ?? "",
      reorder_level: product.reorder_level ?? "",
      supplier_id: product.supplier_id ?? "",
    });
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!token) {
      setErrorMessage("No auth token found. Please login again.");
      return;
    }

    if (!form.name.trim() || !form.category.trim() || !form.unit_price) {
      setErrorMessage("Please fill at least Name, Category and Unit Price.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      unit_price: Number(form.unit_price),
      reorder_level: form.reorder_level ? Number(form.reorder_level) : 0,
      supplier_id: form.supplier_id || null, // 🔹 null = no supplier
    };

    try {
      setSaving(true);

      if (editingId) {
        // 🔁 UPDATE existing product
        const res = await axios.put(
          `${API_BASE_URL}/api/products/${editingId}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const updated = res.data;
        setProducts((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
        setSuccessMessage("Product updated successfully.");
      } else {
        // ➕ CREATE new product
        const res = await axios.post(`${API_BASE_URL}/api/products`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setProducts((prev) => [...prev, res.data]);
        setSuccessMessage("Product created successfully.");
      }

      clearForm();
    } catch (err) {
      console.error(err);
      const backendMsg =
        err.response?.data?.error || err.response?.data?.message;
      setErrorMessage(backendMsg || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  // 🔽 handle clicking on table headers
  const handleSort = (field) => {
    setSortField((prevField) => {
      if (prevField === field) {
        setSortDirection((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevField;
      } else {
        setSortDirection("asc");
        return field;
      }
    });
  };

  // 🔽 sorted list of products
  const sortedProducts = useMemo(() => {
    const copy = [...products];
    const dir = sortDirection === "asc" ? 1 : -1;

    copy.sort((a, b) => {
      let valA;
      let valB;

      switch (sortField) {
        case "name":
        case "category":
        case "supplier_name":
          valA = (a[sortField] || "").toString().toLowerCase();
          valB = (b[sortField] || "").toString().toLowerCase();
          break;

        case "unit_price":
        case "reorder_level":
          valA = Number(a[sortField]) || 0;
          valB = Number(b[sortField]) || 0;
          break;

        default:
          valA = (a[sortField] || "").toString();
          valB = (b[sortField] || "").toString();
      }

      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });

    return copy;
  }, [products, sortField, sortDirection]);

  const sortIndicator = (field) =>
    sortField === field ? (sortDirection === "asc" ? " ▲" : " ▼") : "";

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <TopBar />

        <header className="dashboard-header">
          <div>
            <div className="dashboard-title">Add New Products</div>
            <div className="dashboard-subtitle">
              Create new products for the shop and link them with suppliers.
              After creating a product, record stock in the{" "}
              <strong>Purchase Orders / Stock In</strong> screen.
            </div>
          </div>

          <div className="dashboard-user-badge">
            {user ? (
              <>
                Logged in as <strong>{user.username}</strong> ({user.role})
              </>
            ) : (
              "Not logged in"
            )}
          </div>
        </header>

        {/* === New / Edit Product Form === */}
        <section className="chart-card">
          <div className="chart-title">
            {editingId ? "Edit Product" : "New Product"}
          </div>
          <div className="chart-subtitle">
            Fill in the basic details and optionally choose a supplier.
          </div>

          {errorMessage && (
            <div className="invoice-alert invoice-alert-error">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="invoice-alert invoice-alert-success">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              {/* Product name */}
              <div>
                <label className="invoice-label">
                  Product Name <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="invoice-input"
                />
              </div>

              {/* Category */}
              <div>
                <label className="invoice-label">
                  Category <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  className="invoice-input"
                />
              </div>

              {/* Supplier dropdown populated from API */}
              <div>
                <label className="invoice-label">Supplier</label>
                <select
                  value={form.supplier_id || ""}
                  onChange={(e) =>
                    handleChange("supplier_id", e.target.value || "")
                  }
                  className="invoice-input"
                >
                  <option value="">-- No supplier / Not set --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              {/* Unit price */}
              <div>
                <label className="invoice-label">
                  Unit Price (LKR) <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unit_price}
                  onChange={(e) =>
                    handleChange("unit_price", e.target.value)
                  }
                  className="invoice-input"
                />
              </div>

              {/* Reorder level */}
              <div>
                <label className="invoice-label">Reorder Level</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.reorder_level}
                  onChange={(e) =>
                    handleChange("reorder_level", e.target.value)
                  }
                  className="invoice-input"
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={clearForm}
                className="invoice-button-secondary"
              >
                {editingId ? "Cancel Edit" : "Clear"}
              </button>

              <button
                type="submit"
                disabled={saving}
                className="invoice-button-primary"
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Product"
                  : "Save Product"}
              </button>
            </div>
          </form>
        </section>

        {/* === Products table === */}
        <section className="chart-card" style={{ marginTop: "1.5rem" }}>
          <div className="chart-title">Current Products</div>
          <div className="chart-subtitle">
            Products already defined in the system. New products will also
            appear here and in all dropdowns (Invoices, Stock In, Stock
            Management).
          </div>

          {loading ? (
            <div className="chart-placeholder">Loading products...</div>
          ) : sortedProducts.length === 0 ? (
            <div className="chart-placeholder">No products found.</div>
          ) : (
            <div className="invoice-table-wrapper">
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>#</th>

                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("name")}
                    >
                      Name{sortIndicator("name")}
                    </th>

                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("category")}
                    >
                      Category{sortIndicator("category")}
                    </th>

                    <th
                      className="invoice-cell-right"
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("unit_price")}
                    >
                      Unit Price{sortIndicator("unit_price")}
                    </th>

                    <th
                      className="invoice-cell-right"
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("reorder_level")}
                    >
                      Reorder Level{sortIndicator("reorder_level")}
                    </th>

                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("supplier_name")}
                    >
                      Supplier{sortIndicator("supplier_name")}
                    </th>

                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProducts.map((p, index) => (
                    <tr key={p.id}>
                      <td>{index + 1}</td>
                      <td>{p.name}</td>
                      <td>{p.category}</td>
                      <td className="invoice-cell-right">
                        {Number(p.unit_price).toFixed(2)}
                      </td>
                      <td className="invoice-cell-right">
                        {p.reorder_level}
                      </td>
                      <td>{p.supplier_name || "-"}</td>
                      <td>
                        <button
                          type="button"
                          className="invoice-button-secondary"
                          style={{ padding: "4px 10px", fontSize: "12px" }}
                          onClick={() => startEdit(p)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ProductManagementPage;
