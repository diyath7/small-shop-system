// src/pages/ExpiredStockPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import "./DashboardPage.css";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

const ExpiredStockPage = () => {
  const { user, token } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [lossRows, setLossRows] = useState([]);
  const [lossLoading, setLossLoading] = useState(true);

  // ---- LOAD EXPIRED BATCHES ----
  const loadExpired = async () => {
    if (!token) {
      setErrorMessage("No auth token found. Please login again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const res = await axios.get(`${API_BASE_URL}/api/stock/expired`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRows(res.data || []);
    } catch (err) {
      console.error(err);
      const backendMsg =
        err.response?.data?.error || err.response?.data?.message;
      setErrorMessage(
        backendMsg || "Failed to load expired stock from server."
      );
    } finally {
      setLoading(false);
    }
  };

  // ---- LOAD LOSS HISTORY (WRITE-OFFS) ----
  const loadWriteOffs = async () => {
    if (!token) {
      setLossLoading(false);
      return;
    }

    try {
      setLossLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/stock/write-offs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLossRows(res.data || []);
    } catch (err) {
      console.error(err);
      // keep UI simple – error for this section can be merged into main error if you like
    } finally {
      setLossLoading(false);
    }
  };

  useEffect(() => {
    loadExpired();
    loadWriteOffs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Estimated loss for current expired stock (not yet written off)
  const totalLoss = useMemo(() => {
    return rows.reduce((sum, row) => {
      const qty = Number(row.quantity) || 0;
      const cost = Number(row.unit_cost) || 0;
      return sum + qty * cost;
    }, 0);
  }, [rows]);

  // Write-off a whole expired batch
  const handleWriteOff = async (batch) => {
    const qty = Number(batch.quantity) || 0;
    if (qty <= 0) return;

    const confirmText = `Write off ALL ${qty} units of "${batch.product_name}" (batch ${batch.batch_code}) as expired? This cannot be undone.`;
    if (!window.confirm(confirmText)) return;

    try {
      setErrorMessage("");
      setSuccessMessage("");

      await axios.post(
        `${API_BASE_URL}/api/stock/write-off`,
        {
          batch_id: batch.batch_id,
          quantity: qty,
          reason: "EXPIRED",
          notes: "Expired stock cleared via UI",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccessMessage(
        `Expired stock written off for "${batch.product_name}" (batch ${batch.batch_code}).`
      );

      // Reload both lists
      await loadExpired();
      await loadWriteOffs();
    } catch (err) {
      console.error(err);
      const backendMsg =
        err.response?.data?.error || err.response?.data?.message;
      setErrorMessage(
        backendMsg || "Failed to write off this expired stock batch."
      );
    }
  };

  // ---- NEW: EXPORT LOSS REPORT PDF ----
  const handleExportLossPdf = async () => {
    if (!token) {
      setErrorMessage("No auth token found. Please login again.");
      return;
    }

    try {
      setErrorMessage("");
      // no from/to → backend uses last 30 days by default
      const url = `${API_BASE_URL}/api/reports/losses/pdf`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to download loss report PDF");
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `loss-report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to export loss report PDF.");
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <TopBar />

        <header className="dashboard-header">
          <div>
            <div className="dashboard-title">Stock Management</div>
            <div className="dashboard-subtitle">
              Manage expired stock and record losses from write-offs.
            </div>

            {/* Sub-tabs under Stock Management */}
            <div className="stock-tabs">
              <Link to="/stock" className="stock-tab">
                Current Stock
              </Link>
              <span className="stock-tab stock-tab-active">
                Expired Stock &amp; Losses
              </span>
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

        {/* ===== CARD 1: EXPIRED STOCK ===== */}
        <section className="chart-card">
          <div className="chart-title">Expired Stock</div>
          <div className="chart-subtitle">
            All batches with expiry dates already passed. These cannot be sold
            and must be written off as a loss.
          </div>

          {totalLoss > 0 && (
            <div className="chart-subtitle" style={{ marginTop: 6 }}>
              <strong>Estimated loss value: </strong>Rs.{" "}
              {totalLoss.toFixed(2)}
            </div>
          )}

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
            <div className="chart-placeholder">Loading expired stock...</div>
          ) : rows.length === 0 ? (
            <div className="chart-placeholder">
              Good news! There is no expired stock in the system.
            </div>
          ) : (
            <div className="invoice-table-wrapper">
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>Batch Code</th>
                    <th>Category</th>
                    <th className="invoice-cell-right">Qty</th>
                    <th className="invoice-cell-right">Unit Cost (Rs.)</th>
                    <th className="invoice-cell-right">Loss (Rs.)</th>
                    <th>Expiry Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const qty = Number(row.quantity) || 0;
                    const unitCost = Number(row.unit_cost) || 0;
                    const loss = qty * unitCost;

                    return (
                      <tr key={row.batch_id}>
                        <td>{index + 1}</td>
                        <td>{row.product_name}</td>
                        <td>{row.batch_code}</td>
                        <td>{row.category}</td>
                        <td className="invoice-cell-right">{qty}</td>
                        <td className="invoice-cell-right">
                          {unitCost.toFixed(2)}
                        </td>
                        <td className="invoice-cell-right">
                          {loss.toFixed(2)}
                        </td>
                        <td>
                          {row.expiry_date
                            ? new Date(row.expiry_date).toLocaleDateString()
                            : "-"}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="invoice-small-btn invoice-small-btn-danger"
                            onClick={() => handleWriteOff(row)}
                          >
                            Write off all
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ===== CARD 2: LOSS HISTORY ===== */}
        <section className="chart-card" style={{ marginTop: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <div className="chart-title">Loss History (Write-offs)</div>
            <button
              className="primary-btn"
              onClick={handleExportLossPdf}
              disabled={lossRows.length === 0}
            >
              Export Loss PDF
            </button>
          </div>

          <div className="chart-subtitle">
            All stock write-offs recorded in the system (expired, damaged,
            etc.).
          </div>

          {lossLoading ? (
            <div className="chart-placeholder">Loading loss history...</div>
          ) : lossRows.length === 0 ? (
            <div className="chart-placeholder">
              No write-offs recorded yet.
            </div>
          ) : (
            <div className="invoice-table-wrapper">
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Batch</th>
                    <th className="invoice-cell-right">Qty</th>
                    <th className="invoice-cell-right">Unit Cost (Rs.)</th>
                    <th className="invoice-cell-right">Total Loss (Rs.)</th>
                    <th>Reason</th>
                    <th>Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {lossRows.map((row, index) => (
                    <tr key={row.id || `${row.batch_id}-${index}`}>
                      <td>{index + 1}</td>
                      <td>
                        {row.write_off_date
                          ? new Date(row.write_off_date).toLocaleDateString()
                          : "-"}
                      </td>
                      <td>{row.product_name}</td>
                      <td>{row.batch_code}</td>
                      <td className="invoice-cell-right">{row.quantity}</td>
                      <td className="invoice-cell-right">
                        {Number(row.unit_cost || 0).toFixed(2)}
                      </td>
                      <td className="invoice-cell-right">
                        {Number(row.total_cost || 0).toFixed(2)}
                      </td>
                      <td>{row.reason}</td>
                      <td>{row.recorded_by}</td>
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

export default ExpiredStockPage;
