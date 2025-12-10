// src/pages/DashboardPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import "./DashboardPage.css";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

const DashboardPage = () => {
  const { user, token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [stats, setStats] = useState({
    lowStockCount: 0,
    expiringSoonCount: 0,
    unpaidSupplierInvoicesCount: 0,
    todayIncome: 0,
    monthly: [],
  });

  useEffect(() => {
    const fetchSummary = async () => {
      if (!token) {
        setErrorMessage("No auth token found. Please login again.");
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/dashboard/summary`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setStats(res.data || {});
      } catch (err) {
        console.error("Error loading dashboard summary:", err);
        const backendMsg =
          err.response?.data?.error || err.response?.data?.message;
        setErrorMessage(
          backendMsg || "Failed to load dashboard statistics."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [token]);

  const {
    lowStockCount,
    expiringSoonCount,
    unpaidSupplierInvoicesCount,
    todayIncome,
    monthly,
  } = stats;

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!Array.isArray(monthly)) return { labels: [], income: [], expenses: [] };

    const labels = monthly.map((m) => m.month_label);
    const income = monthly.map((m) => Number(m.income || 0));
    const expenses = monthly.map((m) => Number(m.expenses || 0));
    const maxVal = Math.max(1, ...income, ...expenses); // avoid NaN/zero

    return { labels, income, expenses, maxVal };
  }, [monthly]);

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <TopBar />

        <header className="dashboard-header">
          <div>
            <div className="dashboard-title">Dashboard</div>
            <div className="dashboard-subtitle">
              Small Shop Inventory &amp; Sales Management System
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

        {/* Error */}
        {errorMessage && (
          <div
            className="invoice-alert invoice-alert-error"
            style={{ marginBottom: "1rem" }}
          >
            {errorMessage}
          </div>
        )}

        {/* === Top summary cards === */}
        <section className="dashboard-stats-grid">
          <div className="stat-card">
            <div className="stat-title">Low Stock Items</div>
            <div className="stat-value">{loading ? "-" : lowStockCount}</div>
            <div className="stat-subtext">
              Items with quantity below minimum level.
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-title">Items about to expire</div>
            <div className="stat-value">
              {loading ? "-" : expiringSoonCount}
            </div>
            <div className="stat-subtext">
              Products expiring within the next 30 days.
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-title">Unpaid Supplier Invoices</div>
            <div className="stat-value">
              {loading ? "-" : unpaidSupplierInvoicesCount}
            </div>
            <div className="stat-subtext">
              Supplier batches not yet marked as paid.
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-title">Today’s Income</div>
            <div className="stat-value">
              {loading ? "LKR -" : `LKR ${todayIncome.toFixed(2)}`}
            </div>
            <div className="stat-subtext">Total sales for today.</div>
          </div>
        </section>

        {/* === Income vs Expenses vertical bar chart === */}
        <section className="chart-card">
          <div className="chart-title">
            Summary of Income and Expenses (last 7 months)
          </div>
          <div className="chart-subtitle">
            Monthly total sales (income) vs paid supplier stock cost (expenses).
          </div>

          {loading ? (
            <div className="chart-placeholder">Loading chart...</div>
          ) : chartData.labels.length === 0 ? (
            <div className="chart-placeholder">
              No data yet. Create invoices and mark supplier batches as paid.
            </div>
          ) : (
            <div style={{ marginTop: "1rem" }}>
              {/* Vertical bar graph */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "1.6rem",
                  height: "240px",
                  paddingBottom: "10px",
                  borderBottom: "1px solid #e5e7eb",
                  overflowX: "auto",
                }}
              >
                {chartData.labels.map((label, idx) => {
                  const inc = chartData.income[idx];
                  const exp = chartData.expenses[idx];

                  const incomeHeight = `${(inc / chartData.maxVal) * 100}%`;
                  const expenseHeight = `${(exp / chartData.maxVal) * 100}%`;

                  return (
                    <div
                      key={label}
                      style={{
                        minWidth: "60px",
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {/* Bars */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-end",
                          gap: "6px",
                          height: "180px",
                        }}
                      >
                        <div
                          title={`Income: LKR ${inc.toFixed(2)}`}
                          style={{
                            width: "16px",
                            height: incomeHeight,
                            backgroundColor: "#4f46e5",
                            borderRadius: "6px 6px 0 0",
                          }}
                        ></div>

                        <div
                          title={`Expenses: LKR ${exp.toFixed(2)}`}
                          style={{
                            width: "16px",
                            height: expenseHeight,
                            backgroundColor: "#f97316",
                            borderRadius: "6px 6px 0 0",
                          }}
                        ></div>
                      </div>

                      {/* Month label */}
                      <div style={{ fontSize: "0.75rem", color: "#374151" }}>
                        {label}
                      </div>

                      {/* Small income/expense numbers */}
                      <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                        {inc.toFixed(0)} / {exp.toFixed(0)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div
                style={{
                  marginTop: "0.75rem",
                  fontSize: "0.8rem",
                  display: "flex",
                  gap: "1rem",
                }}
              >
                <span>
                  <span
                    style={{
                      display: "inline-block",
                      width: "10px",
                      height: "10px",
                      backgroundColor: "#4f46e5",
                      borderRadius: "999px",
                      marginRight: "4px",
                    }}
                  ></span>
                  Income
                </span>

                <span>
                  <span
                    style={{
                      display: "inline-block",
                      width: "10px",
                      height: "10px",
                      backgroundColor: "#f97316",
                      borderRadius: "999px",
                      marginRight: "4px",
                    }}
                  ></span>
                  Expenses
                </span>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default DashboardPage;
