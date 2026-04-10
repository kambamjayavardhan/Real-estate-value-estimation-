import { useState, useEffect, useCallback, useRef } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const INDIA_DATA = {
  "Andhra Pradesh": { "Visakhapatnam (Vizag)": 2500000, "Vijayawada": 2000000, "Amaravati (Capital Region)": 2200000, "Guntur": 1200000, "Tirupati": 1500000, "Kakinada": 800000, "Rajahmundry": 900000, "Nellore": 700000, "Kurnool": 600000, "Kadapa": 500000, "Anantapur": 500000, "Other / Rural AP": 200000 },
  "Goa": { "Panaji": 3500000, "Margao": 3000000, "Vasco da Gama": 2500000, "Coastal Areas": 4000000 },
  "Gujarat": { "Ahmedabad": 2500000, "Surat": 2200000, "Vadodara": 1800000, "Rajkot": 1500000, "Gandhinagar": 2000000, "Rural Gujarat": 400000 },
  "Haryana": { "Gurugram (Gurgaon)": 8000000, "Faridabad": 1500000, "Panipat": 800000, "Ambala": 600000, "Rural Haryana": 300000 },
  "Karnataka": { "Bangalore (Whitefield)": 7000000, "Bangalore (Indiranagar)": 9000000, "Bangalore (Electronic City)": 5000000, "Mysore": 1500000, "Mangalore": 1200000, "Hubli": 500000, "Rural Karnataka": 300000 },
  "Kerala": { "Kochi": 3000000, "Thiruvananthapuram": 2500000, "Kozhikode": 1500000, "Thrissur": 1200000, "Rural Kerala": 600000 },
  "Madhya Pradesh": { "Indore": 1800000, "Bhopal": 1500000, "Gwalior": 800000, "Jabalpur": 700000, "Rural MP": 200000 },
  "Maharashtra": { "Mumbai (South)": 25000000, "Mumbai (Suburbs)": 12000000, "Pune (Baner/Aundh)": 6000000, "Pune (Hadapsar)": 4000000, "Nagpur": 1200000, "Nashik": 1000000, "Rural Maharashtra": 400000 },
  "Punjab": { "Ludhiana": 1500000, "Amritsar": 1200000, "Mohali (Tricity)": 3000000, "Chandigarh Periphery": 3500000, "Rural Punjab": 300000 },
  "Rajasthan": { "Jaipur": 2000000, "Jodhpur": 1000000, "Udaipur": 1200000, "Kota": 800000, "Rural Rajasthan": 200000 },
  "Tamil Nadu": { "Chennai (Anna Nagar)": 7000000, "Chennai (OMR/IT Corridor)": 5500000, "Chennai (Suburban)": 3000000, "Coimbatore": 2000000, "Madurai": 1000000, "Rural TN": 300000 },
  "Telangana": { "Hyderabad (Jubilee Hills)": 9000000, "Hyderabad (Banjara Hills)": 8500000, "Hyderabad (Gachibowli)": 5500000, "Hyderabad (Madhapur)": 5000000, "Hyderabad (Kukatpally)": 3000000, "Secunderabad": 2500000, "Warangal": 1500000, "Rural Telangana": 300000 },
  "Uttar Pradesh": { "Lucknow (Gomti Nagar)": 4500000, "Noida (Sector 18)": 7000000, "Kanpur": 3000000, "Agra": 2500000, "Varanasi": 2000000, "Ayodhya": 3500000, "Rural UP": 200000 },
  "West Bengal": { "Kolkata (Salt Lake)": 4500000, "Kolkata (South)": 3500000, "Siliguri": 1200000, "Durgapur": 800000, "Rural WB": 250000 },
  "Delhi (NCT)": { "South Delhi": 15000000, "Dwarka": 8000000, "Rohini": 5000000, "East Delhi": 4000000, "North Delhi": 4500000 },
};

const fmt = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
const fmtL = (v) => v >= 10000000 ? `₹${(v / 10000000).toFixed(2)} Cr` : v >= 100000 ? `₹${(v / 100000).toFixed(2)} L` : fmt(v);

// ─── ANALYTICS (localStorage, same logic as original) ────────────────────────
const Analytics = {
  init(page) { try { const d = this._load(); d.pages = d.pages || {}; d.pages[page] = (d.pages[page] || 0) + 1; d.totals = d.totals || {}; d.totals.totalSessions = (d.totals.totalSessions || 0) + 1; if (!d.firstVisit) d.firstVisit = new Date().toISOString(); d.lastVisit = new Date().toISOString(); this._save(d); } catch {} },
  track(name, props = {}) { try { const d = this._load(); d.events = d.events || {}; d.events[name] = (d.events[name] || 0) + 1; if (props.city) { d.cities = d.cities || {}; d.cities[props.city] = (d.cities[props.city] || 0) + 1; } this._save(d); } catch {} },
  getReport() { try { const d = this._load(); return { summary: { totalSessions: d.totals?.totalSessions || 0, firstVisit: d.firstVisit || null, lastVisit: d.lastVisit || null }, topEvents: d.events || {}, topCities: d.cities || {} }; } catch { return { summary: {}, topEvents: {}, topCities: {} }; } },
  _load() { try { return JSON.parse(localStorage.getItem("ps_analytics") || "{}"); } catch { return {}; } },
  _save(d) { try { localStorage.setItem("ps_analytics", JSON.stringify(d)); } catch {} },
};

// ─── AUTH HELPERS ─────────────────────────────────────────────────────────────
async function hashPassword(pw) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw + "propsmartSalt2024"));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function getStudents() { try { return JSON.parse(localStorage.getItem("ps_students") || "[]"); } catch { return []; } }
function saveStudents(arr) { localStorage.setItem("ps_students", JSON.stringify(arr)); }
function getSession() { try { return JSON.parse(sessionStorage.getItem("ps_session")); } catch { return null; } }
function saveSession(s) { sessionStorage.setItem("ps_session", JSON.stringify(s)); }
function clearSession() { sessionStorage.clear(); }
function getHistory() { try { return JSON.parse(localStorage.getItem("ps_history") || "[]"); } catch { return []; } }
function saveHistory(h) { localStorage.setItem("ps_history", JSON.stringify(h)); }

