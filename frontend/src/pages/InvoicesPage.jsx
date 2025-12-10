// src/pages/InvoicesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

const InvoicesPage = () => {
  const { user } = useAuth();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [filterRange, setFilterRange] = useState("today"); // today | week | month | all

  // Sorting config
  const [sortConfig, setSortConfig] = useState({
    key: "invoice_date",
    direction: "desc",
  });

  // Selected invoice details state
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    setErrorMessage("");

    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMessage("No auth token found. Please login again.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE_URL}/api/invoices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInvoices(res.data || []);
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // ---- Filter by day / week / month / all ----
  const filteredInvoices = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];

    if (filterRange === "all") return invoices;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 6); // last 7 days

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    return invoices.filter((inv) => {
      if (!inv.invoice_date) return false;
      const d = new Date(inv.invoice_date);
      d.setHours(0, 0, 0, 0);

      if (Number.isNaN(d.getTime())) return false;

      if (filterRange === "today") {
        return d.getTime() === today.getTime();
      }
      if (filterRange === "week") {
        return d >= startOfWeek && d <= today;
      }
      if (filterRange === "month") {
        return d >= startOfMonth && d <= today;
      }
      return true;
    });
  }, [invoices, filterRange]);

  // ---- Sorting helpers ----
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return "⇅";
    return sortConfig.direction === "asc" ? "▲" : "▼";
  };

  const sortedInvoices = useMemo(() => {
    const data = [...filteredInvoices];

    if (!sortConfig.key) return data;

    const { key, direction } = sortConfig;

    const getValue = (inv) => {
      if (key === "total_amount") {
        return Number(inv.total_amount || 0);
      }
      if (key === "invoice_date") {
        const d = new Date(inv.invoice_date);
        return d.getTime() || 0;
      }
      // string fields
      return (inv[key] || "").toString().toLowerCase();
    };

    data.sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);

      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [filteredInvoices, sortConfig]);

  const totalForRange = sortedInvoices.reduce(
    (sum, inv) => sum + Number(inv.total_amount || 0),
    0
  );

  const btnClass = (range) =>
    "invoice-btn-secondary" +
    (filterRange === range ? " invoice-btn-secondary-active" : "");

  // ---- Load details of one invoice (for modal) ----
  const handleViewDetails = async (invoiceId) => {
    setDetailsError("");
    setDetailsLoading(true);
    setSelectedInvoice(null);
    setSelectedItems([]);
    setShowDetailsModal(true); // open modal immediately (shows loading state)

    const token = localStorage.getItem("token");
    if (!token) {
      setDetailsError("No auth token found. Please login again.");
      setDetailsLoading(false);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE_URL}/api/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSelectedInvoice(res.data.invoice);
      setSelectedItems(res.data.items || []);
    } catch (err) {
      console.error(err);
      const backendMsg =
        err.response?.data?.error || err.response?.data?.message;
      setDetailsError(backendMsg || "Failed to load invoice details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedInvoice(null);
    setSelectedItems([]);
    setDetailsError("");
    setDetailsLoading(false);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <TopBar />

        <header className="dashboard-header">
          <div>
            <div className="dashboard-title">Invoices</div>
            <div className="dashboard-subtitle">
              View all invoices, filter by date range, and inspect details.
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

        <section className="chart-card">
          {errorMessage && (
            <div className="invoice-alert invoice-alert-error">
              {errorMessage}
            </div>
          )}

          {/* Filters + refresh */}
          <div className="invoice-row-top" style={{ marginBottom: "1rem" }}>
            <div className="invoice-field">
              <label>Filter</label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={btnClass("today")}
                  onClick={() => setFilterRange("today")}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={btnClass("week")}
                  onClick={() => setFilterRange("week")}
                >
                  This Week
                </button>
                <button
                  type="button"
                  className={btnClass("month")}
                  onClick={() => setFilterRange("month")}
                >
                  This Month
                </button>
                <button
                  type="button"
                  className={btnClass("all")}
                  onClick={() => setFilterRange("all")}
                >
                  All
                </button>
              </div>
            </div>

            <div className="invoice-field" style={{ alignSelf: "flex-end" }}>
              <button
                type="button"
                className="invoice-btn-secondary"
                onClick={fetchInvoices}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="invoice-footer-row" style={{ marginBottom: "0.5rem" }}>
            <div className="invoice-total">
              Showing{" "}
              <strong>{sortedInvoices.length}</strong> invoice
              {sortedInvoices.length === 1 ? "" : "s"} | Total:{" "}
              <span className="invoice-total-amount">
                LKR {totalForRange.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <p>Loading invoices...</p>
          ) : (
            <div className="invoice-table-wrapper">
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>#</th>

                    <th
                      className="sortable-header"
                      onClick={() => handleSort("invoice_number")}
                    >
                      Invoice No&nbsp;{renderSortIcon("invoice_number")}
                    </th>

                    <th
                      className="sortable-header"
                      onClick={() => handleSort("customer_name")}
                    >
                      Customer&nbsp;{renderSortIcon("customer_name")}
                    </th>

                    <th
                      className="sortable-header"
                      onClick={() => handleSort("invoice_date")}
                    >
                      Date&nbsp;{renderSortIcon("invoice_date")}
                    </th>

                    <th
                      className="sortable-header invoice-cell-right"
                      onClick={() => handleSort("total_amount")}
                    >
                      Total Amount&nbsp;{renderSortIcon("total_amount")}
                    </th>

                    {/* actions column */}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInvoices.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center" }}>
                        No invoices for this range.
                      </td>
                    </tr>
                  ) : (
                    sortedInvoices.map((inv, idx) => (
                      <tr key={inv.id}>
                        <td>{idx + 1}</td>
                        <td>{inv.invoice_number}</td>
                        <td>{inv.customer_name}</td>
                        <td>{inv.invoice_date?.slice(0, 10)}</td>
                        <td className="invoice-cell-right">
                          LKR {Number(inv.total_amount).toFixed(2)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="invoice-btn-sm"
                            onClick={() => handleViewDetails(inv.id)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* ===== DETAILS MODAL ===== */}
      {showDetailsModal && (
        <div
          className="invoice-modal-overlay"
          onClick={handleCloseDetails}
        >
          <div
            className="invoice-modal-card"
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
          >
            <div className="invoice-modal-header">
              <div className="invoice-modal-title">
                {selectedInvoice
                  ? `Invoice Details – ${selectedInvoice.invoice_number}`
                  : "Invoice Details"}
              </div>
              <button
                type="button"
                className="invoice-modal-close-btn"
                onClick={handleCloseDetails}
              >
                Close
              </button>
            </div>

            {detailsLoading && <p>Loading invoice details...</p>}

            {detailsError && !detailsLoading && (
              <div className="invoice-alert invoice-alert-error">
                {detailsError}
              </div>
            )}

            {selectedInvoice && !detailsLoading && !detailsError && (
              <>
                <p style={{ margin: 0 }}>
                  <strong>Customer:</strong> {selectedInvoice.customer_name}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Date:</strong>{" "}
                  {selectedInvoice.invoice_date?.slice(0, 10)}
                </p>
                <p style={{ margin: "0 0 0.75rem 0" }}>
                  <strong>Total:</strong>{" "}
                  LKR {Number(selectedInvoice.total_amount).toFixed(2)}
                </p>

                <div className="invoice-table-wrapper">
                  <table className="invoice-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Product</th>
                        <th>Qty</th>
                        <th className="invoice-cell-right">Unit Price</th>
                        <th className="invoice-cell-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: "center" }}>
                            No items for this invoice.
                          </td>
                        </tr>
                      ) : (
                        selectedItems.map((item, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td>{item.product_name}</td>
                            <td>{item.quantity}</td>
                            <td className="invoice-cell-right">
                              LKR {Number(item.unit_price).toFixed(2)}
                            </td>
                            <td className="invoice-cell-right">
                              LKR {Number(item.line_total).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
