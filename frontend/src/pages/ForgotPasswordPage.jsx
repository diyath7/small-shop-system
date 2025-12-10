import React from "react";

const ForgotPasswordPage = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#2456ff",
        color: "#fff",
        fontFamily:
          '"Roboto", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: 420,
          padding: "32px 28px",
          background: "rgba(0,0,0,0.25)",
          borderRadius: 16,
          boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>Forgot password?</h2>
        <p style={{ fontSize: 14, lineHeight: 1.5 }}>
          For this system, passwords are managed by the{" "}
          <strong>Administrator</strong>.
          <br />
          <br />
          Please contact your admin or manager to reset your password through
          the Administration &gt; User Management section.
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
