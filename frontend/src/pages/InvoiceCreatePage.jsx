// src/pages/InvoiceCreatePage.jsx
import React, { useEffect, useState, useMemo } from "react";
import "./DashboardPage.css";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

// Use LOCAL date (no UTC shift)
const todayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`; // YYYY-MM-DD for <input type="date">
};

const emptyItem = {
  product_id: "",
  quantity: 1,
  unit_price: 0,
  line_total: 0,
};

const InvoiceCreatePage = () => {
  const { user } = useAuth();

  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([emptyItem]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);

  // 🔴 now an array of messages, not a single string
  const [errorMessages, setErrorMessages] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [discount, setDiscount] = useState(0);

  // invoice data used for printing
  const [printInvoice, setPrintInvoice] = useState(null);

  // 🔹 Group products by category (for nicer dropdown)
  const groupedProducts = useMemo(() => {
    const map = {};
    products.forEach((p) => {
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
  }, [products]);

  // Load products
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMessages(["No auth token found. Please login again."]);
      setLoadingProducts(false);
      return;
    }

    const fetchProducts = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/products`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProducts(res.data || []);
      } catch (err) {
        console.error(err);
        setErrorMessages(["Failed to load products."]);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // helper: recompute line total
  const updateLineTotal = (item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    return qty * price;
  };

  // Subtotal / discount / grand total for the form
  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.line_total) || 0),
    0
  );
  const discountAmount = Number(discount) || 0;
  const grandTotal = Math.max(0, subtotal - discountAmount);

  const handleProductChange = (index, productId) => {
    const product = products.find((p) => String(p.id) === String(productId));

    setItems((prev) => {
      const copy = [...prev];
      const current = { ...copy[index] };

      current.product_id = productId || "";

      if (product) {
        current.unit_price = product.unit_price || product.selling_price || 0;
      }

      current.line_total = updateLineTotal(current);
      copy[index] = current;
      return copy;
    });
  };

  const handleFieldChange = (index, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      const current = { ...copy[index] };

      current[field] = value;
      current.line_total = updateLineTotal(current);

      copy[index] = current;
      return copy;
    });
  };

  const addRow = () => {
    setItems((prev) => [...prev, { ...emptyItem }]);
  };

  const removeRow = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const clearForm = () => {
    setCustomerName("Walk-in Customer");
    setInvoiceDate(todayISO());
    setItems([emptyItem]);
    setDiscount(0);
    setErrorMessages([]);
    setSuccessMessage("");
  };

  // When printInvoice gets data, trigger window.print()
  useEffect(() => {
    if (!printInvoice) return;

    const previousTitle = document.title;
    const safeNumber = printInvoice.invoice_number || "Receipt";
    document.title = `Invoice_${safeNumber}`;

    const timer = setTimeout(() => {
      window.print();
    }, 300);

    const handleAfterPrint = () => {
      document.title = previousTitle;

      clearForm();
      setPrintInvoice(null);
      window.removeEventListener("afterprint", handleAfterPrint);
    };

    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.title = previousTitle;
    };
  }, [printInvoice]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessages([]);
    setSuccessMessage("");

    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMessages(["No auth token found. Please login again."]);
      return;
    }

    if (!customerName.trim()) {
      setErrorMessages(["Customer name is required."]);
      return;
    }

    const validItems = items.filter(
      (it) =>
        it.product_id &&
        Number(it.quantity) > 0 &&
        Number(it.unit_price) >= 0
    );

    if (validItems.length === 0) {
      setErrorMessages(["Please add at least one valid invoice item."]);
      return;
    }

    const payload = {
      customer_name: customerName,
      invoice_date: invoiceDate,
      discount: discountAmount,
      items: validItems.map((it) => ({
        product_id: Number(it.product_id),
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
      })),
    };

    setSaving(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/invoices`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const { invoice_number, id } = res.data || {};

      setSuccessMessage(
        `Invoice created successfully! ${
          invoice_number
            ? `Invoice No: ${invoice_number}`
            : id
            ? `Invoice ID: ${id}`
            : ""
        }`
      );

      const printableItems = validItems.map((it) => {
        const product = products.find(
          (p) => String(p.id) === String(it.product_id)
        );
        const unitPrice = Number(it.unit_price);
        const qty = Number(it.quantity);
        return {
          code: product ? `[ITEM_${String(product.id).padStart(4, "0")}]` : "",
          name: product ? product.name : `Product ${it.product_id}`,
          quantity: qty,
          unit_price: unitPrice,
          line_total: unitPrice * qty,
        };
      });

      const subtotalValue = printableItems.reduce(
        (sum, it) => sum + it.line_total,
        0
      );
      const total = Math.max(0, subtotalValue - discountAmount);

      const finalInvoiceNumber = invoice_number || (id ? `INV${id}` : "");

      setPrintInvoice({
        invoice_number: finalInvoiceNumber,
        customer_name: customerName,
        invoice_date: invoiceDate,
        items: printableItems,
        subtotal: subtotalValue,
        discount: discountAmount,
        total,
        cashier: user?.username || "",
      });
    } catch (err) {
      console.error(err);

      const backendMsg =
        err.response?.data?.error || err.response?.data?.message;
      const backendErrors = err.response?.data?.errors;

      if (Array.isArray(backendErrors) && backendErrors.length > 0) {
        // our multi-line stock errors
        setErrorMessages(backendErrors);
      } else if (backendMsg) {
        setErrorMessages([backendMsg]);
      } else {
        setErrorMessages(["Failed to create invoice."]);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* ===== PRINT LAYOUT (only visible when printing) ===== */}
      {printInvoice && (
        <div className="print-only">
          <div className="print-invoice-page">
            {/* Header */}
            <div className="print-invoice-header-row">
              <div>
                <div className="print-invoice-shop-name">
                  Sisildiya Enterprises
                </div>
                <div className="print-invoice-contact">
                  <div>28, Saranapala Mw, Piliyandala</div>
                  <div>📞 072-373-8338</div>
                  <div>✉ info@sisildiya.lk</div>
                </div>
              </div>

              <div className="print-invoice-title-block">
                <div className="print-invoice-title">
                  INVOICE&nbsp; {printInvoice.invoice_number || ""}
                </div>
                <div className="print-invoice-date">
                  Date {printInvoice.invoice_date || ""}
                </div>
                <div className="print-invoice-badge">
                  Total Due: {printInvoice.total.toFixed(2)}LKR
                </div>
              </div>
            </div>

            {/* Customer + cashier */}
            <div className="print-invoice-meta-row">
              <div>
                <strong>Bill To:</strong> {printInvoice.customer_name}
              </div>
              {printInvoice.cashier && (
                <div>
                  <strong>Cashier:</strong> {printInvoice.cashier}
                </div>
              )}
            </div>

            {/* Items table */}
            <table className="print-invoice-items-table">
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>Item Description</th>
                  <th>Unit Price</th>
                  <th>Quantity</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {printInvoice.items.map((it, idx) => (
                  <tr key={idx}>
                    <td>
                      {it.code && <span>{it.code} </span>}
                      {it.name}
                    </td>
                    <td>{it.unit_price.toFixed(2)} LKR</td>
                    <td>{it.quantity}</td>
                    <td>{it.line_total.toFixed(2)} LKR</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Payment + summary */}
            <div className="print-invoice-bottom-row">
              <div className="print-invoice-payment-box">
                Payment Method: <strong>Cash</strong>
              </div>

              <div className="print-invoice-summary">
                <div className="print-invoice-summary-row">
                  <span>SUB TOTAL</span>
                  <span>{printInvoice.subtotal.toFixed(2)} LKR</span>
                </div>

                <div className="print-invoice-summary-row">
                  <span>DISCOUNT</span>
                  <span>{printInvoice.discount.toFixed(2)} LKR</span>
                </div>

                <div className="print-invoice-summary-row total">
                  <span>TOTAL DUE</span>
                  <span>{printInvoice.total.toFixed(2)} LKR</span>
                </div>
              </div>
            </div>

            <div className="print-invoice-footer-note">
              Thank you for your business!
            </div>
          </div>
        </div>
      )}

      {/* ===== NORMAL SCREEN LAYOUT ===== */}
      <div className="dashboard-layout screen-only">
        <Sidebar />

        <main className="dashboard-main">
          <TopBar />

          <header className="dashboard-header">
            <div>
              <div className="dashboard-title">New Invoice</div>
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

          <section className="chart-card invoice-card">
            {errorMessages.length > 0 && (
              <div className="invoice-alert invoice-alert-error">
                <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                  {errorMessages.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}
            {successMessage && (
              <div className="invoice-alert invoice-alert-success">
                {successMessage}
              </div>
            )}

            <form className="invoice-form" onSubmit={handleSubmit}>
              {/* top row */}
              <div className="invoice-row-top">
                <div className="invoice-field">
                  <label>Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div className="invoice-field">
                  <label>Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
              </div>

              {/* items table */}
              <div className="invoice-table-wrapper">
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th style={{ width: "40%" }}>Product</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Line Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>
                          <select
                            value={item.product_id}
                            onChange={(e) =>
                              handleProductChange(index, e.target.value)
                            }
                            disabled={loadingProducts}
                          >
                            <option value="">
                              {loadingProducts
                                ? "Loading products..."
                                : "-- Select product --"}
                            </option>

                            {/* grouped by category */}
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
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleFieldChange(
                                index,
                                "quantity",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) =>
                              handleFieldChange(
                                index,
                                "unit_price",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td className="invoice-cell-right">
                          {Number(item.line_total).toFixed(2)}
                        </td>
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

              <div className="invoice-footer-row">
                <div>
                  <div className="invoice-total">
                    Subtotal:{" "}
                    <span className="invoice-total-amount">
                      LKR {subtotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="invoice-total" style={{ marginTop: 4 }}>
                    Discount:
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="invoice-discount-input"
                    />
                    <span className="invoice-discount-currency">LKR</span>
                  </div>

                  <div className="invoice-total" style={{ marginTop: 4 }}>
                    Total:{" "}
                    <span className="invoice-total-amount">
                      LKR {grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="invoice-footer-actions">
                  <button
                    type="submit"
                    className="invoice-btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save & Print"}
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
          </section>
        </main>
      </div>
    </>
  );
};

export default InvoiceCreatePage;
