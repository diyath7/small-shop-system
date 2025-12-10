// src/pages/PurchaseOrdersPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import "./DashboardPage.css";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

// helper: today in YYYY-MM-DD (for <input type="date" min="...">)
const todayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const makeEmptyItem = () => ({
  product_id: "",
  batch_code: "",
  expiry_date: "",
  quantity: 1,
  unit_cost: "",
  line_total: 0,
});

const PurchaseOrdersPage = () => {
  const { user, token } = useAuth();

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [recentBatches, setRecentBatches] = useState([]);

  // NEW: multi-row items + supplier selection + invoice number
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [items, setItems] = useState([makeEmptyItem()]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // sorting state for Recent Batches table
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");

  // ---------- helpers ----------

  const calcLineTotal = (row) => {
    const qty = Number(row.quantity) || 0;
    const cost = Number(row.unit_cost) || 0;
    return qty * cost;
  };

  const clearForm = () => {
    setSelectedSupplierId("");
    setSupplierInvoiceNo("");
    setItems([makeEmptyItem()]);
    setErrorMessage("");
    setSuccessMessage("");
  };

  // Fetch next supplier invoice number from backend
  const fetchNextSupplierInvoiceNo = async () => {
    if (!token) throw new Error("No auth token");

    const res = await axios.get(
      `${API_BASE_URL}/api/batches/next-supplier-invoice`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const next = res.data?.supplier_invoice_no || "";
    setSupplierInvoiceNo(next);
    return next;
  };

  const handleSupplierChange = async (value) => {
    setSelectedSupplierId(value);
    setItems([makeEmptyItem()]);
    setErrorMessage("");
    setSuccessMessage("");

    if (!value) {
      setSupplierInvoiceNo("");
      return;
    }

    try {
      await fetchNextSupplierInvoiceNo();
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to get next supplier invoice number.");
    }
  };

  const handleItemFieldChange = (index, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      const row = { ...copy[index], [field]: value };
      row.line_total = calcLineTotal(row);
      copy[index] = row;
      return copy;
    });
  };

  const handleProductChange = (index, productId) => {
    const product = products.find(
      (p) => String(p.id) === String(productId)
    );

    setItems((prev) => {
      const copy = [...prev];
      const row = { ...copy[index] };

      row.product_id = productId || "";

      // default unit_cost from product.unit_price if available
      if (product) {
        row.unit_cost = product.unit_price || 0;
      }

      row.line_total = calcLineTotal(row);
      copy[index] = row;
      return copy;
    });
  };

  const addRow = () => {
    setItems((prev) => [...prev, makeEmptyItem()]);
  };

  const removeRow = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------- loading data (products + suppliers + recent batches) ----------

  useEffect(() => {
    if (!token) {
      setErrorMessage("No auth token found. Please login again.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [prodRes, batchRes, supplierRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/products`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE_URL}/api/batches/recent`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE_URL}/api/suppliers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setProducts(prodRes.data || []);
        setRecentBatches(batchRes.data || []);
        setSuppliers(supplierRes.data || []);
      } catch (err) {
        console.error(err);
        const backendMsg =
          err.response?.data?.error || err.response?.data?.message;
        setErrorMessage(
          backendMsg || "Failed to load products / batches / suppliers."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // ---------- product filtering & grouping ----------

  const productsForSupplier = useMemo(() => {
    if (!selectedSupplierId) return products;

    return products.filter(
      (p) =>
        p.supplier_id != null &&
        String(p.supplier_id) === String(selectedSupplierId)
    );
  }, [products, selectedSupplierId]);

  const groupedProducts = useMemo(() => {
    const map = {};
    productsForSupplier.forEach((p) => {
      const cat = p.category || "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, list]) => ({
        category,
        products: list.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [productsForSupplier]);

  // ---------- totals for this purchase order ----------

  const orderTotal = items.reduce(
    (sum, row) => sum + (Number(row.line_total) || 0),
    0
  );

  // ---------- submit multi-item purchase order ----------

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!token) {
      setErrorMessage("No auth token found. Please login again.");
      return;
    }

    if (!selectedSupplierId) {
      setErrorMessage("Please select a supplier for this purchase order.");
      return;
    }

    const validItems = items.filter(
      (row) =>
        row.product_id &&
        row.batch_code.trim() &&
        Number(row.quantity) > 0 &&
        Number(row.unit_cost) >= 0
    );

    if (validItems.length === 0) {
      setErrorMessage("Please add at least one valid item.");
      return;
    }

    // expiry date cannot be in past
    const today = new Date(todayISO());
    for (const row of validItems) {
      if (row.expiry_date) {
        const selected = new Date(row.expiry_date);
        if (selected < today) {
          setErrorMessage(
            "Expiry date cannot be in the past (check your items)."
          );
          return;
        }
      }
    }

    // ensure we have an invoice number
    let invNo = supplierInvoiceNo;
    try {
      if (!invNo) {
        invNo = await fetchNextSupplierInvoiceNo();
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to generate supplier invoice number.");
      return;
    }

    if (!invNo) {
      setErrorMessage("Supplier invoice number is empty.");
      return;
    }

    try {
      setSaving(true);

      // one POST per item
      const responses = await Promise.all(
        validItems.map((row) =>
          axios.post(
            `${API_BASE_URL}/api/batches`,
            {
              product_id: Number(row.product_id),
              batch_code: row.batch_code.trim(),
              expiry_date: row.expiry_date || null,
              quantity: Number(row.quantity),
              unit_cost: Number(row.unit_cost),
              supplier_id: Number(selectedSupplierId),
              supplier_invoice_no: invNo,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          )
        )
      );

      const supplier = suppliers.find(
        (s) => String(s.id) === String(selectedSupplierId)
      );

      const newRows = responses.map((res, idx) => {
        const savedBatch = res.data;
        const row = validItems[idx];

        const prod = products.find(
          (p) => String(p.id) === String(row.product_id)
        );

        return {
          ...savedBatch,
          product_name: prod ? prod.name : `Product #${row.product_id}`,
          category: prod ? prod.category : "",
          supplier_name: supplier ? supplier.name : null,
        };
      });

      // prepend new rows to recentBatches
      setRecentBatches((prev) => [...newRows, ...prev].slice(0, 20));

      setSuccessMessage(
        `Saved ${validItems.length} batch(es) for ${
          supplier ? supplier.name : "supplier"
        } – Invoice ${invNo}.`
      );

      // reset only item rows; keep supplier & invoice no in case they want to add more
      setItems([makeEmptyItem()]);
    } catch (err) {
      console.error(err);
      const backendMsg =
        err.response?.data?.error || err.response?.data?.message;
      setErrorMessage(
        backendMsg || "Failed to save purchase order batches."
      );
    } finally {
      setSaving(false);
    }
  };

  // ---------- sorting recent batches ----------

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

  const sortedBatches = useMemo(() => {
    const copy = [...recentBatches];
    const dir = sortDirection === "asc" ? 1 : -1;

    copy.sort((a, b) => {
      let valA;
      let valB;

      switch (sortField) {
        case "product_name":
        case "category":
        case "batch_code":
        case "supplier_name":
        case "supplier_invoice_no":
          valA = (a[sortField] || "").toString().toLowerCase();
          valB = (b[sortField] || "").toString().toLowerCase();
          break;

        case "quantity":
        case "unit_cost":
          valA = Number(a[sortField]) || 0;
          valB = Number(b[sortField]) || 0;
          break;

        case "expiry_date":
        case "created_at":
          valA = a[sortField] ? new Date(a[sortField]).getTime() : 0;
          valB = b[sortField] ? new Date(b[sortField]).getTime() : 0;
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
  }, [recentBatches, sortField, sortDirection]);

  const sortIndicator = (field) =>
    sortField === field ? (sortDirection === "asc" ? " ▲" : " ▼") : "";

  // ---------- render ----------

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <TopBar />

        <header className="dashboard-header">
          <div>
            <div className="dashboard-title">Purchase Orders / Stock In</div>
            <div className="dashboard-subtitle">
              Create supplier bills with multiple items. Each row becomes a
              product batch; all rows share the same supplier & supplier
              invoice number.
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

        {/* === Create Supplier Bill === */}
        <section className="chart-card">
          <div className="chart-title">Create Supplier Bill</div>
          <div className="chart-subtitle">
            Select a supplier, then add one or more items from that supplier.
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

          {loading ? (
            <div className="chart-placeholder">
              Loading products / suppliers...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="invoice-form">
              {/* Supplier + invoice number row */}
              <div className="invoice-row-top">
                <div className="invoice-field">
                  <label>Supplier</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                  >
                    <option value="">-- Select supplier --</option>
                    {suppliers
                      .slice()
                      .sort((a, b) =>
                        (a.name || "").localeCompare(b.name || "")
                      )
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="invoice-field">
                  <label>Supplier Invoice No (auto)</label>
                  <input
                    type="text"
                    value={supplierInvoiceNo}
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                    placeholder="Will auto-fill when supplier is chosen"
                  />
                </div>
              </div>

              {/* Items table */}
              <div className="invoice-table-wrapper">
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th style={{ width: "26%" }}>Product</th>
                      <th style={{ width: "16%" }}>Batch Code</th>
                      <th style={{ width: "16%" }}>Expiry Date</th>
                      <th>Qty</th>
                      <th>Unit Cost</th>
                      <th>Line Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>

                        {/* Product */}
                        <td>
                          <select
                            value={row.product_id}
                            onChange={(e) =>
                              handleProductChange(index, e.target.value)
                            }
                            disabled={!selectedSupplierId}
                          >
                            <option value="">
                              {!selectedSupplierId
                                ? "Select supplier first"
                                : groupedProducts.length === 0
                                ? "No products for this supplier"
                                : "-- Select product --"}
                            </option>

                            {groupedProducts.map((group) => (
                              <optgroup
                                key={group.category}
                                label={group.category}
                              >
                                {group.products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </td>

                        {/* Batch code */}
                        <td>
                          <input
                            type="text"
                            value={row.batch_code}
                            onChange={(e) =>
                              handleItemFieldChange(
                                index,
                                "batch_code",
                                e.target.value
                              )
                            }
                            placeholder="e.g. SPR1_2025_01"
                          />
                        </td>

                        {/* Expiry date */}
                        <td>
                          <input
                            type="date"
                            value={row.expiry_date}
                            onChange={(e) =>
                              handleItemFieldChange(
                                index,
                                "expiry_date",
                                e.target.value
                              )
                            }
                            min={todayISO()}
                          />
                        </td>

                        {/* Quantity */}
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) =>
                              handleItemFieldChange(
                                index,
                                "quantity",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        {/* Unit cost */}
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.unit_cost}
                            onChange={(e) =>
                              handleItemFieldChange(
                                index,
                                "unit_cost",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        {/* Line total */}
                        <td className="invoice-cell-right">
                          {Number(row.line_total).toFixed(2)}
                        </td>

                        {/* Remove */}
                        <td>
                          <button
                            type="button"
                            className="invoice-btn-sm"
                            onClick={() => removeRow(index)}
                            disabled={items.length === 1}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className="invoice-btn-secondary"
                onClick={addRow}
              >
                + Add Item
              </button>

              {/* footer: total + actions */}
              <div className="invoice-footer-row">
                <div>
                  <div className="invoice-total">
                    Total Cost:{" "}
                    <span className="invoice-total-amount">
                      LKR {orderTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="invoice-footer-actions">
                  <button
                    type="submit"
                    className="invoice-btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Purchase Order"}
                  </button>
                  <button
                    type="button"
                    className="invoice-btn-secondary"
                    onClick={clearForm}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </form>
          )}
        </section>

        {/* === Recent batches table === */}
        <section className="chart-card" style={{ marginTop: "1.5rem" }}>
          <div className="chart-title">Recent Stock Batches</div>
          <div className="chart-subtitle">
            Latest batches recorded in the system (for reference).
          </div>

          {loading ? (
            <div className="chart-placeholder">Loading recent batches...</div>
          ) : sortedBatches.length === 0 ? (
            <div className="chart-placeholder">No batches recorded yet.</div>
          ) : (
            <div className="invoice-table-wrapper">
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>#</th>

                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("product_name")}
                    >
                      Product{sortIndicator("product_name")}
                    </th>

                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("category")}
                    >
                      Category{sortIndicator("category")}
                    </th>

                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("supplier_name")}
                    >
                      Supplier{sortIndicator("supplier_name")}
                    </th>

                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("batch_code")}
                    >
                      Batch Code{sortIndicator("batch_code")}
                    </th>

                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("supplier_invoice_no")}
                    >
                      Supplier Inv. No.
                      {sortIndicator("supplier_invoice_no")}
                    </th>

                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("expiry_date")}
                    >
                      Expiry{sortIndicator("expiry_date")}
                    </th>

                    <th
                      className="invoice-cell-right"
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("quantity")}
                    >
                      Qty{sortIndicator("quantity")}
                    </th>

                    <th
                      className="invoice-cell-right"
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("unit_cost")}
                    >
                      Unit Cost{sortIndicator("unit_cost")}
                    </th>

                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("created_at")}
                    >
                      Created At{sortIndicator("created_at")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBatches.map((b, index) => (
                    <tr key={b.id}>
                      <td>{index + 1}</td>
                      <td>{b.product_name}</td>
                      <td>{b.category}</td>
                      <td>{b.supplier_name || "-"}</td>
                      <td>{b.batch_code}</td>
                      <td>{b.supplier_invoice_no || "-"}</td>
                      <td>
                        {b.expiry_date
                          ? new Date(b.expiry_date).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="invoice-cell-right">{b.quantity}</td>
                      <td className="invoice-cell-right">
                        {Number(b.unit_cost).toFixed(2)}
                      </td>
                      <td>
                        {b.created_at
                          ? new Date(b.created_at).toLocaleString()
                          : "-"}
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

export default PurchaseOrdersPage;
