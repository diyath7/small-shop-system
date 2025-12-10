// src/pages/SupplierManagementPage.jsx
import React, { useEffect, useState } from "react";
import "./DashboardPage.css";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

const SupplierManagementPage = () => {
    const { user, token } = useAuth();

    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [saving, setSaving] = useState(false);

    // form state
    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        address: "",
    });

    // null = add mode, id = edit mode
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        if (!token) {
            setErrorMessage("No auth token found. Please login again.");
            setLoading(false);
            return;
        }

        const fetchSuppliers = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/suppliers`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setSuppliers(res.data || []);
            } catch (err) {
                console.error(err);
                const backendMsg =
                    err.response?.data?.error || err.response?.data?.message;
                setErrorMessage(backendMsg || "Failed to load suppliers.");
            } finally {
                setLoading(false);
            }
        };

        fetchSuppliers();
    }, [token]);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const clearForm = () => {
        setForm({
            name: "",
            phone: "",
            email: "",
            address: "",
        });
        setEditingId(null);
        setErrorMessage("");
        setSuccessMessage("");
    };

    const startEdit = (supplier) => {
        setEditingId(supplier.id);
        setForm({
            name: supplier.name || "",
            phone: supplier.phone || "",
            email: supplier.email || "",
            address: supplier.address || "",
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

        if (!form.name.trim()) {
            setErrorMessage("Supplier name is required.");
            return;
        }

        const payload = {
            name: form.name.trim(),
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            address: form.address.trim() || null,
        };

        try {
            setSaving(true);

            if (editingId) {
                // UPDATE
                const res = await axios.put(
                    `${API_BASE_URL}/api/suppliers/${editingId}`,
                    payload,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const updated = res.data;
                setSuppliers((prev) =>
                    prev.map((s) => (s.id === updated.id ? updated : s))
                );
                setSuccessMessage("Supplier updated successfully.");
            } else {
                // CREATE
                const res = await axios.post(
                    `${API_BASE_URL}/api/suppliers`,
                    payload,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setSuppliers((prev) => [...prev, res.data].sort((a, b) =>
                    (a.name || "").localeCompare(b.name || "")
                ));
                setSuccessMessage("Supplier created successfully.");
            }

            clearForm();
        } catch (err) {
            console.error(err);
            const backendMsg =
                err.response?.data?.error || err.response?.data?.message;
            setErrorMessage(backendMsg || "Failed to save supplier.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (supplier) => {
        if (
            !window.confirm(
                `Are you sure you want to delete supplier "${supplier.name}"?\n\n` +
                `Any linked products / batches will simply have "no supplier" afterwards.`
            )
        ) {
            return;
        }

        if (!token) {
            setErrorMessage("No auth token found. Please login again.");
            return;
        }

        try {
            setSaving(true);
            await axios.delete(`${API_BASE_URL}/api/suppliers/${supplier.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setSuppliers((prev) => prev.filter((s) => s.id !== supplier.id));

            // if we were editing this supplier, reset form
            if (editingId === supplier.id) {
                clearForm();
            }

            setSuccessMessage("Supplier deleted successfully.");
        } catch (err) {
            console.error(err);
            const backendMsg =
                err.response?.data?.error || err.response?.data?.message;
            setErrorMessage(backendMsg || "Failed to delete supplier.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="dashboard-layout">
            <Sidebar />

            <main className="dashboard-main">
                <TopBar />

                <header className="dashboard-header">
                    <div>
                        <div className="dashboard-title">Supplier Management</div>
                        <div className="dashboard-subtitle">
                            Create, edit and maintain suppliers used in the system.
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

                {/* === Form card === */}
                <section className="chart-card">
                    <div className="chart-title">
                        {editingId ? "Edit Supplier" : "New Supplier"}
                    </div>
                    <div className="chart-subtitle">
                        Fill in the details of the supplier. These will appear in product
                        and purchase order screens.
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
                        <div className="po-form-shell">
                            {/* GRID — TOP ROW */}
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "2fr 1fr 1fr",
                                    gap: "1rem",
                                    marginBottom: "1rem",
                                }}
                            >
                                {/* Name */}
                                <div className="po-form-group">
                                    <label className="invoice-label">
                                        Name <span style={{ color: "red" }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => handleChange("name", e.target.value)}
                                        className="invoice-input"
                                    />
                                </div>

                                {/* Phone */}
                                <div className="po-form-group">
                                    <label className="invoice-label">Phone</label>
                                    <input
                                        type="text"
                                        value={form.phone}
                                        onChange={(e) => handleChange("phone", e.target.value)}
                                        className="invoice-input"
                                    />
                                </div>

                                {/* Email */}
                                <div className="po-form-group">
                                    <label className="invoice-label">Email</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => handleChange("email", e.target.value)}
                                        className="invoice-input"
                                    />
                                </div>
                            </div>

                            {/* ADDRESS FIELD */}
                            <div className="po-form-group" style={{ marginBottom: "1rem" }}>
                                <label className="invoice-label">Address</label>
                                <textarea
                                    value={form.address}
                                    onChange={(e) => handleChange("address", e.target.value)}
                                    className="invoice-input"
                                    rows={2}
                                    style={{ resize: "vertical" }}
                                />
                            </div>

                            {/* BUTTONS */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: "0.75rem",
                                    marginTop: "1rem",
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
                                    {saving ? "Saving..." : editingId ? "Update Supplier" : "Save Supplier"}
                                </button>
                            </div>
                        </div>
                    </form>

                </section>

                {/* === Table card === */}
                <section className="chart-card" style={{ marginTop: "1.5rem" }}>
                    <div className="chart-title">Suppliers</div>

                    {loading ? (
                        <div className="chart-placeholder">Loading suppliers...</div>
                    ) : suppliers.length === 0 ? (
                        <div className="chart-placeholder">
                            No suppliers have been added yet.
                        </div>
                    ) : (
                        <div className="invoice-table-wrapper">
                            <table className="invoice-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Name</th>
                                        <th>Address</th>
                                        <th>Phone</th>
                                        <th>Email</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {suppliers
                                        .slice()
                                        .sort((a, b) =>
                                            (a.name || "").localeCompare(b.name || "")
                                        )
                                        .map((s, index) => (
                                            <tr key={s.id}>
                                                <td>{index + 1}</td>
                                                <td>{s.name}</td>
                                                <td>{s.address || "-"}</td>
                                                <td>{s.phone || "-"}</td>
                                                <td>{s.email || "-"}</td>
                                                <td>
                                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                                        <button
                                                            type="button"
                                                            className="invoice-button-secondary"
                                                            style={{ padding: "4px 10px", fontSize: 12 }}
                                                            onClick={() => startEdit(s)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="invoice-button-secondary"
                                                            style={{
                                                                padding: "4px 10px",
                                                                fontSize: 12,
                                                                backgroundColor: "#ffe5e5",
                                                                borderColor: "#ffb3b3",
                                                            }}
                                                            onClick={() => handleDelete(s)}
                                                            disabled={saving}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
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

export default SupplierManagementPage;
