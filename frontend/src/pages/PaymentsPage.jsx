// src/pages/PaymentsPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import "./DashboardPage.css";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

const PaymentsPage = () => {
  const { user, token } = useAuth();

  const [summary, setSummary] = useState([]);

  // which view is active: 'unpaid' | 'paid' | 'all'
  const [summaryStatus, setSummaryStatus] = useState("unpaid");

  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [selectedSupplierName, setSelectedSupplierName] = useState("");
  const [unpaidBatches, setUnpaidBatches] = useState([]);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // total amount for current view
  const totalAmount = useMemo(
    () =>
      summary.reduce(
        (acc, row) => acc + Number(row.total_amount || 0),
        0
      ),
    [summary]
  );

  const fmtMoney = (num) =>
    Number(num || 0).toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const fmtDateTime = (value) =>
    value ? new Date(value).toLocaleString() : "-";

  // 🔹 Decide status text & CSS class for each supplier row (used in "All" tab)
  const getSupplierStatus = (row) => {
    const unpaid = Number(row.unpaid_batches || 0);
    const paid = Number(row.paid_batches || 0);

    if (unpaid > 0 && paid > 0) {
      return { label: "Partial", className: "status-pill status-partial" };
    }
    if (unpaid > 0) {
      return { label: "Unpaid", className: "status-pill status-unpaid" };
    }
    return { label: "Paid", className: "status-pill status-paid" };
  };

  // fetch summary for current status
  const fetchSummary = async (status) => {
    if (!token) return;

    try {
      setLoadingSummary(true);
      const res = await axios.get(
        `${API_BASE_URL}/api/batches/supplier-summary`,
        {
          params: { status },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSummary(res.data || []);
    } catch (err) {
      console.error("Error loading supplier summary:", err);
      const backendMsg =
        err.response?.data?.error || err.response?.data?.message;
      setErrorMessage(
        backendMsg || "Failed to load supplier payable summary."
      );
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setErrorMessage("No auth token found. Please login again.");
      setLoadingSummary(false);
      return;
    }
    fetchSummary(summaryStatus);
  }, [token, summaryStatus]);

  // unpaid batches for one supplier (used only in "unpaid" tab)
  const loadUnpaidBatches = async (supplierId, supplierName) => {
    if (!token || !supplierId) return;

    setErrorMessage("");
    setSuccessMessage("");
    setSelectedSupplierId(supplierId);
    setSelectedSupplierName(supplierName || "");

    try {
      setLoadingDetails(true);
      const res = await axios.get(
        `${API_BASE_URL}/api/batches/supplier-unpaid`,
        {
          params: { supplier_id: supplierId },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUnpaidBatches(res.data || []);
    } catch (err) {
      console.error("Error loading supplier unpaid batches:", err);
      const backendMsg =
        err.response?.data?.error || err.response?.data?.message;
      setErrorMessage(
        backendMsg || "Failed to load unpaid batches for supplier."
      );
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewDetailsClick = (row) => {
    if (summaryStatus !== "unpaid") return; // safety
    loadUnpaidBatches(row.supplier_id, row.supplier_name);
  };

  const handleMarkPaid = async (batch) => {
    if (!token || !batch?.batch_id) return;

    setErrorMessage("");
    setSuccessMessage("");

    try {
      setMarkingPaid(true);

      const body = {
        batch_ids: [batch.batch_id],
        supplier_invoice_no: batch.supplier_invoice_no || null,
      };

      await axios.post(`${API_BASE_URL}/api/batches/mark-paid`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUnpaidBatches((prev) =>
        prev.filter((b) => b.batch_id !== batch.batch_id)
      );

      // refresh summary for current tab
      fetchSummary(summaryStatus);

      setSuccessMessage(
        `Batch ${batch.batch_code} marked as paid successfully.`
      );
    } catch (err) {
      console.error("Error marking batch as paid:", err);
      const backendMsg =
        err.response?.data?.error || err.response?.data?.message;
      setErrorMessage(backendMsg || "Failed to mark batch as paid.");
    } finally {
      setMarkingPaid(false);
    }
  };

  const statusBtnClass = (status) =>
    "invoice-btn-secondary" +
    (summaryStatus === status ? " invoice-btn-secondary-active" : "");

  const batchCountLabel =
    summaryStatus === "unpaid" ? "Unpaid Batches" : "Batches";

  const totalLabel =
    summaryStatus === "unpaid"
      ? "Total outstanding amount"
      : summaryStatus === "paid"
      ? "Total paid amount"
      : "Total amount";

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <TopBar />

        <header className="dashboard-header">
          <div>
            <div className="dashboard-title">Payments</div>
            <div className="dashboard-subtitle">
              Manage payments to suppliers. Review outstanding amounts and mark
              batches as paid once you settle the supplier bill.
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
        {successMessage && (
          <div className="invoice-alert invoice-alert-success">
            {successMessage}
          </div>
        )}

        {/* === Supplier Payables Overview === */}
        <section className="chart-card">
          <div className="chart-title">Supplier Payables Overview</div>
          <div className="chart-subtitle">
            Shows {summaryStatus === "unpaid" ? "unpaid" : summaryStatus} stock
            totals per supplier. Use the buttons to switch between unpaid and
            paid bills.
          </div>

          {/* tabs */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              margin: "0.75rem 0 1rem 0",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className={statusBtnClass("unpaid")}
              onClick={() => {
                setSummaryStatus("unpaid");
                setSelectedSupplierId(null);
                setSelectedSupplierName("");
                setUnpaidBatches([]);
              }}
            >
              Unpaid
            </button>
            <button
              type="button"
              className={statusBtnClass("paid")}
              onClick={() => {
                setSummaryStatus("paid");
                setSelectedSupplierId(null);
                setSelectedSupplierName("");
                setUnpaidBatches([]);
              }}
            >
              Paid
            </button>
            <button
              type="button"
              className={statusBtnClass("all")}
              onClick={() => {
                setSummaryStatus("all");
                setSelectedSupplierId(null);
                setSelectedSupplierName("");
                setUnpaidBatches([]);
              }}
            >
              All
            </button>
          </div>

          {loadingSummary ? (
            <div className="chart-placeholder">Loading supplier summary...</div>
          ) : summary.length === 0 ? (
            <div className="chart-placeholder">
              No records for this view.
            </div>
          ) : (
            <>
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: "0.75rem",
                }}
              >
                {totalLabel}: LKR {fmtMoney(totalAmount)}
              </div>

              <div className="invoice-table-wrapper">
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Supplier</th>
                      <th className="invoice-cell-right">
                        {batchCountLabel}
                      </th>
                      <th className="invoice-cell-right">
                        Total Amount (LKR)
                      </th>
                      {/* Status only in ALL tab */}
                      {summaryStatus === "all" && <th>Status</th>}
                      <th>First Batch</th>
                      <th>Last Batch</th>
                      {/* Action only in Unpaid tab */}
                      {summaryStatus === "unpaid" && <th>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((row, idx) => (
                      <tr key={row.supplier_id}>
                        <td>{idx + 1}</td>
                        <td>{row.supplier_name}</td>
                        <td className="invoice-cell-right">
                          {row.batch_count}
                        </td>
                        <td className="invoice-cell-right">
                          {fmtMoney(row.total_amount)}
                        </td>

                        {/* Status pill only in ALL tab */}
                        {summaryStatus === "all" && (
                          <td>
                            {(() => {
                              const { label, className } =
                                getSupplierStatus(row);
                              return (
                                <span className={className}>{label}</span>
                              );
                            })()}
                          </td>
                        )}

                        <td>{fmtDateTime(row.first_batch)}</td>
                        <td>{fmtDateTime(row.last_batch)}</td>

                        {/* Button only in Unpaid tab */}
                        {summaryStatus === "unpaid" && (
                          <td>
                            <button
                              type="button"
                              className="invoice-button-secondary"
                              onClick={() => handleViewDetailsClick(row)}
                            >
                              View details
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* === Unpaid Batches – only render in Unpaid tab === */}
        {summaryStatus === "unpaid" && (
          <section className="chart-card" style={{ marginTop: "1.5rem" }}>
            <div className="chart-title">
              Unpaid Batches{" "}
              {selectedSupplierName
                ? `– ${selectedSupplierName}`
                : "(select a supplier above)"}
            </div>
            <div className="chart-subtitle">
              These batches have been received but not yet marked as paid. When
              you pay the supplier, mark them as paid here.
            </div>

            {loadingDetails ? (
              <div className="chart-placeholder">
                Loading unpaid batches...
              </div>
            ) : !selectedSupplierId ? (
              <div className="chart-placeholder">
                Select a supplier from the table above to view unpaid batches.
              </div>
            ) : unpaidBatches.length === 0 ? (
              <div className="chart-placeholder">
                No unpaid batches for this supplier.
              </div>
            ) : (
              <div className="invoice-table-wrapper">
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Batch Code</th>
                      <th className="invoice-cell-right">Qty</th>
                      <th className="invoice-cell-right">Unit Cost</th>
                      <th className="invoice-cell-right">Total (LKR)</th>
                      <th>Received At</th>
                      <th>Supplier Invoice No.</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unpaidBatches.map((b, idx) => (
                      <tr key={b.batch_id}>
                        <td>{idx + 1}</td>
                        <td>{b.product_name}</td>
                        <td>{b.category}</td>
                        <td>{b.batch_code}</td>
                        <td className="invoice-cell-right">{b.quantity}</td>
                        <td className="invoice-cell-right">
                          {fmtMoney(b.unit_cost)}
                        </td>
                        <td className="invoice-cell-right">
                          {fmtMoney(b.total_amount)}
                        </td>
                        <td>{fmtDateTime(b.created_at)}</td>
                        <td>{b.supplier_invoice_no || "-"}</td>
                        <td>
                          <button
                            type="button"
                            className="invoice-button-primary"
                            onClick={() => handleMarkPaid(b)}
                            disabled={markingPaid}
                          >
                            {markingPaid ? "Saving..." : "Mark Paid"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default PaymentsPage;
