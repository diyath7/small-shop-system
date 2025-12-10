// src/pages/ReportsPage.jsx
import React, { useEffect, useState } from "react";
import "./DashboardPage.css";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

const ReportsPage = () => {
  const { user, token } = useAuth();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ⭐ DATE FORMATTER
  const formatDate = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ⭐ EXPORT PDF FUNCTION (MOVE IT HERE)
  const handleExportPdf = async () => {
    if (!token) {
      setErrorMessage("No auth token found. Please login again.");
      return;
    }

    try {
      const url = `${API_BASE_URL}/api/reports/sales/pdf?from=${fromDate}&to=${toDate}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to download PDF");
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `sales-report-${fromDate}-to-${toDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to export PDF.");
    }
  };

  // Initial date range
  useEffect(() => {
    const today = new Date();
    const to = today.toISOString().slice(0, 10);

    const past = new Date();
    past.setDate(past.getDate() - 30);
    const from = past.toISOString().slice(0, 10);

    setFromDate(from);
    setToDate(to);
  }, []);

  useEffect(() => {
    if (fromDate && toDate) {
      fetchSalesReport();
    }
    // eslint-disable-next-line
  }, [fromDate, toDate]);

  const fetchSalesReport = async () => {
    if (!token) {
      setErrorMessage("No auth token found. Please login again.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await axios.get(`${API_BASE_URL}/api/reports/sales`, {
        params: { from: fromDate, to: toDate },
        headers: { Authorization: `Bearer ${token}` },
      });

      setRows(res.data.rows || []);
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to load sales report.");
    } finally {
      setLoading(false);
    }
  };

  const totalInvoices = rows.reduce(
    (sum, r) => sum + Number(r.invoice_count || 0),
    0
  );
  const totalSales = rows.reduce(
    (sum, r) => sum + Number(r.total_sales || 0),
    0
  );

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <TopBar user={user} />

        <div className="dashboard-content">
          <div className="reports-header">
            <h2>Reports</h2>
            <p>Daily sales summary with date range filter.</p>
          </div>

          {/* Filter card */}
          <div className="dashboard-card reports-card">
            <h3>Sales Report Filters</h3>
            <div className="reports-filter-row">
              <div className="reports-filter-group">
                <label>From</label>
                <input
                  type="date"
                  className="reports-date-input"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="reports-filter-group">
                <label>To</label>
                <input
                  type="date"
                  className="reports-date-input"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>

              <div className="reports-filter-actions">
                <button className="primary-btn" onClick={fetchSalesReport}>
                  Refresh
                </button>

                <button
                  className="primary-btn"
                  style={{ marginLeft: "0.75rem" }}
                  onClick={handleExportPdf}
                >
                  Export PDF
                </button>
              </div>
            </div>
          </div>

          {/* Sales Table */}
          <div className="dashboard-card reports-card">
            <h3>Sales Report</h3>

            {loading ? (
              <p>Loading report...</p>
            ) : errorMessage ? (
              <p className="error-text">{errorMessage}</p>
            ) : rows.length === 0 ? (
              <p>No data found for this period.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Number of Invoices</th>
                    <th>Total Sales (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx}>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.invoice_count}</td>
                      <td>{Number(row.total_sales).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total</th>
                    <th>{totalInvoices}</th>
                    <th>{totalSales.toFixed(2)}</th>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
