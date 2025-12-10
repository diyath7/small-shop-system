// src/pages/SalesPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import "./DashboardPage.css";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

const PERIODS = {
  TODAY: "today",
  WEEK: "week",
  MONTH: "month",
  ALL: "all",
};

// helper to get from/to dates for each period
function getDateRange(period) {
  const today = new Date();
  const to = today.toISOString().slice(0, 10); // YYYY-MM-DD

  if (period === PERIODS.TODAY) {
    return { from: to, to };
  }

  if (period === PERIODS.WEEK) {
    const d = new Date(today);
    const day = d.getDay(); // 0 = Sun, 1 = Mon...
    const diff = day === 0 ? 6 : day - 1; // how many days since Monday
    d.setDate(d.getDate() - diff);
    const from = d.toISOString().slice(0, 10);
    return { from, to };
  }

  if (period === PERIODS.MONTH) {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    const from = d.toISOString().slice(0, 10);
    return { from, to };
  }

  // ALL = no date filter
  return { from: null, to: null };
}

// helpers
const fmtMoney = (num) =>
  Number(num || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString() : "-";

const SalesPage = () => {
  const { user, token } = useAuth();

  const [activePeriod, setActivePeriod] = useState(PERIODS.TODAY);

  const [invoices, setInvoices] = useState([]);
  const [purchasesBySupplier, setPurchasesBySupplier] = useState([]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // derived totals
  const totalSales = useMemo(
    () => invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0),
    [invoices]
  );

  const stockPurchaseCost = useMemo(
    () =>
      purchasesBySupplier.reduce(
        (sum, row) => sum + Number(row.total_amount || 0),
        0
      ),
    [purchasesBySupplier]
  );

  const grossProfit = useMemo(
    () => totalSales - stockPurchaseCost,
    [totalSales, stockPurchaseCost]
  );

  // load data whenever period changes
  useEffect(() => {
    if (!token) {
      setErrorMessage("No auth token found. Please login again.");
      return;
    }

    const fetchData = async () => {
      setErrorMessage("");
      setLoading(true);

      const { from, to } = getDateRange(activePeriod);

      try {
        // build query string only with existing params
        const paramsInvoices = {};
        if (from) paramsInvoices.from = from;
        if (to) paramsInvoices.to = to;

        const paramsBatches = { status: "all" };
        if (from) paramsBatches.from = from;
        if (to) paramsBatches.to = to;

        const [invRes, batchRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/invoices/range`, {
            params: paramsInvoices,
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE_URL}/api/batches/supplier-summary`, {
            params: paramsBatches,
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setInvoices(invRes.data || []);
        setPurchasesBySupplier(batchRes.data || []);
      } catch (err) {
        console.error("Error loading sales overview:", err);
        const backendMsg =
          err.response?.data?.error || err.response?.data?.message;
        setErrorMessage(
          backendMsg || "Failed to load sales overview for the period."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, activePeriod]);

  const periodLabel =
    activePeriod === PERIODS.TODAY
      ? "Today"
      : activePeriod === PERIODS.WEEK
      ? "This Week"
      : activePeriod === PERIODS.MONTH
      ? "This Month"
      : "All Time";

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <TopBar />

        <header className="dashboard-header">
          <div>
            <div className="dashboard-title">Sales Overview</div>
            <div className="dashboard-subtitle">
              See total sales revenue, stock purchase cost and gross profit for a
              selected period.
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

        {errorMessage && (
          <div className="invoice-alert invoice-alert-error">
            {errorMessage}
          </div>
        )}

        {/* Period selector + summary cards */}
        <section className="chart-card">
          <div className="chart-title">Period</div>
          <div className="chart-subtitle">
            Showing sales and stock purchases for: <strong>{periodLabel}</strong>
          </div>

          <div style={{ marginTop: "0.75rem", marginBottom: "1.25rem" }}>
            <button
              type="button"
              className={
                activePeriod === PERIODS.TODAY
                  ? "invoice-toggle-button invoice-toggle-button-active"
                  : "invoice-toggle-button"
              }
              onClick={() => setActivePeriod(PERIODS.TODAY)}
            >
              Today
            </button>
            <button
              type="button"
              className={
                activePeriod === PERIODS.WEEK
                  ? "invoice-toggle-button invoice-toggle-button-active"
                  : "invoice-toggle-button"
              }
              onClick={() => setActivePeriod(PERIODS.WEEK)}
              style={{ marginLeft: "0.5rem" }}
            >
              This Week
            </button>
            <button
              type="button"
              className={
                activePeriod === PERIODS.MONTH
                  ? "invoice-toggle-button invoice-toggle-button-active"
                  : "invoice-toggle-button"
              }
              onClick={() => setActivePeriod(PERIODS.MONTH)}
              style={{ marginLeft: "0.5rem" }}
            >
              This Month
            </button>
            <button
              type="button"
              className={
                activePeriod === PERIODS.ALL
                  ? "invoice-toggle-button invoice-toggle-button-active"
                  : "invoice-toggle-button"
              }
              onClick={() => setActivePeriod(PERIODS.ALL)}
              style={{ marginLeft: "0.5rem" }}
            >
              All
            </button>
          </div>

          {/* Summary cards – same style as your old design */}
          <div className="dashboard-kpi-grid">
            <div className="dashboard-kpi-card">
              <div className="dashboard-kpi-label">Total Sales</div>
              <div className="dashboard-kpi-value">
                LKR {fmtMoney(totalSales)}
              </div>
            </div>

            <div className="dashboard-kpi-card">
              <div className="dashboard-kpi-label">Stock Purchase Cost</div>
              <div className="dashboard-kpi-value">
                LKR {fmtMoney(stockPurchaseCost)}
              </div>
            </div>

            <div className="dashboard-kpi-card">
              <div className="dashboard-kpi-label">Gross Profit</div>
              <div
                className="dashboard-kpi-value"
                style={{
                  color: grossProfit >= 0 ? "#16a34a" : "#b91c1c",
                }}
              >
                LKR {fmtMoney(grossProfit)}
              </div>
            </div>
          </div>
        </section>

        {/* Invoices table */}
        <section className="chart-card" style={{ marginTop: "1.5rem" }}>
          <div className="chart-title">Sales (Invoices)</div>
          <div className="chart-subtitle">
            All invoices within the selected period.
          </div>

          {loading ? (
            <div className="chart-placeholder">Loading data...</div>
          ) : invoices.length === 0 ? (
            <div className="chart-placeholder">
              No invoices in this period.
            </div>
          ) : (
            <div className="invoice-table-wrapper">
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Invoice No</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th className="invoice-cell-right">Total (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, idx) => (
                    <tr key={inv.id}>
                      <td>{idx + 1}</td>
                      <td>{inv.invoice_number}</td>
                      <td>{inv.customer_name}</td>
                      <td>{fmtDate(inv.invoice_date)}</td>
                      <td className="invoice-cell-right">
                        {fmtMoney(inv.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Stock purchases by supplier */}
        <section className="chart-card" style={{ marginTop: "1.5rem" }}>
          <div className="chart-title">Stock Purchases by Supplier</div>
          <div className="chart-subtitle">
            Sum of quantity × unit cost for batches in this period.
          </div>

          {loading ? (
            <div className="chart-placeholder">Loading data...</div>
          ) : purchasesBySupplier.length === 0 ? (
            <div className="chart-placeholder">
              No stock purchases in this period.
            </div>
          ) : (
            <div className="invoice-table-wrapper">
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Supplier</th>
                    <th className="invoice-cell-right">Batches</th>
                    <th className="invoice-cell-right">Total Cost (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {purchasesBySupplier.map((row, idx) => (
                    <tr key={row.supplier_id}>
                      <td>{idx + 1}</td>
                      <td>{row.supplier_name}</td>
                      <td className="invoice-cell-right">
                        {row.batch_count}
                      </td>
                      <td className="invoice-cell-right">
                        {fmtMoney(row.total_amount)}
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

export default SalesPage;
