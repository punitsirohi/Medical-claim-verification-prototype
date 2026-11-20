import { Fragment, useEffect, useMemo, useState } from "react";
import { API, getToken, request } from "./api";

const DEMOS = [
  ["Patient", "patient@medichain.demo"],
  ["Hospital", "hospital@medichain.demo"],
  ["Insurance Admin", "insurer@medichain.demo"],
  ["System Admin", "admin@medichain.demo"],
];

const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);
const date = (v) =>
  v
    ? new Date(v).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

function Status({ value }) {
  const cls = (value || "SUBMITTED").toLowerCase().replaceAll("_", "-");
  return (
    <span className={`status ${cls}`}>
      {(value || "SUBMITTED").replaceAll("_", " ")}
    </span>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState(DEMOS[0][1]);
  const [password, setPassword] = useState("Demo@123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-visual">
        <div className="brand">
          <span className="brand-mark">M</span> MediChain
        </div>
        <div className="hero-copy">
          <span className="eyebrow">HEALTHCARE × BLOCKCHAIN</span>
          <h1>
            Claims you can
            <br />
            <em>trust.</em>
          </h1>
          <p>
            A transparent, tamper-resistant workflow for medical insurance claim
            verification.
          </p>
          <div className="hero-points">
            <span>✓ Secure claim records</span>
            <span>✓ Role-based review</span>
            <span>✓ On-chain audit trail</span>
          </div>
        </div>
        <div className="visual-foot">ACADEMIC PROTOTYPE · TEST DATA ONLY</div>
      </div>
      <div className="login-panel">
        <div className="login-card">
          <div className="mobile-brand brand">
            <span className="brand-mark">M</span> MediChain
          </div>
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to your workspace</h2>
          <p className="muted">
            Choose a demo role or enter its account email.
          </p>
          <div className="demo-grid">
            {DEMOS.map(([label, value]) => (
              <button
                key={value}
                type="button"
                className={`demo-chip ${email === value ? "selected" : ""}`}
                onClick={() => setEmail(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="form-stack">
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && <div className="alert error">{error}</div>}
            <button className="btn primary full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in securely"} <span>→</span>
            </button>
          </form>
          <div className="login-note">
            <span className="lock">⌑</span> Demo password for all accounts:{" "}
            <b>Demo@123</b>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClaimForm({ onSubmit, busy }) {
  const [form, setForm] = useState({
    policyNumber: "MC-HEALTH-1001",
    hospitalName: "CityCare Hospital",
    treatmentDate: new Date().toISOString().slice(0, 10),
    amount: "12500",
    description: "Consultation, diagnostic tests and prescribed treatment",
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    if (file) data.append("document", file);
    try {
      await onSubmit(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="claim-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          Policy number
          <input
            value={form.policyNumber}
            onChange={(e) => update("policyNumber", e.target.value)}
            required
          />
        </label>
        <label>
          Hospital / provider
          <input
            value={form.hospitalName}
            onChange={(e) => update("hospitalName", e.target.value)}
            required
          />
        </label>
        <label>
          Treatment date
          <input
            type="date"
            value={form.treatmentDate}
            onChange={(e) => update("treatmentDate", e.target.value)}
            required
          />
        </label>
        <label>
          Claim amount (INR)
          <input
            type="number"
            min="1"
            step="1"
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
            required
          />
        </label>
        <label className="span-2">
          Treatment description
          <textarea
            rows="3"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            required
          />
        </label>
        <label className="span-2">
          Supporting document{" "}
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <small>
            Optional · PDF, PNG or JPG · Max 8 MB · Use synthetic sample
            documents only
          </small>
        </label>
      </div>
      {error && <div className="alert error">{error}</div>}
      <div className="form-bottom">
        <span className="muted">
          Your document stays off-chain; only its SHA-256 hash is recorded.
        </span>
        <button className="btn primary" disabled={busy}>
          {busy ? "Submitting…" : "Submit claim →"}
        </button>
      </div>
    </form>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [decision, setDecision] = useState({});

  async function login(email, password) {
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("medichain_token", data.token);
    setUser(data.user);
  }
  function logout() {
    localStorage.removeItem("medichain_token");
    setUser(null);
    setClaims([]);
  }

  async function loadClaims() {
    setLoading(true);
    setError("");
    try {
      const data = await request("/claims");
      setClaims(data.claims || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!getToken()) return;
    request("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => logout());
  }, []);
  useEffect(() => {
    if (user) loadClaims();
  }, [user]);

  async function createClaim(data) {
    const result = await request("/claims", { method: "POST", body: data });
    setNotice("Claim submitted and recorded on the blockchain.");
    setShowForm(false);
    await loadClaims();
    return result;
  }

  async function verify(id) {
    setError("");
    setNotice("");
    try {
      await request(`/claims/${id}/verify`, { method: "PATCH" });
      setNotice("Hospital verification recorded on the blockchain.");
      await loadClaims();
    } catch (err) {
      setError(err.message);
    }
  }

  async function decide(id, action) {
    setError("");
    setNotice("");
    const reason = decision[id] || "";
    try {
      await request(`/claims/${id}/decision`, {
        method: "PATCH",
        body: JSON.stringify({ decision: action, reason }),
      });
      setNotice(
        `Claim ${action.toLowerCase()} and recorded on the blockchain.`,
      );
      await loadClaims();
    } catch (err) {
      setError(err.message);
    }
  }

  const totalAmount = useMemo(
    () => claims.reduce((sum, c) => sum + Number(c.amount || 0), 0),
    [claims],
  );
  const roleName =
    {
      PATIENT: "Patient workspace",
      HOSPITAL: "Hospital review desk",
      INSURER: "Insurance operations",
      ADMIN: "System overview",
    }[user?.role] || "Workspace";

  if (!user) return <Login onLogin={login} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span> MediChain
        </div>
        <div className="side-label">WORKSPACE</div>
        <div className="nav-item active">
          <span>▦</span> Overview
        </div>
        <div className="nav-item">
          <span>◈</span> Claims
        </div>
        <div className="nav-item">
          <span>⌑</span> Audit records
        </div>
        <div className="sidebar-bottom">
          <div className="user-mini">
            <div className="avatar">{user.name?.[0] || "M"}</div>
            <div>
              <b>{user.name}</b>
              <small>{user.role}</small>
            </div>
          </div>
          <button className="logout" onClick={logout}>
            ↗ Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">MEDICHAIN / OVERVIEW</span>
            <h1>{roleName}</h1>
          </div>
          <div className="top-user">
            <span className="online-dot"></span> Demo environment{" "}
            <div className="avatar small">{user.name?.[0]}</div>
          </div>
        </header>

        <div className="content">
          {notice && (
            <div className="alert success">
              <span>✓</span>
              {notice}
              <button onClick={() => setNotice("")}>×</button>
            </div>
          )}
          {error && (
            <div className="alert error">
              <span>!</span>
              {error}
              <button onClick={() => setError("")}>×</button>
            </div>
          )}

          <section className="welcome-row">
            <div>
              <span className="eyebrow">YOUR CLAIMS, IN ONE PLACE</span>
              <h2>
                Hello, {user.name?.split(" ")[0]}{" "}
                <span className="wave">✦</span>
              </h2>
              <p className="muted">
                Here is the latest activity in your MediChain workspace.
              </p>
            </div>
            {user.role === "PATIENT" && (
              <button
                className="btn primary"
                onClick={() => setShowForm((v) => !v)}
              >
                ＋ New claim
              </button>
            )}
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-top">
                <span>Total claims</span>
                <span className="stat-icon">▤</span>
              </div>
              <strong>{claims.length}</strong>
              <small>Claims visible to your role</small>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <span>Total claim value</span>
                <span className="stat-icon">₹</span>
              </div>
              <strong>{money(totalAmount)}</strong>
              <small>Across visible claims</small>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <span>Approved</span>
                <span className="stat-icon green">✓</span>
              </div>
              <strong>
                {claims.filter((c) => c.status === "APPROVED").length}
              </strong>
              <small>Final approved claims</small>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <span>Needs attention</span>
                <span className="stat-icon amber">◷</span>
              </div>
              <strong>
                {
                  claims.filter((c) =>
                    ["SUBMITTED", "HOSPITAL_VERIFIED"].includes(c.status),
                  ).length
                }
              </strong>
              <small>Awaiting next action</small>
            </div>
          </section>

          {showForm && user.role === "PATIENT" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">NEW REQUEST</span>
                  <h3>Submit a medical claim</h3>
                </div>
                <button className="icon-btn" onClick={() => setShowForm(false)}>
                  ×
                </button>
              </div>
              <ClaimForm onSubmit={createClaim} busy={loading} />
            </section>
          )}

          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">CLAIM MANAGEMENT</span>
                <h3>
                  {user.role === "PATIENT"
                    ? "Your claim history"
                    : user.role === "HOSPITAL"
                      ? "Claims awaiting hospital review"
                      : user.role === "INSURER"
                        ? "Claims awaiting insurance decision"
                        : "All visible claims"}
                </h3>
              </div>
              <button className="btn secondary" onClick={loadClaims}>
                ↻ Refresh
              </button>
            </div>
            {loading ? (
              <div className="empty">Loading claims…</div>
            ) : claims.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">◇</div>
                <b>No claims to display</b>
                <span>
                  When a claim enters your workflow, it will appear here.
                </span>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Claim / patient</th>
                      <th>Hospital</th>
                      <th>Treatment date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((c) => (
                      <Fragment key={c._id}>
                        <tr>
                          <td>
                            <b>#{c._id.slice(-8).toUpperCase()}</b>
                            <small>{c.patientName || "Patient"}</small>
                          </td>
                          <td>{c.hospitalName}</td>
                          <td>{date(c.treatmentDate)}</td>
                          <td className="amount">{money(c.amount)}</td>
                          <td>
                            <Status value={c.status} />
                          </td>
                          <td className="actions">
                            {user.role === "HOSPITAL" &&
                              c.status === "SUBMITTED" && (
                                <button
                                  className="btn tiny primary"
                                  onClick={() => verify(c._id)}
                                >
                                  Verify
                                </button>
                              )}
                            {user.role === "INSURER" &&
                              c.status === "HOSPITAL_VERIFIED" && (
                                <div className="decision-actions">
                                  <input
                                    aria-label="Decision reason"
                                    placeholder="Reason if rejecting"
                                    value={decision[c._id] || ""}
                                    onChange={(e) =>
                                      setDecision((old) => ({
                                        ...old,
                                        [c._id]: e.target.value,
                                      }))
                                    }
                                  />
                                  <button
                                    className="btn tiny approve"
                                    onClick={() => decide(c._id, "APPROVED")}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="btn tiny reject"
                                    onClick={() => decide(c._id, "REJECTED")}
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            <button
                              className="text-btn"
                              onClick={() =>
                                setDecision((old) => ({
                                  ...old,
                                  [`detail-${c._id}`]: old[`detail-${c._id}`]
                                    ? ""
                                    : "open",
                                }))
                              }
                            >
                              {decision[`detail-${c._id}`]
                                ? "Hide details"
                                : "Details"}{" "}
                              ↗
                            </button>
                          </td>
                        </tr>
                        <tr className="detail-row">
                          <td colSpan="6">
                            {decision[`detail-${c._id}`] && (
                              <div className="claim-details">
                                <p>
                                  <b>Description:</b> {c.description}
                                </p>
                                <p>
                                  <b>Policy:</b> {c.policyNumber}
                                </p>
                                <p>
                                  <b>Document hash:</b>{" "}
                                  <code>{c.documentHash}</code>
                                </p>
                                <p>
                                  <b>Supporting document:</b>{" "}
                                  {c.documentPath ? (
                                    <a
                                      href={`http://localhost:5000${c.documentPath}`}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Open uploaded file
                                    </a>
                                  ) : (
                                    "No file uploaded; demonstration hash generated from claim data"
                                  )}
                                </p>
                                <p>
                                  <b>Decision reason:</b>{" "}
                                  {c.decisionReason || "—"}
                                </p>
                                <p>
                                  <b>Blockchain transactions:</b>
                                </p>
                                {(c.blockchainTxs || []).map((tx, i) => (
                                  <div className="tx" key={i}>
                                    <span>{tx.action}</span>
                                    <code>{tx.txHash}</code>
                                    <small>Block {tx.blockNumber}</small>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="trust-strip">
            <div className="trust-icon">◇</div>
            <div>
              <b>Blockchain-backed audit trail</b>
              <p>
                Claim identifiers, document hashes and status transitions are
                recorded on the configured local EVM network. Personal medical
                details remain off-chain.
              </p>
            </div>
            <span className="chain-pill">
              <i></i> Local chain
            </span>
          </section>
          <footer>
            MEDICHAIN · ACADEMIC PROTOTYPE{" "}
            <span>Built for transparent claim verification</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
