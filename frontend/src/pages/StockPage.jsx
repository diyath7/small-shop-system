// src/pages/StockPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import "./DashboardPage.css";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

const StockPage = () => {
  const { user, token } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // 🔽 sorting state
  const [sortField, setSortField] = useState("name"); // default sort by product name
  const [sortDirection, setSortDirection] = useState("asc"); // "asc" or "desc"

  useEffect(() => {
    if (!token) {
      setErrorMessage("No auth token found. Please login again.");
      setLoading(false);
      return;
    }

    const fetchStock = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/stock/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRows(res.data || []);
      } catch (err) {
        console.error(err);
        const backendMsg =
          err.response?.data?.error || err.response?.data?.message;
        setErrorMessage(
          backendMsg || "Failed to load stock summary from server."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStock();
  }, [token]);

  // 🔽 handle clicking on table headers
  const handleSort = (field) => {
    setSortField((prevField) => {
      if (prevField === field) {
        // same field -> toggle direction
        setSortDirection((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevField;
      } else {
        // new field -> default asc
        setSortDirection("asc");
        return field;
      }
    });
  };

  // 🔽 sorted list of stock rows
  const sortedRows = useMemo(() => {
    const copy = [...rows];
    const dir = sortDirection === "asc" ? 1 : -1;

    copy.sort((a, b) => {
      let valA;
      let valB;

      switch (sortField) {
        case "name":
        case "category":
          valA = (a[sortField] || "").toString().toLowerCase();
          valB = (b[sortField] || "").toString().toLowerCase();
          break;

        case "total_quantity":
        case "reorder_level":
        case "batch_count":
          valA = Number(a[sortField]) || 0;
          valB = Number(b[sortField]) || 0;
          break;

        case "nearest_expiry":
          // nulls push to bottom
          valA = a.nearest_expiry
            ? new Date(a.nearest_expiry).getTime()
            : Infinity;
          valB = b.nearest_expiry
            ? new Date(b.nearest_expiry).getTime()
            : Infinity;
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
  }, [rows, sortField, sortDirection]);

  const sortIndicator = (field) =>
    sortField === field ? (sortDirection === "asc" ? " ▲" : " ▼") : "";

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <TopBar />

        {/* 🔽 HEADER + SUB-TABS */}
        <header className="dashboard-header">
          <div>
            <div className="dashboard-title">Stock Management</div>
            <div className="dashboard-subtitle">
              View current inventory by product, including total quantity,
              batches, and nearest expiry date.
            </div>

            {/* Sub-tabs under Stock Management */}
            <div className="stock-tabs">
              <span className="stock-tab stock-tab-active">Current Stock</span>
              <Link to="/stock/expired" className="stock-tab">
                Expired Stock &amp; Losses
              </Link>
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
          <div className="chart-title">Stock List</div>
          <div className="chart-subtitle">
            This table shows product-wise stock levels summarised from all
            batches.
          </div>

          {errorMessage && (
            <div className="invoice-alert invoice-alert-error">
              {errorMessage}
            </div>
          )}

          {loading ? (
            <div className="chart-placeholder">Loading stock data...</div>
          ) : sortedRows.length === 0 ? (
            <div className="chart-placeholder">
              No products found in the system.
            </div>
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
                      Product{sortIndicator("name")}
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
                      onClick={() => handleSort("total_quantity")}
                    >
                      Total Qty{sortIndicator("total_quantity")}
                    </th>

                    <th
                      className="invoice-cell-right"
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("reorder_level")}
                    >
                      Reorder Level{sortIndicator("reorder_level")}
                    </th>

                    <th>Status</th>

                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("batch_count")}
                    >
                      Batches{sortIndicator("batch_count")}
                    </th>

                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("nearest_expiry")}
                    >
                      Nearest Expiry{sortIndicator("nearest_expiry")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row, index) => {
                    const isLow = row.is_low_stock;
                    return (
                      <tr key={row.product_id}>
                        <td>{index + 1}</td>
                        <td>{row.name}</td>
                        <td>{row.category}</td>
                        <td className="invoice-cell-right">
                          {row.total_quantity}
                        </td>
                        <td className="invoice-cell-right">
                          {row.reorder_level}
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 10px",
                              borderRadius: "999px",
                              fontSize: "12px",
                              fontWeight: 500,
                              backgroundColor: isLow ? "#fee2e2" : "#dcfce7",
                              color: isLow ? "#b91c1c" : "#166534",
                            }}
                          >
                            {isLow ? "Low stock" : "OK"}
                          </span>
                        </td>
                        <td>{row.batch_count}</td>
                        <td>
                          {row.nearest_expiry
                            ? new Date(row.nearest_expiry).toLocaleDateString()
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default StockPage;