// ─── SPINNER ──────────────────────────────────────────────────────────────────
function Spinner({ size = 16, color = "white" }) {
  return (
    <div style={{ width: size, height: size, border: `2px solid rgba(255,255,255,0.3)`, borderTopColor: color, borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav({ active, onNavigate, user, onLogout }) {
  const links = [
    { id: "dashboard", label: "Dashboard" },
    { id: "estimator", label: "Estimator" },
    { id: "compare", label: "Compare" },
    { id: "emi", label: "EMI Calc" },
  ];
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(11,15,25,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => onNavigate("dashboard")}>
        <div style={{ width: 34, height: 34, background: "linear-gradient(135deg,#6c63ff,#00d4aa)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🏡</div>
        <span style={{ fontFamily: "Syne,sans-serif", fontSize: 17, fontWeight: 800, color: "#e8eaf0", letterSpacing: "-0.3px" }}>Prop<span style={{ color: "#00d4aa" }}>Smart</span></span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {links.map((l) => (
          <button key={l.id} onClick={() => onNavigate(l.id)} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: active === l.id ? "#6c63ff" : "#6b7280", background: active === l.id ? "rgba(108,99,255,0.12)" : "none", border: active === l.id ? "1px solid rgba(108,99,255,0.2)" : "1px solid transparent", cursor: "pointer", fontFamily: "DM Sans,sans-serif", transition: "all 0.2s" }}>
            {l.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, color: "#6b7280" }}>Hello, <strong style={{ color: "#e8eaf0" }}>{user?.name || "User"}</strong></span>
        <button onClick={onLogout} style={{ background: "#1c2235", border: "1px solid rgba(255,255,255,0.07)", color: "#6b7280", fontSize: 12, padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "DM Sans,sans-serif", transition: "all 0.2s" }}>Sign Out</button>
      </div>
    </nav>
  );
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
function Card({ children, style = {}, delay = 0 }) {
  return (
    <div style={{ background: "#141927", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 26, animation: `fadeUp 0.6s ease ${delay}s both`, ...style }}>
      {children}
    </div>
  );
}

// ─── SELECT / INPUT HELPERS ───────────────────────────────────────────────────
function Select({ value, onChange, children, style = {} }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", background: "#1c2235", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 14px", fontFamily: "DM Sans,sans-serif", fontSize: 13, color: "#e8eaf0", cursor: "pointer", outline: "none", ...style }}>
      {children}
    </select>
  );
}

function NumberInput({ value, onChange, min, max, step, style = {}, prefix }) {
  return (
    <div style={{ position: "relative" }}>
      {prefix && <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#6b7280", pointerEvents: "none" }}>{prefix}</span>}
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} min={min} max={max} step={step}
        style={{ width: "100%", background: "#1c2235", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: `10px 14px 10px ${prefix ? "34px" : "14px"}`, fontFamily: "DM Sans,sans-serif", fontSize: 14, color: "#e8eaf0", outline: "none", ...style }} />
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 500, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{children}</div>;
}

function Chips({ options, value, onChange, colorClass = "" }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          style={{ padding: "7px 13px", borderRadius: 8, border: `1px solid ${value === o.value ? "#6c63ff" : "rgba(255,255,255,0.07)"}`, background: value === o.value ? "rgba(108,99,255,0.15)" : "#1c2235", fontSize: 12, color: value === o.value ? "#6c63ff" : "#6b7280", cursor: "pointer", transition: "all 0.2s", fontFamily: "DM Sans,sans-serif" }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupId, setSignupId] = useState("");
  const [signupPw, setSignupPw] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showPw, setShowPw] = useState({});

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const pwStrength = (pw) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strColors = ["#ff6b6b", "#ffaa33", "#ffd700", "#00d4aa"];
  const strLabels = ["Weak", "Fair", "Good", "Strong"];

  const handleLogin = async () => {
    const errs = {};
    if (!loginEmail) errs.loginEmail = "Email is required";
    else if (!validateEmail(loginEmail)) errs.loginEmail = "Enter a valid email";
    if (!loginPw) errs.loginPw = "Password is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    const hash = await hashPassword(loginPw);
    const students = getStudents();
    const user = students.find((s) => s.email === loginEmail);
    setTimeout(() => {
      setLoading(false);
      if (!user) { setErrors({ loginEmail: "No account found — please sign up" }); return; }
      if (user.password !== hash) { setErrors({ loginPw: "Incorrect password" }); return; }
      clearSession();
      saveSession({ name: user.name, email: user.email, id: user.studentId, loginAt: Date.now() });
      onLogin({ name: user.name, email: user.email });
    }, 700);
  };

  const handleSignup = async () => {
    const errs = {};
    if (!signupName || signupName.length < 3) errs.signupName = "Name must be at least 3 characters";
    if (!signupEmail) errs.signupEmail = "Email is required";
    else if (!validateEmail(signupEmail)) errs.signupEmail = "Enter a valid email";
    if (!signupId || signupId.length < 5) errs.signupId = "ID must be at least 5 characters";
    if (!signupPw || signupPw.length < 8) errs.signupPw = "Password must be at least 8 characters";
    if (signupPw !== signupConfirm) errs.signupConfirm = "Passwords do not match";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const students = getStudents();
    if (students.some((s) => s.email === signupEmail)) { setErrors({ signupEmail: "Email already registered" }); return; }
    if (students.some((s) => s.studentId === signupId)) { setErrors({ signupId: "This ID is already taken" }); return; }
    setLoading(true);
    const hash = await hashPassword(signupPw);
    setTimeout(() => {
      students.push({ name: signupName, email: signupEmail, studentId: signupId, password: hash, createdAt: Date.now() });
      saveStudents(students);
      setLoading(false);
      showToast("Account created! Please sign in.");
      setTimeout(() => { setTab("login"); setSignupName(""); setSignupEmail(""); setSignupId(""); setSignupPw(""); setSignupConfirm(""); }, 1000);
    }, 700);
  };

  const strength = pwStrength(signupPw);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, background: "#141927", border: `1px solid ${toast.type === "success" ? "#00d4aa" : "#ff6b6b"}`, borderLeft: `3px solid ${toast.type === "success" ? "#00d4aa" : "#ff6b6b"}`, borderRadius: 14, padding: "14px 18px", fontSize: 14, color: "#e8eaf0", zIndex: 999, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 12px 32px rgba(0,0,0,0.4)" }}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 32, animation: "fadeDown 0.6s ease both" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, background: "linear-gradient(135deg,#6c63ff,#00d4aa)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 0 24px rgba(108,99,255,0.4)" }}>🏡</div>
            <span style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 800, color: "#e8eaf0" }}>Prop<span style={{ color: "#00d4aa" }}>Smart</span></span>
          </div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>India Real Estate Valuation Platform</div>
        </div>

        <div style={{ background: "#141927", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: 36, boxShadow: "0 24px 64px rgba(0,0,0,0.5)", animation: "fadeUp 0.7s ease both" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#1c2235", borderRadius: 12, padding: 4, marginBottom: 28, border: "1px solid rgba(255,255,255,0.07)" }}>
            {["login", "signup"].map((t) => (
              <button key={t} onClick={() => { setTab(t); setErrors({}); }} style={{ padding: 10, border: "none", background: tab === t ? "#6c63ff" : "none", cursor: "pointer", fontFamily: "DM Sans,sans-serif", fontSize: 14, fontWeight: 500, color: tab === t ? "#fff" : "#6b7280", borderRadius: 9, transition: "all 0.25s", boxShadow: tab === t ? "0 4px 12px rgba(108,99,255,0.35)" : "none" }}>
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <>
              <div style={{ fontFamily: "Syne,sans-serif", fontSize: 20, fontWeight: 700, color: "#e8eaf0", marginBottom: 4 }}>Welcome back</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>Sign in to access your property estimates</div>
              {[
                { label: "Email Address", icon: "✉️", type: "email", value: loginEmail, set: setLoginEmail, id: "loginEmail", ph: "you@example.com" },
                { label: "Password", icon: "🔒", type: showPw.loginPw ? "text" : "password", value: loginPw, set: setLoginPw, id: "loginPw", ph: "Enter your password", toggle: "loginPw" },
              ].map((f) => (
                <div key={f.id} style={{ marginBottom: 16 }}>
                  <Label>{f.label}</Label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#1c2235", borderRadius: 12, padding: "12px 16px", border: errors[f.id] ? "1px solid #ff6b6b" : "1px solid rgba(255,255,255,0.07)" }}>
                    <span>{f.icon}</span>
                    <input type={f.type} value={f.value} onChange={(e) => { f.set(e.target.value); setErrors((p) => ({ ...p, [f.id]: "" })); }} placeholder={f.ph}
                      style={{ background: "none", border: "none", outline: "none", width: "100%", fontFamily: "DM Sans,sans-serif", fontSize: 14, color: "#e8eaf0" }} />
                    {f.toggle && <button onClick={() => setShowPw((p) => ({ ...p, [f.toggle]: !p[f.toggle] }))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>{showPw[f.toggle] ? "🙈" : "👁️"}</button>}
                  </div>
                  {errors[f.id] && <div style={{ fontSize: 12, color: "#ff6b6b", marginTop: 4 }}>{errors[f.id]}</div>}
                </div>
              ))}
              <button onClick={handleLogin} disabled={loading} style={{ width: "100%", padding: 14, background: "linear-gradient(135deg,#6c63ff,#9b59b6)", color: "#fff", border: "none", borderRadius: 12, fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 6px 20px rgba(108,99,255,0.3)", opacity: loading ? 0.7 : 1, transition: "all 0.2s" }}>
                {loading ? <><Spinner /><span>Please wait...</span></> : <><span>Sign In</span><span>→</span></>}
              </button>
            </>
          ) : (
            <>
              <div style={{ fontFamily: "Syne,sans-serif", fontSize: 20, fontWeight: 700, color: "#e8eaf0", marginBottom: 4 }}>Create your account</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>Join thousands of property seekers across India</div>
              {[
                { label: "Full Name", icon: "👤", type: "text", value: signupName, set: setSignupName, id: "signupName", ph: "Rajesh Kumar" },
                { label: "Email Address", icon: "✉️", type: "email", value: signupEmail, set: setSignupEmail, id: "signupEmail", ph: "you@example.com" },
                { label: "Student / Employee ID", icon: "🪪", type: "text", value: signupId, set: setSignupId, id: "signupId", ph: "e.g. STU2024001" },
                { label: "Password", icon: "🔒", type: showPw.signupPw ? "text" : "password", value: signupPw, set: setSignupPw, id: "signupPw", ph: "Create a strong password", toggle: "signupPw", strength: true },
                { label: "Confirm Password", icon: "🔒", type: showPw.signupConfirm ? "text" : "password", value: signupConfirm, set: setSignupConfirm, id: "signupConfirm", ph: "Repeat your password", toggle: "signupConfirm" },
              ].map((f) => (
                <div key={f.id} style={{ marginBottom: 14 }}>
                  <Label>{f.label}</Label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#1c2235", borderRadius: 12, padding: "12px 16px", border: errors[f.id] ? "1px solid #ff6b6b" : "1px solid rgba(255,255,255,0.07)" }}>
                    <span>{f.icon}</span>
                    <input type={f.type} value={f.value} onChange={(e) => { f.set(e.target.value); setErrors((p) => ({ ...p, [f.id]: "" })); }} placeholder={f.ph}
                      style={{ background: "none", border: "none", outline: "none", width: "100%", fontFamily: "DM Sans,sans-serif", fontSize: 14, color: "#e8eaf0" }} />
                    {f.toggle && <button onClick={() => setShowPw((p) => ({ ...p, [f.toggle]: !p[f.toggle] }))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>{showPw[f.toggle] ? "🙈" : "👁️"}</button>}
                  </div>
                  {f.strength && signupPw.length > 0 && (
                    <>
                      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                        {[0, 1, 2, 3].map((i) => <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i < strength ? strColors[strength - 1] : "#1c2235", transition: "background 0.3s" }} />)}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{strLabels[strength - 1] || ""}</div>
                    </>
                  )}
                  {errors[f.id] && <div style={{ fontSize: 12, color: "#ff6b6b", marginTop: 4 }}>{errors[f.id]}</div>}
                </div>
              ))}
              <button onClick={handleSignup} disabled={loading} style={{ width: "100%", padding: 14, background: "linear-gradient(135deg,#6c63ff,#9b59b6)", color: "#fff", border: "none", borderRadius: 12, fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 6px 20px rgba(108,99,255,0.3)", opacity: loading ? 0.7 : 1, transition: "all 0.2s", marginTop: 8 }}>
                {loading ? <><Spinner /><span>Please wait...</span></> : <><span>Create Account</span><span>✨</span></>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function DashboardPage({ user, onNavigate }) {
  const history = getHistory();
  const totalPortfolio = history.reduce((s, h) => s + (h.total || 0), 0);
  const cities = [...new Set(history.map((h) => h.city))];
  const hr = new Date().getHours();
  const greeting = hr < 12 ? "Good morning ☀️" : hr < 17 ? "Good afternoon 🌤️" : "Good evening 🌙";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now = new Date();
  const bars = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const count = history.filter((h) => { const hd = new Date(h.savedAt); return hd.getMonth() === d.getMonth() && hd.getFullYear() === d.getFullYear(); }).length;
    return { label: months[d.getMonth()], count };
  });
  const maxBar = Math.max(...bars.map((b) => b.count), 1);

  const typeIcons = { apartment: "🏢", villa: "🏡", plot: "🌿", commercial: "🏪" };
  const typeCounts = { apartment: 0, villa: 0, plot: 0, commercial: 0 };
  history.forEach((h) => { if (typeCounts[h.type] !== undefined) typeCounts[h.type]++; });
  const typeColors = { apartment: "#6c63ff", villa: "#00d4aa", plot: "#f5c842", commercial: "#ff9f43" };
  const typeNames = { apartment: "🏢 Apartment", villa: "🏡 Villa", plot: "🌿 Plot", commercial: "🏪 Commercial" };

  const marketData = [
    { city: "Mumbai – South", state: "Maharashtra", rate: "₹20,833", trend: "🔥 Premium", cls: "hot" },
    { city: "Delhi – South", state: "Delhi NCT", rate: "₹12,500", trend: "↑ Rising", cls: "up" },
    { city: "Bangalore – Indiranagar", state: "Karnataka", rate: "₹7,500", trend: "↑ Hot", cls: "up" },
    { city: "Hyderabad – Jubilee Hills", state: "Telangana", rate: "₹7,083", trend: "↑ Growing", cls: "up" },
    { city: "Pune – Baner/Aundh", state: "Maharashtra", rate: "₹5,000", trend: "↑ Stable", cls: "up" },
    { city: "Chennai – Anna Nagar", state: "Tamil Nadu", rate: "₹5,833", trend: "🔥 High Demand", cls: "hot" },
    { city: "Tirupati", state: "Andhra Pradesh", rate: "₹1,250", trend: "↑ Emerging", cls: "up" },
  ];

  const trendColor = (cls) => cls === "hot" ? { bg: "rgba(245,200,66,0.1)", color: "#f5c842" } : { bg: "rgba(74,222,128,0.1)", color: "#4ade80" };

  const quickActions = [
    { icon: "🏡", title: "New Estimate", desc: "Calculate market value for any property across India", page: "estimator" },
    { icon: "⚖️", title: "Compare Properties", desc: "Side-by-side analysis of up to 3 properties", page: "compare" },
    { icon: "🏦", title: "EMI Calculator", desc: "Loan eligibility, EMI breakdown & amortization", page: "emi" },
    { icon: "📋", title: "My Estimates", desc: "Review and manage your saved property valuations", page: "estimator" },
  ];

  const tips = [
    { icon: "📍", title: "Buy in Tier-2 Cities Now", body: "Cities like Tirupati, Nashik, and Coimbatore are seeing 8–12% YoY appreciation with lower entry points." },
    { icon: "🏗️", title: "Under-Construction Premium", body: "New construction commands 15% premium but offers better amenities and no immediate renovation costs." },
    { icon: "🏦", title: "Loan-to-Value Ratio", body: "Banks typically fund 75–80% of property value. Use our EMI Calculator to plan your down payment strategy." },
    { icon: "📈", title: "Land Appreciates Fastest", body: "Plot investments in metro peripheries historically outperform apartments by 2–3× over 10-year periods." },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 24px 80px" }}>
      <div style={{ marginBottom: 36, animation: "fadeDown 0.6s ease both" }}>
        <div style={{ fontSize: 13, color: "#00d4aa", fontWeight: 500, marginBottom: 6 }}>{greeting}</div>
        <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: "clamp(22px,3vw,32px)", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 6 }}>
          Welcome back, {(user?.name || "").split(" ")[0]} 👋
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280" }}>Here's your property intelligence summary for today.</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { icon: "📊", val: history.length, label: "Saved Estimates", sub: history.length > 0 ? `${history.length} estimate${history.length > 1 ? "s" : ""} saved` : "Start by adding estimates", color: "#6c63ff", bg: "rgba(108,99,255,0.1)" },
          { icon: "💰", val: totalPortfolio > 0 ? fmtL(totalPortfolio) : "₹0", label: "Portfolio Value", sub: "Across all saved properties", color: "#00d4aa", bg: "rgba(0,212,170,0.1)" },
          { icon: "🏙️", val: cities.length, label: "Cities Tracked", sub: cities.length > 0 ? cities.slice(0, 3).join(", ") : "No cities yet", color: "#f5c842", bg: "rgba(245,200,66,0.1)" },
          { icon: "📈", val: "₹12,500", label: "Avg. Rate/sq.ft Today", sub: "↑ 3.2% vs last month", color: "#ff9f43", bg: "rgba(255,159,67,0.1)" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#141927", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 22px", position: "relative", overflow: "hidden", animation: `fadeUp 0.6s ease ${0.1 + i * 0.1}s both`, transition: "transform 0.2s" }}>
            <div style={{ position: "absolute", top: -30, right: -30, width: 90, height: 90, borderRadius: "50%", background: s.bg, opacity: 0.7 }} />
            <div style={{ fontSize: 22, marginBottom: 12 }}>{s.icon}</div>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>{s.label}</div>
            <div style={{ fontSize: 11, marginTop: 6, color: "#4ade80" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
        <div>
          {/* Quick Actions */}
          <Card delay={0.2} style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 20 }}>⚡ Quick Actions</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {quickActions.map((a) => (
                <button key={a.title} onClick={() => onNavigate(a.page)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", background: "#1c2235", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18, cursor: "pointer", textAlign: "left", position: "relative", transition: "all 0.25s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6c63ff"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "none"; }}>
                  <div style={{ fontSize: 26, marginBottom: 10 }}>{a.icon}</div>
                  <div style={{ fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 700, color: "#e8eaf0", marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.4 }}>{a.desc}</div>
                  <span style={{ position: "absolute", top: 16, right: 16, color: "#6b7280", fontSize: 16 }}>↗</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Market Rates */}
          <Card delay={0.3} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700 }}>🗺️ City Market Rates</span>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(108,99,255,0.12)", color: "#6c63ff" }}>Live Reference</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["City", "Rate/sq.ft", "Type", "Trend"].map((h) => <th key={h} style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", padding: "0 12px 12px", textAlign: "left", fontWeight: 500, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {marketData.map((r) => {
                  const tc = trendColor(r.cls);
                  return (
                    <tr key={r.city} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ padding: 12 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{r.city}</div><div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{r.state}</div></td>
                      <td style={{ padding: 12, fontFamily: "Syne,sans-serif", fontWeight: 700, color: "#00d4aa", fontSize: 13 }}>{r.rate}</td>
                      <td style={{ padding: 12, color: "#6b7280", fontSize: 12 }}>Residential</td>
                      <td style={{ padding: 12 }}><span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 5, background: tc.bg, color: tc.color }}>{r.trend}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Bar Chart */}
          <Card delay={0.4}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700 }}>📊 Monthly Activity</span>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(108,99,255,0.12)", color: "#6c63ff" }}>Estimates Created</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
              {bars.map((b, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
                  <div title={`${b.count} estimates`} style={{ width: "100%", borderRadius: "4px 4px 0 0", background: i === 5 ? "linear-gradient(to top,#00d4aa,rgba(0,212,170,0.4))" : "linear-gradient(to top,#6c63ff,rgba(108,99,255,0.4))", height: Math.max((b.count / maxBar) * 68, 4), transition: "height 0.8s cubic-bezier(0.16,1,0.3,1)", minHeight: 4 }} />
                  <div style={{ fontSize: 10, color: "#6b7280" }}>{b.label}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          {/* Portfolio */}
          <Card delay={0.25} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700 }}>🏠 My Portfolio</span>
              <button onClick={() => onNavigate("estimator")} style={{ fontSize: 12, color: "#6c63ff", background: "none", border: "none", cursor: "pointer", fontFamily: "DM Sans,sans-serif" }}>+ Add New</button>
            </div>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 0", color: "#6b7280" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🏘️</div>
                <p style={{ fontSize: 13 }}>No saved estimates yet.</p>
                <button onClick={() => onNavigate("estimator")} style={{ marginTop: 6, color: "#6c63ff", background: "none", border: "none", cursor: "pointer", fontSize: 13, textDecoration: "underline", fontFamily: "DM Sans,sans-serif" }}>Calculate your first property →</button>
              </div>
            ) : (
              history.slice(0, 6).map((h) => (
                <div key={h.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: "#1c2235", border: "1px solid rgba(255,255,255,0.07)" }}>{typeIcons[h.type] || "🏠"}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{h.city}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{Number(h.area).toLocaleString()} sq.ft · {h.state}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, color: "#00d4aa" }}>{fmtL(h.total)}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{new Date(h.savedAt).toLocaleDateString("en-IN")}</div>
                  </div>
                </div>
              ))
            )}
          </Card>

          {/* Portfolio Mix */}
          <Card delay={0.35} style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🍩 Portfolio Mix</div>
            {history.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 13, textAlign: "center", padding: "16px 0" }}>Save estimates to see your portfolio breakdown</p>
            ) : (
              Object.entries(typeCounts).filter(([, c]) => c > 0).map(([t, c]) => {
                const pct = Math.round((c / history.length) * 100);
                return (
                  <div key={t} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                      <span>{typeNames[t]}</span><span style={{ color: typeColors[t], fontWeight: 600 }}>{pct}% ({c})</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "#1c2235" }}>
                      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: typeColors[t], transition: "width 1s ease" }} />
                    </div>
                  </div>
                );
              })
            )}
          </Card>

          {/* Tips */}
          <Card delay={0.45}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700 }}>💡 Market Tips</span>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(108,99,255,0.12)", color: "#6c63ff" }}>Today</span>
            </div>
            {tips.map((tip, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: i < tips.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none", alignItems: "flex-start" }}>
                <div style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{tip.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf0", marginBottom: 3 }}>{tip.title}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>{tip.body}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── ESTIMATOR ────────────────────────────────────────────────────────────────
function EstimatorPage() {
  const states = Object.keys(INDIA_DATA).sort();
  const [state, setState] = useState(states[0]);
  const [city, setCity] = useState(Object.keys(INDIA_DATA[states[0]])[0]);
  const [type, setType] = useState("apartment");
  const [bhk, setBhk] = useState("2");
  const [condition, setCondition] = useState("good");
  const [floor, setFloor] = useState("mid");
  const [area, setArea] = useState(1200);
  const [age, setAge] = useState(5);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(getHistory());
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const cities = Object.keys(INDIA_DATA[state] || {});
  const cityBase = INDIA_DATA[state]?.[city] || 1000000;

  const isPlot = type === "plot";
  const bhkOptions = type === "commercial"
    ? [{ value: "1", label: "Small (<500 sq.ft)" }, { value: "2", label: "Medium (500–1500)" }, { value: "3", label: "Large (1500–5000)" }, { value: "4", label: "Showroom / Floor" }]
    : [{ value: "1", label: "1 BHK" }, { value: "2", label: "2 BHK" }, { value: "3", label: "3 BHK" }, { value: "4", label: "4+ BHK" }];

  const typeOptions = [
    { value: "apartment", label: "🏢 Apartment" }, { value: "villa", label: "🏡 Villa" },
    { value: "plot", label: "🌿 Plot" }, { value: "commercial", label: "🏪 Commercial" },
  ];
  const condOptions = [{ value: "new", label: "New" }, { value: "good", label: "Good" }, { value: "average", label: "Average" }, { value: "old", label: "Needs Reno" }];
  const floorOptions = [
    { value: "ground", label: "Ground" }, { value: "low", label: "Low (1–5)" },
    { value: "mid", label: "Mid (6–15)" }, { value: "high", label: "High (16+)" }, { value: "penthouse", label: "Penthouse" },
  ];

  const calculate = () => {
    if (area < 50) { showToast("⚠️ Please enter a valid area (min 50 sq.ft)"); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const mkt = cityBase / 1200;
      let r;
      if (isPlot) {
        const total = Math.round(area * mkt / 1000) * 1000;
        r = { total, land: total, building: 0, ratePerSqft: Math.round(total / area), area, age: 0, city, state, type: "plot", bhk: "—", condition: "—" };
      } else {
        const landVal = area * mkt * 0.60;
        const bldgNew = area * mkt * 0.40;
        const ageFac = Math.max(Math.pow(0.975, age), 0.20);
        const condFac = { new: 1.15, good: 1.0, average: 0.88, old: 0.72 }[condition] || 1.0;
        const bhkFac = { "1": 0.90, "2": 1.0, "3": 1.10, "4": 1.22 }[bhk] || 1.0;
        const floorFac = type === "apartment" ? ({ ground: 0.92, low: 0.96, mid: 1.0, high: 1.07, penthouse: 1.22 }[floor] || 1.0) : 1.0;
        const typeFac = type === "commercial" ? 1.30 : 1.0;
        const bldgVal = bldgNew * ageFac * condFac * bhkFac * floorFac * typeFac;
        const total = Math.round((landVal + bldgVal) / 1000) * 1000;
        r = { total, land: Math.round(landVal), building: Math.round(bldgVal), ratePerSqft: Math.round(total / area), area, age, city, state, type, bhk, condition };
      }
      setResult(r);
      Analytics.track("calculate_estimate", { city, type });
    }, 750);
  };

  const saveEst = () => {
    if (!result) return;
    const h = getHistory();
    h.unshift({ ...result, savedAt: Date.now(), id: Date.now() });
    if (h.length > 20) h.pop();
    saveHistory(h);
    setHistory(getHistory());
    showToast("✅ Estimate saved!");
  };

  const deleteItem = (id) => {
    const h = getHistory().filter((x) => x.id !== id);
    saveHistory(h);
    setHistory(h);
  };

  const typeIcons = { apartment: "🏢", villa: "🏡", plot: "🌿", commercial: "🏪" };
  const ratio = result ? result.ratePerSqft / (cityBase / 1200) : 1;
  const posLabel = ratio > 1.12 ? "⬆ Above Market" : ratio < 0.88 ? "⬇ Below Market" : "↔ At Market Rate";
  const posClass = ratio > 1.12 ? "up" : ratio < 0.88 ? "down" : "mid";
  const posColors = { up: { bg: "rgba(0,212,170,0.12)", color: "#00d4aa" }, down: { bg: "rgba(255,107,107,0.12)", color: "#ff6b6b" }, mid: { bg: "rgba(245,200,66,0.12)", color: "#f5c842" } };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 60px" }}>
      {toast && <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#141927", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 20px", fontSize: 14, color: "#e8eaf0", zIndex: 999, boxShadow: "0 12px 32px rgba(0,0,0,0.4)", whiteSpace: "nowrap" }}>{toast}</div>}
      <div style={{ textAlign: "center", padding: "40px 0 36px" }}>
        <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: "clamp(28px,5vw,46px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", marginBottom: 12 }}>
          Smart Property <span style={{ background: "linear-gradient(135deg,#6c63ff,#00d4aa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Valuation</span><br />Across India
        </h1>
        <p style={{ fontSize: 16, color: "#6b7280" }}>AI-powered estimates covering all states · Real market data · Instant results</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
        <Card>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Property Details <span style={{ background: "rgba(108,99,255,0.15)", color: "#6c63ff", fontSize: 11, padding: "2px 8px", borderRadius: 20, fontFamily: "DM Sans,sans-serif", fontWeight: 500 }}>Step 1 of 1</span></div>

          <div style={{ marginBottom: 16 }}>
            <Label>Property Type</Label>
            <Chips options={typeOptions} value={type} onChange={(v) => { setType(v); setBhk("2"); setCondition("good"); }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <Label>📍 State</Label>
              <Select value={state} onChange={(v) => { setState(v); setCity(Object.keys(INDIA_DATA[v])[0]); }}>
                {states.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <Label>🏙️ City / Locality</Label>
              <Select value={city} onChange={setCity}>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
          </div>

          {!isPlot && (
            <div style={{ marginBottom: 16 }}>
              <Label>{type === "commercial" ? "🏢 Office / Shop Size" : "🛏️ Configuration"}</Label>
              <Chips options={bhkOptions} value={bhk} onChange={setBhk} />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <Label>📐 Area (sq.ft)</Label>
              <NumberInput value={area} onChange={(v) => setArea(parseFloat(v) || 0)} min={100} max={50000} step={50} />
            </div>
            {!isPlot && (
              <div>
                <Label>📅 Property Age (years)</Label>
                <NumberInput value={age} onChange={(v) => setAge(parseFloat(v) || 0)} min={0} max={60} step={1} />
              </div>
            )}
          </div>

          {!isPlot && (
            <>
              <div style={{ marginBottom: 16 }}>
                <Label>🔧 Condition</Label>
                <Chips options={condOptions} value={condition} onChange={setCondition} />
              </div>
              {type === "apartment" && (
                <div style={{ marginBottom: 16 }}>
                  <Label>🏗️ Floor Level</Label>
                  <Select value={floor} onChange={setFloor}>
                    {floorOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </div>
              )}
            </>
          )}

          <button onClick={calculate} disabled={loading}
            style={{ width: "100%", height: 54, background: "transparent", border: "1px solid rgba(108,99,255,0.25)", borderRadius: 12, boxShadow: "inset 0 0 12px rgba(108,99,255,0.15)", cursor: loading ? "not-allowed" : "pointer", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 800, color: "#c8c4ff", transition: "all 0.2s", opacity: loading ? 0.6 : 1 }}>
            {loading ? <><Spinner /><span>Calculating...</span></> : <><span>✨</span><span>Calculate Market Value</span></>}
          </button>
        </Card>

        <div>
          {result ? (
            <div style={{ background: "#141927", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 28, animation: "fadeIn 0.5s ease" }}>
              <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.6px" }}>Estimated Market Value</div>
              <div style={{ fontFamily: "Syne,sans-serif", fontSize: 36, fontWeight: 800, background: "linear-gradient(135deg,#00d4aa,#00b891)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "8px 0 4px", letterSpacing: "-1px" }}>{fmt(result.total)}</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>₹{result.ratePerSqft.toLocaleString("en-IN")} per sq.ft · {result.city}</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                {[
                  { val: fmt(result.land), label: "🌍 Land Value" },
                  result.type !== "plot" ? { val: fmt(result.building), label: "🏗️ Construction Value" } : { val: `${Number(result.area).toLocaleString()} sq.ft`, label: "📐 Plot Area" },
                ].map((item, i) => (
                  <div key={i} style={{ background: "#1c2235", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 14 }}>
                    <div style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 700, color: "#e8eaf0" }}>{item.val}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{item.label}</div>
                  </div>
                ))}
              </div>

              {[
                { key: "Market Position", val: <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, ...posColors[posClass] }}>{posLabel}</span> },
                { key: "Property Type", val: ({ apartment: "🏢 Apartment", villa: "🏡 Villa", plot: "🌿 Plot", commercial: "🏪 Commercial" })[result.type] },
                result.bhk !== "—" ? { key: "Configuration", val: result.bhk + " BHK" } : null,
                result.type !== "plot" ? { key: "Condition", val: ({ new: "New", good: "Good", average: "Average", old: "Needs Renovation" })[result.condition] } : null,
                result.type !== "plot" ? { key: "Property Age", val: `${result.age} year${result.age !== 1 ? "s" : ""}` } : null,
                { key: "Built-up Area", val: `${Number(result.area).toLocaleString("en-IN")} sq.ft` },
                { key: "Rate per sq.ft", val: `₹${result.ratePerSqft.toLocaleString("en-IN")}` },
              ].filter(Boolean).map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: 13 }}>
                  <span style={{ color: "#6b7280" }}>{row.key}</span>
                  <span style={{ fontWeight: 500 }}>{row.val}</span>
                </div>
              ))}

              <button onClick={saveEst} style={{ width: "100%", padding: 11, background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.25)", color: "#00d4aa", borderRadius: 10, fontFamily: "DM Sans,sans-serif", fontSize: 13, fontWeight: 500, cursor: "pointer", marginTop: 16, transition: "all 0.2s" }}>
                💾 Save This Estimate
              </button>
            </div>
          ) : (
            <div style={{ background: "#141927", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "48px 20px", color: "#6b7280", textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>🏘️</div>
              <p style={{ fontSize: 14 }}>Fill in the details and click<br /><strong>Calculate Market Value</strong></p>
            </div>
          )}

          <Card style={{ marginTop: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700 }}>📋 Saved Estimates</span>
              <button onClick={() => { saveHistory([]); setHistory([]); }} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 12, cursor: "pointer", fontFamily: "DM Sans,sans-serif" }}>Clear all</button>
            </div>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: "#6b7280", fontSize: 14 }}>No saved estimates yet</div>
            ) : (
              history.map((h) => (
                <div key={h.id} style={{ background: "#1c2235", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{typeIcons[h.type] || "🏠"} {h.city}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{Number(h.area).toLocaleString()} sq.ft · {h.state}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, color: "#00d4aa" }}>{fmtL(h.total)}</div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{new Date(h.savedAt).toLocaleDateString("en-IN")}</div>
                    </div>
                    <button onClick={() => deleteItem(h.id)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14 }}>✕</button>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── COMPARE ──────────────────────────────────────────────────────────────────
function ComparePage() {
  const states = Object.keys(INDIA_DATA).sort();
  const initSlot = (i) => {
    const s = states[i * 4 % states.length];
    const c = Object.keys(INDIA_DATA[s])[0];
    return { state: s, city: c, type: "apartment", condition: "good", area: 1200, age: 5 };
  };
  const [slots, setSlots] = useState([initSlot(0), initSlot(1), initSlot(2)]);
  const [results, setResults] = useState([null, null, null]);
  const [loadings, setLoadings] = useState([false, false, false]);

  const slotColors = ["#6c63ff", "#00d4aa", "#f5c842"];
  const slotNames = ["A", "B", "C"];

  const updateSlot = (i, key, val) => {
    setSlots((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: val };
      if (key === "state") next[i].city = Object.keys(INDIA_DATA[val])[0];
      return next;
    });
  };

  const calcSlot = (i) => {
    const s = slots[i];
    setLoadings((p) => { const n = [...p]; n[i] = true; return n; });
    setTimeout(() => {
      setLoadings((p) => { const n = [...p]; n[i] = false; return n; });
      const cityBase = INDIA_DATA[s.state]?.[s.city] || 1000000;
      const mkt = cityBase / 1200;
      const area = parseFloat(s.area) || 0;
      if (area < 50) return;
      let r;
      if (s.type === "plot") {
        const total = Math.round(area * mkt / 1000) * 1000;
        r = { total, land: total, building: 0, ratePerSqft: Math.round(total / area), area, age: 0, city: s.city, state: s.state, type: "plot", cond: "—" };
      } else {
        const landVal = area * mkt * 0.60;
        const bldgVal = area * mkt * 0.40 * Math.max(Math.pow(0.975, s.age || 0), 0.20) * ({ new: 1.15, good: 1.0, average: 0.88, old: 0.72 }[s.condition] || 1.0) * (s.type === "commercial" ? 1.30 : 1.0);
        const total = Math.round((landVal + bldgVal) / 1000) * 1000;
        r = { total, land: Math.round(landVal), building: Math.round(bldgVal), ratePerSqft: Math.round(total / area), area, age: s.age, city: s.city, state: s.state, type: s.type, cond: s.condition };
      }
      setResults((p) => { const n = [...p]; n[i] = r; return n; });
    }, 600);
  };

  const clearSlot = (i) => setResults((p) => { const n = [...p]; n[i] = null; return n; });

  const filledCount = results.filter(Boolean).length;

  const winIdx = (arr, higher = true) => {
    let best = -1, bestVal = higher ? -Infinity : Infinity;
    arr.forEach((v, i) => { if (v === null) return; if (higher ? v > bestVal : v < bestVal) { bestVal = v; best = i; } });
    return best;
  };

  const typeOptions = [{ value: "apartment", label: "🏢 Apt" }, { value: "villa", label: "🏡 Villa" }, { value: "plot", label: "🌿 Plot" }, { value: "commercial", label: "🏪 Comm." }];
  const condOptions = [{ value: "new", label: "New" }, { value: "good", label: "Good" }, { value: "average", label: "Average" }, { value: "old", label: "Old" }];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 24px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 36, animation: "fadeDown 0.6s ease both" }}>
        <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: "clamp(24px,3.5vw,38px)", fontWeight: 800, letterSpacing: "-0.8px", marginBottom: 8 }}>
          Side-by-Side <span style={{ background: "linear-gradient(135deg,#6c63ff,#00d4aa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Property Comparison</span>
        </h1>
        <p style={{ fontSize: 15, color: "#6b7280" }}>Fill up to 3 properties and instantly compare valuations, rates, and key metrics</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
        {[0, 1, 2].map((i) => {
          const s = slots[i];
          const res = results[i];
          const color = slotColors[i];
          const cities = Object.keys(INDIA_DATA[s.state] || {});
          return (
            <div key={i} style={{ background: "#141927", border: `2px ${res ? "solid" : "dashed"} ${res ? color + "66" : "rgba(255,255,255,0.1)"}`, borderRadius: 20, padding: 24, animation: `fadeUp 0.6s ease ${i * 0.1}s both`, transition: "border-color 0.2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}33`, color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 800 }}>{slotNames[i]}</div>
                <button onClick={() => clearSlot(i)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 16, padding: "2px 6px", borderRadius: 4 }}>✕</button>
              </div>

              <Label>📍 State</Label>
              <div style={{ marginBottom: 12 }}>
                <Select value={s.state} onChange={(v) => updateSlot(i, "state", v)}>
                  {states.map((st) => <option key={st} value={st}>{st}</option>)}
                </Select>
              </div>

              <Label>🏙️ City</Label>
              <div style={{ marginBottom: 12 }}>
                <Select value={s.city} onChange={(v) => updateSlot(i, "city", v)}>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>

              <Label>🏠 Property Type</Label>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                {typeOptions.map((o) => (
                  <button key={o.value} onClick={() => updateSlot(i, "type", o.value)} style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${s.type === o.value ? color : "rgba(255,255,255,0.07)"}`, background: s.type === o.value ? `${color}1a` : "#1c2235", fontSize: 11, color: s.type === o.value ? color : "#6b7280", cursor: "pointer", fontFamily: "DM Sans,sans-serif", transition: "all 0.2s" }}>
                    {o.label}
                  </button>
                ))}
              </div>

              <Label>📐 Area (sq.ft)</Label>
              <div style={{ marginBottom: 12 }}>
                <NumberInput value={s.area} onChange={(v) => updateSlot(i, "area", v)} min={100} step={50} />
              </div>

              {s.type !== "plot" && (
                <>
                  <Label>📅 Age (years)</Label>
                  <div style={{ marginBottom: 12 }}>
                    <NumberInput value={s.age} onChange={(v) => updateSlot(i, "age", v)} min={0} max={60} />
                  </div>
                  <Label>🔧 Condition</Label>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                    {condOptions.map((o) => (
                      <button key={o.value} onClick={() => updateSlot(i, "condition", o.value)} style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${s.condition === o.value ? color : "rgba(255,255,255,0.07)"}`, background: s.condition === o.value ? `${color}1a` : "#1c2235", fontSize: 11, color: s.condition === o.value ? color : "#6b7280", cursor: "pointer", fontFamily: "DM Sans,sans-serif", transition: "all 0.2s" }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <button onClick={() => calcSlot(i)} disabled={loadings[i]} style={{ width: "100%", padding: 12, border: "none", borderRadius: 10, fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", background: `${color}26`, color, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4, transition: "all 0.2s", opacity: loadings[i] ? 0.7 : 1 }}>
                {loadings[i] ? <><Spinner color={color} /><span>Calculating...</span></> : "✨ Calculate"}
              </button>

              {res && (
                <div style={{ marginTop: 16, padding: 14, background: "#1c2235", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ fontFamily: "Syne,sans-serif", fontSize: 20, fontWeight: 800, color, marginBottom: 2 }}>{fmt(res.total)}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>₹{res.ratePerSqft.toLocaleString("en-IN")}/sq.ft · {res.city}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filledCount < 2 ? (
        <div style={{ background: "#141927", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "60px 20px", textAlign: "center", color: "#6b7280" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚖️</div>
          <p style={{ fontSize: 14 }}>Calculate at least 2 properties above to see the comparison</p>
        </div>
      ) : (
        <div style={{ background: "#141927", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: "16px 20px", textAlign: "left", fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, borderBottom: "2px solid rgba(255,255,255,0.07)", background: "#1c2235", color: "#6b7280" }}>Metric</th>
                {results.map((r, i) => (
                  <th key={i} style={{ padding: "16px 20px", textAlign: "center", fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, borderBottom: `2px solid ${r ? slotColors[i] : "rgba(255,255,255,0.07)"}`, background: "#1c2235", color: r ? slotColors[i] : "#6b7280" }}>
                    {r ? `${slotNames[i]} — ${r.city.split("(")[0].trim()}` : "—"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "💰 Total Value", vals: results.map((r) => r?.total ?? null), higher: true, fmt: fmt },
                { label: "📐 Rate per sq.ft", vals: results.map((r) => r?.ratePerSqft ?? null), higher: false, fmt: (v) => `₹${v.toLocaleString("en-IN")}` },
                { label: "🌍 Land Value", vals: results.map((r) => r?.land ?? null), higher: true, fmt: fmt },
                { label: "🏗️ Construction", vals: results.map((r) => r ? (r.building || 0) : null), higher: true, fmt: (v) => v > 0 ? fmt(v) : "—" },
                { label: "📏 Area", vals: results.map((r) => r?.area ?? null), higher: true, fmt: (v) => `${v.toLocaleString()} sq.ft` },
                { label: "📅 Property Age", vals: results.map((r) => r?.age ?? null), higher: false, fmt: (v) => `${v} yr${v !== 1 ? "s" : ""}` },
                { label: "🌍 Land Share %", vals: results.map((r) => r ? Math.round((r.land / r.total) * 100) : null), higher: true, fmt: (v) => `${v}%` },
              ].map(({ label, vals, higher, fmt: fmtFn }) => {
                const w = winIdx(vals, higher);
                return (
                  <tr key={label} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "13px 20px", fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{label}</td>
                    {vals.map((v, i) => (
                      <td key={i} style={{ padding: "13px 20px", textAlign: "center", fontSize: 13, fontWeight: i === w ? 700 : 400, color: i === w ? slotColors[i] : "#e8eaf0" }}>
                        {v === null ? <span style={{ color: "#6b7280", fontStyle: "italic" }}>—</span> : (
                          <>
                            {fmtFn(v)}
                            {i === w && <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, marginLeft: 6, background: `${slotColors[i]}26`, color: slotColors[i] }}>BEST</span>}
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {[
                { label: "🏠 Type", vals: results.map((r) => r ? ({ apartment: "🏢 Apartment", villa: "🏡 Villa", plot: "🌿 Plot", commercial: "🏪 Commercial" })[r.type] : null) },
                { label: "🔧 Condition", vals: results.map((r) => r ? ({ new: "New", good: "Good", average: "Average", old: "Needs Reno", "—": "—" })[r.cond] : null) },
                { label: "📍 City", vals: results.map((r) => r?.city ?? null) },
                { label: "🗺️ State", vals: results.map((r) => r?.state ?? null) },
              ].map(({ label, vals }) => (
                <tr key={label} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "13px 20px", fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{label}</td>
                  {vals.map((v, i) => <td key={i} style={{ padding: "13px 20px", textAlign: "center", fontSize: 13, color: v ? "#e8eaf0" : "#6b7280", fontStyle: v ? "normal" : "italic" }}>{v || "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── EMI CALCULATOR ───────────────────────────────────────────────────────────
function EmiPage() {
  const [propVal, setPropVal] = useState(5000000);
  const [downPct, setDownPct] = useState(20);
  const [loanAmt, setLoanAmt] = useState(4000000);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);
  const [income, setIncome] = useState(100000);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const onPropChange = (v) => { setPropVal(v); setLoanAmt(Math.round(v * (1 - downPct / 100))); };
  const onDownChange = (v) => { setDownPct(v); setLoanAmt(Math.round(propVal * (1 - v / 100))); };
  const onLoanChange = (v) => { setLoanAmt(v); const dp = Math.round((1 - v / propVal) * 100); setDownPct(Math.min(50, Math.max(10, dp))); };

  const calculate = () => {
    if (loanAmt < 100000) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const r = rate / 12 / 100;
      const n = tenure * 12;
      const emi = r === 0 ? loanAmt / n : loanAmt * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
      const totalPay = emi * n;
      const totalInt = totalPay - loanAmt;
      const emiToIncome = (emi / income) * 100;

      const yearlyData = [];
      let balance = loanAmt;
      for (let yr = 1; yr <= tenure; yr++) {
        let yrP = 0, yrI = 0;
        for (let mo = 0; mo < 12; mo++) {
          const iP = balance * r, pP = emi - iP;
          yrI += iP; yrP += pP; balance -= pP;
          if (balance < 0) balance = 0;
        }
        yearlyData.push({ yr, principal: yrP, interest: yrI, balance: Math.max(0, balance) });
      }
      setResult({ emi, totalPay, totalInt, emiToIncome, yearlyData, r, n, P: loanAmt, downAmt: propVal - loanAmt });
    }, 800);
  };

  const affordClass = result ? (result.emiToIncome <= 30 ? "safe" : result.emiToIncome <= 50 ? "warn" : "danger") : "safe";
  const affordColors = { safe: "#4ade80", warn: "#f5c842", danger: "#ff6b6b" };
  const affordLabel = result ? (result.emiToIncome <= 30 ? "✅ Affordable" : result.emiToIncome <= 50 ? "⚠️ Moderate Stress" : "🚨 High Stress") : "";

  const banks = [
    { name: "SBI Home Loan", rate: "8.50% – 9.65%" }, { name: "HDFC Bank", rate: "8.70% – 9.95%" },
    { name: "ICICI Bank", rate: "8.75% – 10.05%" }, { name: "Axis Bank", rate: "8.75% – 9.15%" },
    { name: "Kotak Mahindra", rate: "8.70% – 9.50%" }, { name: "PNB Housing", rate: "8.50% – 11.45%" },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 24px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 36, animation: "fadeDown 0.6s ease both" }}>
        <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: "clamp(24px,3.5vw,38px)", fontWeight: 800, letterSpacing: "-0.8px", marginBottom: 8 }}>
          Home Loan <span style={{ background: "linear-gradient(135deg,#6c63ff,#00d4aa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>EMI Calculator</span>
        </h1>
        <p style={{ fontSize: 15, color: "#6b7280" }}>Calculate EMI, total interest, affordability & full amortization schedule</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 24, alignItems: "start" }}>
        <div>
          <Card delay={0.1} style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 20 }}>🏦 Loan Details</div>

            {[
              { label: "Property / Loan Value", value: propVal, onChange: (v) => onPropChange(parseFloat(v) || 0), prefix: "₹" },
              { label: "Loan Amount", value: loanAmt, onChange: (v) => onLoanChange(parseFloat(v) || 0), prefix: "₹" },
              { label: "Interest Rate (%)", value: rate, onChange: (v) => setRate(parseFloat(v) || 8.5), prefix: "%" },
            ].map((f) => (
              <div key={f.label} style={{ marginBottom: 16 }}>
                <Label>{f.label}</Label>
                <NumberInput value={f.value} onChange={f.onChange} min={0} step={f.prefix === "₹" ? 100000 : 0.1} prefix={f.prefix} />
              </div>
            ))}

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "#6b7280" }}>Down Payment</span>
                <span style={{ fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 700, color: "#00d4aa" }}>{downPct}% ({fmtL(propVal * downPct / 100)})</span>
              </div>
              <input type="range" min={10} max={50} step={5} value={downPct} onChange={(e) => onDownChange(parseInt(e.target.value))}
                style={{ width: "100%", height: 4, background: `linear-gradient(90deg, #6c63ff ${(downPct - 10) / 40 * 100}%, #1c2235 0%)`, borderRadius: 4, outline: "none", border: "none", cursor: "pointer", appearance: "none" }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "#6b7280" }}>Loan Tenure</span>
                <span style={{ fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 700, color: "#00d4aa" }}>{tenure} Year{tenure > 1 ? "s" : ""}</span>
              </div>
              <input type="range" min={1} max={30} step={1} value={tenure} onChange={(e) => setTenure(parseInt(e.target.value))}
                style={{ width: "100%", height: 4, background: `linear-gradient(90deg, #6c63ff ${(tenure - 1) / 29 * 100}%, #1c2235 0%)`, borderRadius: 4, outline: "none", border: "none", cursor: "pointer", appearance: "none" }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Label>Monthly Income (for Affordability)</Label>
              <NumberInput value={income} onChange={(v) => setIncome(parseFloat(v) || 0)} min={10000} step={10000} prefix="₹" />
            </div>

            <button onClick={calculate} disabled={loading} style={{ width: "100%", padding: 14, background: "linear-gradient(135deg,#6c63ff,#9b59b6)", color: "#fff", border: "none", borderRadius: 12, fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 6px 20px rgba(108,99,255,0.3)", opacity: loading ? 0.7 : 1, transition: "all 0.2s" }}>
              {loading ? <><Spinner /><span>Calculating...</span></> : <><span>🏦</span><span>Calculate EMI</span></>}
            </button>
          </Card>

          <Card delay={0.2}>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🏛️ Bank Reference Rates <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(108,99,255,0.12)", color: "#6c63ff" }}>2024–25</span></div>
            {banks.map((b) => (
              <div key={b.name} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: 13 }}>
                <span style={{ color: "#6b7280" }}>{b.name}</span><span style={{ fontWeight: 500 }}>{b.rate}</span>
              </div>
            ))}
            <p style={{ fontSize: 11, color: "#6b7280", marginTop: 12 }}>* Rates are indicative. Actual rates depend on credit score, property type, and bank policy.</p>
          </Card>
        </div>

        <div>
          {!result ? (
            <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", textAlign: "center", color: "#6b7280" }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🏦</div>
              <p style={{ fontSize: 14 }}>Enter loan details and click<br /><strong>Calculate EMI</strong></p>
            </Card>
          ) : (
            <>
              <Card delay={0.1} style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 20 }}>📊 EMI Summary</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Monthly EMI", val: fmt(result.emi), sub: `per month for ${tenure} years`, color: "#6c63ff" },
                    { label: "Total Payment", val: fmtL(result.totalPay), sub: "Principal + Interest", color: "#00d4aa" },
                    { label: "Total Interest", val: fmtL(result.totalInt), sub: `${Math.round((result.totalInt / result.totalPay) * 100)}% of total payment`, color: "#ff9f43" },
                    { label: "Down Payment", val: fmtL(result.downAmt), sub: `${Math.round((result.downAmt / propVal) * 100)}% of property value`, color: "#f5c842" },
                  ].map((c) => (
                    <div key={c.label} style={{ background: "#1c2235", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 18px" }}>
                      <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>{c.label}</div>
                      <div style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 800, color: c.color }}>{c.val}</div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{c.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Donut */}
                {(() => {
                  const pPct = Math.round((result.P / result.totalPay) * 100);
                  const circ = 2 * Math.PI * 45;
                  const pDash = (pPct / 100) * circ;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 20, margin: "16px 0" }}>
                      <svg width={120} height={120} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
                        <circle cx={50} cy={50} r={45} fill="none" stroke="#1c2235" strokeWidth={10} />
                        <circle cx={50} cy={50} r={45} fill="none" stroke="#00d4aa" strokeWidth={10} strokeDasharray={`${pDash} ${circ}`} strokeLinecap="round" transform="rotate(-90 50 50)" />
                        <circle cx={50} cy={50} r={45} fill="none" stroke="#ff9f43" strokeWidth={10} strokeDasharray={`${circ - pDash} ${circ}`} strokeDashoffset={-pDash} strokeLinecap="round" transform="rotate(-90 50 50)" />
                        <text x={50} y={46} textAnchor="middle" fill="#e8eaf0" fontFamily="Syne,sans-serif" fontSize={10} fontWeight={700}>{pPct}%</text>
                        <text x={50} y={58} textAnchor="middle" fill="#6b7280" fontSize={7}>Principal</text>
                      </svg>
                      <div style={{ flex: 1 }}>
                        {[{ color: "#00d4aa", label: "Principal", val: fmtL(result.P) }, { color: "#ff9f43", label: "Interest", val: fmtL(result.totalInt) }, { color: "#1c2235", label: "Total", val: fmtL(result.totalPay), border: "1px solid rgba(255,255,255,0.07)" }].map((l) => (
                          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 13 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: l.color, border: l.border, flexShrink: 0 }} />
                            <span>{l.label}</span>
                            <span style={{ marginLeft: "auto", fontFamily: "Syne,sans-serif", fontWeight: 700, color: l.color }}>{l.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </Card>

              <Card delay={0.2} style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 16 }}>💼 Affordability Check</div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
                    <span style={{ color: "#6b7280" }}>EMI / Income Ratio</span>
                    <span style={{ fontWeight: 600 }}>{result.emiToIncome.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 5, background: "#1c2235", overflow: "hidden", marginBottom: 6 }}>
                    <div style={{ height: "100%", width: `${Math.min(result.emiToIncome, 100)}%`, borderRadius: 5, background: affordClass === "safe" ? "linear-gradient(90deg,#4ade80,#00d4aa)" : affordClass === "warn" ? "linear-gradient(90deg,#f5c842,#ff9f43)" : "linear-gradient(90deg,#ff9f43,#ff6b6b)", transition: "width 1s ease" }} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: `${affordColors[affordClass]}1a`, color: affordColors[affordClass] }}>{affordLabel}</span>
                  </div>
                </div>
                {[
                  { key: "Monthly EMI", val: fmt(result.emi) },
                  { key: "Monthly Income", val: fmt(income) },
                  { key: "EMI / Income", val: `${result.emiToIncome.toFixed(1)}%` },
                  { key: "Recommended Max EMI", val: <span style={{ color: "#00d4aa" }}>{fmt(income * 0.30)}</span> },
                  { key: "Max Loan Eligible", val: <span style={{ color: "#00d4aa" }}>{fmtL((income * 0.30) * (1 - 1 / Math.pow(1 + result.r, result.n)) / result.r)}</span> },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.07)" : "none", fontSize: 13 }}>
                    <span style={{ color: "#6b7280" }}>{row.key}</span><span style={{ fontWeight: 500 }}>{row.val}</span>
                  </div>
                ))}
              </Card>

              <Card delay={0.25} style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 8 }}>📈 Yearly Payment Split</div>
                <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 11 }}>
                  {[{ color: "rgba(0,212,170,0.6)", label: "Principal" }, { color: "rgba(255,159,67,0.6)", label: "Interest" }].map((l) => (
                    <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: "inline-block" }} />{l.label}
                    </span>
                  ))}
                </div>
                {(() => {
                  const maxYr = Math.max(...result.yearlyData.map((y) => y.principal + y.interest));
                  return (
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80 }}>
                      {result.yearlyData.map((y) => {
                        const pH = Math.round((y.principal / maxYr) * 68);
                        const iH = Math.round((y.interest / maxYr) * 68);
                        return (
                          <div key={y.yr} title={`Yr ${y.yr}: P=${fmt(y.principal)}, I=${fmt(y.interest)}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 1, borderRadius: "4px 4px 0 0", overflow: "hidden", height: pH + iH }}>
                              <div style={{ background: "rgba(255,159,67,0.6)", height: iH }} />
                              <div style={{ background: "rgba(0,212,170,0.6)", height: pH }} />
                            </div>
                            <div style={{ fontSize: 9, color: "#6b7280" }}>{y.yr}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </Card>

              <Card delay={0.3}>
                <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
                  📋 Amortization Schedule <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(108,99,255,0.12)", color: "#6c63ff" }}>{result.n} months</span>
                </div>
                <div style={{ maxHeight: 320, overflowY: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>{["Period", "EMI", "Principal", "Interest", "Balance"].map((h) => (
                        <th key={h} style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.4px", padding: "10px 14px", textAlign: h === "Period" ? "left" : "right", background: "#1c2235", position: "sticky", top: 0, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const rows = [];
                        let bal = result.P;
                        for (let mo = 1; mo <= result.n; mo++) {
                          const iP = bal * result.r, pP = result.emi - iP;
                          bal -= pP;
                          if (mo <= 24 || mo > result.n - 12) {
                            rows.push({ mo, emi: result.emi, principal: pP, interest: iP, balance: Math.max(0, bal) });
                          }
                          if (mo === 24 && result.n > 36) rows.push(null);
                        }
                        return rows.map((m, idx) => m === null ? (
                          <tr key="ellipsis"><td colSpan={5} style={{ textAlign: "center", color: "#6b7280", padding: 8, fontSize: 11 }}>· · · middle months · · ·</td></tr>
                        ) : (
                          <tr key={m.mo} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                            <td style={{ padding: "9px 14px", fontSize: 12, color: "#6b7280" }}>Month {m.mo}</td>
                            <td style={{ padding: "9px 14px", fontSize: 12, textAlign: "right" }}>{fmt(m.emi)}</td>
                            <td style={{ padding: "9px 14px", fontSize: 12, textAlign: "right", color: "#00d4aa", fontWeight: 500 }}>{fmt(m.principal)}</td>
                            <td style={{ padding: "9px 14px", fontSize: 12, textAlign: "right", color: "#ff9f43" }}>{fmt(m.interest)}</td>
                            <td style={{ padding: "9px 14px", fontSize: 12, textAlign: "right" }}>{fmt(m.balance)}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");

  useEffect(() => {
    const s = getSession();
    if (s) setUser(s);
    else setUser(null);
  }, []);

  const handleLogin = (u) => { setUser(u); setPage("dashboard"); Analytics.init("login"); };
  const handleLogout = () => { clearSession(); setUser(null); };
  const handleNav = (p) => { setPage(p); Analytics.init(p); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',sans-serif; background:#0b0f19; color:#e8eaf0; min-height:100vh; }
        @keyframes fadeDown { from{opacity:0;transform:translateY(-16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes meshMove { from{transform:scale(1)} to{transform:scale(1.03) rotate(0.5deg)} }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:18px; height:18px; background:#6c63ff; border-radius:50%; cursor:pointer; border:2px solid #0b0f19; box-shadow:0 0 8px rgba(108,99,255,0.5); }
        input[type=range]::-moz-range-thumb { width:18px; height:18px; background:#6c63ff; border-radius:50%; cursor:pointer; border:2px solid #0b0f19; }
        select option { background:#1c2235; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:#1c2235; border-radius:3px; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.07); border-radius:3px; }
      `}</style>

      {/* BG */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 50% at 5% 15%, rgba(108,99,255,0.13) 0%, transparent 55%), radial-gradient(ellipse 40% 35% at 95% 85%, rgba(0,212,170,0.08) 0%, transparent 55%)", animation: "meshMove 18s ease-in-out infinite alternate" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", backgroundImage: "radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {!user ? (
          <LoginPage onLogin={handleLogin} />
        ) : (
          <>
            <Nav active={page} onNavigate={handleNav} user={user} onLogout={handleLogout} />
            {page === "dashboard" && <DashboardPage user={user} onNavigate={handleNav} />}
            {page === "estimator" && <EstimatorPage />}
            {page === "compare" && <ComparePage />}
            {page === "emi" && <EmiPage />}
          </>
        )}
      </div>
    </>
  );
}
