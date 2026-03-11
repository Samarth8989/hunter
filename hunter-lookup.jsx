import { useState, useRef } from "react";

const HUNTER_BASE = "https://api.hunter.io/v2";

const DECISION_TITLES = [
  "ceo", "cto", "cfo", "coo", "cmo", "cpo", "cio", "cro",
  "founder", "co-founder", "cofounder",
  "president", "vice president", "vp",
  "director", "head", "chief", "partner",
  "managing", "general manager", "owner",
  "svp", "evp", "avp",
];

function isDecisionMaker(person) {
  // Hunter provides seniority: "junior", "senior", "executive"
  if (person.seniority === "executive" || person.seniority === "senior") return true;
  // Fallback to title keyword matching
  if (!person.position) return false;
  const lower = person.position.toLowerCase();
  return DECISION_TITLES.some((t) => lower.includes(t));
}

function seniorityLabel(person) {
  if (person.seniority === "executive") return "Executive";
  if (person.seniority === "senior") return "Senior";
  if (person.position) {
    const lower = person.position.toLowerCase();
    if (["ceo","cto","cfo","coo","cmo","founder","co-founder","president","owner"].some(t => lower.includes(t)))
      return "C-Suite / Founder";
    if (["vp","vice president","svp","evp","avp"].some(t => lower.includes(t)))
      return "VP-Level";
    if (["director","head"].some(t => lower.includes(t)))
      return "Director-Level";
  }
  return "Senior";
}

function confidenceBadge(confidence) {
  if (!confidence) return null;
  const c = Number(confidence);
  const color =
    c >= 80
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : c >= 50
      ? "bg-amber-100 text-amber-800 border-amber-300"
      : "bg-red-100 text-red-800 border-red-300";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      {c}%
    </span>
  );
}

function SourceBadge({ type }) {
  const map = {
    personal: "bg-blue-50 text-blue-700",
    generic: "bg-gray-100 text-gray-600",
    unknown: "bg-gray-50 text-gray-500",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${map[type] || map.unknown}`}>
      {type || "unknown"}
    </span>
  );
}

function DeptBadge({ dept }) {
  if (!dept) return null;
  const colors = {
    executive: "bg-violet-100 text-violet-800",
    marketing: "bg-pink-100 text-pink-800",
    sales: "bg-orange-100 text-orange-800",
    engineering: "bg-cyan-100 text-cyan-800",
    finance: "bg-green-100 text-green-800",
    hr: "bg-yellow-100 text-yellow-800",
    support: "bg-teal-100 text-teal-800",
    it: "bg-indigo-100 text-indigo-800",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${colors[dept.toLowerCase()] || "bg-gray-100 text-gray-700"}`}>
      {dept}
    </span>
  );
}

// ✏️ Paste your Hunter.io API key here
const HUNTER_API_KEY = "YOUR_API_KEY_HERE";

export default function HunterLookup() {
  const apiKey = HUNTER_API_KEY;
  const [tab, setTab] = useState("finder"); // finder | domain
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [domain, setDomain] = useState("");
  const [seniorityFilter, setSeniorityFilter] = useState(""); // "", "executive", "senior"
  const [deptFilter, setDeptFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [finderResult, setFinderResult] = useState(null);
  const [domainResult, setDomainResult] = useState(null);
  const [filterDM, setFilterDM] = useState(false);
  const [accountInfo, setAccountInfo] = useState(null);
  const abortRef = useRef(null);

  async function fetchAccount() {
    try {
      const res = await fetch(`${HUNTER_BASE}/account?api_key=${apiKey}`);
      const json = await res.json();
      if (json.data) setAccountInfo(json.data);
    } catch {}
  }

  async function handleEmailFind(e) {
    e.preventDefault();
    if (!apiKey || !domain || (!firstName && !lastName)) {
      setError("API key, domain, and at least one name field required.");
      return;
    }
    setLoading(true);
    setError("");
    setFinderResult(null);
    try {
      const params = new URLSearchParams({ domain, api_key: apiKey });
      if (firstName) params.set("first_name", firstName);
      if (lastName) params.set("last_name", lastName);
      const res = await fetch(`${HUNTER_BASE}/email-finder?${params}`);
      const json = await res.json();
      if (json.errors) {
        setError(json.errors.map((e) => e.details).join(", "));
      } else {
        setFinderResult(json.data);
        fetchAccount();
      }
    } catch (err) {
      setError("Network error. Check your API key and try again.");
    }
    setLoading(false);
  }

  async function handleDomainSearch(e) {
    e.preventDefault();
    if (!apiKey || !domain) {
      setError("API key and domain required.");
      return;
    }
    setLoading(true);
    setError("");
    setDomainResult(null);
    try {
      const params = new URLSearchParams({ domain, api_key: apiKey, limit: "100" });
      if (seniorityFilter) params.set("seniority", seniorityFilter);
      if (deptFilter) params.set("department", deptFilter);
      const res = await fetch(`${HUNTER_BASE}/domain-search?${params}`);
      const json = await res.json();
      if (json.errors) {
        setError(json.errors.map((e) => e.details).join(", "));
      } else {
        setDomainResult(json.data);
        fetchAccount();
      }
    } catch (err) {
      setError("Network error. Check your API key and try again.");
    }
    setLoading(false);
  }

  const displayEmails = domainResult?.emails
    ? filterDM
      ? domainResult.emails.filter((e) => isDecisionMaker(e))
      : domainResult.emails
    : [];

  const dmCount = domainResult?.emails
    ? domainResult.emails.filter((e) => isDecisionMaker(e)).length
    : 0;

  return (
    <div
      style={{
        fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        minHeight: "100vh",
        color: "#e2e8f0",
      }}
    >
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "20px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #f97316, #fb923c)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 700, color: "#fff",
            }}>H</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px" }}>Hunter Lookup</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>API-powered email finder</div>
            </div>
          </div>
          {accountInfo && (
            <div style={{
              fontSize: 12, color: "#94a3b8",
              background: "rgba(255,255,255,0.04)", padding: "6px 14px",
              borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)"
            }}>
              Requests used: <span style={{ color: "#f97316", fontWeight: 600 }}>
                {accountInfo.requests?.searches?.used ?? "—"}
              </span> / {accountInfo.requests?.searches?.available ?? "—"}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px" }}>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 4 }}>
          {[
            { id: "finder", label: "Email Finder", desc: "Find specific person's email" },
            { id: "domain", label: "Domain Search", desc: "All emails + decision makers" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(""); }}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 10, border: "none",
                cursor: "pointer", transition: "all 0.2s",
                background: tab === t.id ? "rgba(249,115,22,0.15)" : "transparent",
                border: tab === t.id ? "1px solid rgba(249,115,22,0.3)" : "1px solid transparent",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: tab === t.id ? "#fb923c" : "#94a3b8" }}>{t.label}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14, padding: "22px 20px", marginBottom: 20,
        }}>
          <form onSubmit={tab === "finder" ? handleEmailFind : handleDomainSearch}>
            <div style={{ display: "grid", gridTemplateColumns: tab === "finder" ? "1fr 1fr 1fr" : "1fr", gap: 14 }}>
              {tab === "finder" && (
                <>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 6 }}>First Name</label>
                    <input
                      value={firstName} onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Sundar"
                      style={{
                        width: "100%", padding: "10px 14px",
                        background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 6 }}>Last Name</label>
                    <input
                      value={lastName} onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Pichai"
                      style={{
                        width: "100%", padding: "10px 14px",
                        background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </>
              )}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 6 }}>Domain</label>
                <input
                  value={domain} onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. google.com"
                  style={{
                    width: "100%", padding: "10px 14px",
                    background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            {tab === "domain" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 6 }}>Seniority (API filter)</label>
                  <select
                    value={seniorityFilter}
                    onChange={(e) => setSeniorityFilter(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 14px",
                      background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none",
                      boxSizing: "border-box", appearance: "auto",
                    }}
                  >
                    <option value="" style={{ background: "#1e293b" }}>All levels</option>
                    <option value="executive" style={{ background: "#1e293b" }}>Executive (C-suite, VP)</option>
                    <option value="senior" style={{ background: "#1e293b" }}>Senior (Directors, Heads)</option>
                    <option value="junior" style={{ background: "#1e293b" }}>Junior</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 6 }}>Department (API filter)</label>
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 14px",
                      background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none",
                      boxSizing: "border-box", appearance: "auto",
                    }}
                  >
                    <option value="" style={{ background: "#1e293b" }}>All departments</option>
                    <option value="executive" style={{ background: "#1e293b" }}>Executive</option>
                    <option value="sales" style={{ background: "#1e293b" }}>Sales</option>
                    <option value="marketing" style={{ background: "#1e293b" }}>Marketing</option>
                    <option value="engineering" style={{ background: "#1e293b" }}>Engineering</option>
                    <option value="finance" style={{ background: "#1e293b" }}>Finance</option>
                    <option value="hr" style={{ background: "#1e293b" }}>HR</option>
                    <option value="it" style={{ background: "#1e293b" }}>IT</option>
                    <option value="support" style={{ background: "#1e293b" }}>Support</option>
                    <option value="communication" style={{ background: "#1e293b" }}>Communication</option>
                    <option value="legal" style={{ background: "#1e293b" }}>Legal</option>
                    <option value="management" style={{ background: "#1e293b" }}>Management</option>
                  </select>
                </div>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 18, width: "100%", padding: "12px",
                background: loading ? "rgba(249,115,22,0.3)" : "linear-gradient(135deg, #f97316, #ea580c)",
                color: "#fff", fontWeight: 600, fontSize: 14, border: "none",
                borderRadius: 10, cursor: loading ? "wait" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {loading ? "Searching..." : tab === "finder" ? "Find Email" : "Search Domain"}
            </button>
          </form>
        </div>

        {error && (
          <div style={{
            padding: "12px 16px", borderRadius: 10, marginBottom: 20,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5", fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Email Finder Result */}
        {tab === "finder" && finderResult && (
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14, padding: "22px 20px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Result
            </div>
            {finderResult.email ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{
                  padding: "16px 18px", borderRadius: 12,
                  background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 16, fontWeight: 600, color: "#fb923c",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {finderResult.email}
                    </span>
                    {confidenceBadge(finderResult.score)}
                    <button
                      onClick={() => navigator.clipboard.writeText(finderResult.email)}
                      style={{
                        marginLeft: "auto", padding: "4px 12px", fontSize: 12,
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6, color: "#94a3b8", cursor: "pointer",
                      }}
                    >Copy</button>
                  </div>
                  {(finderResult.first_name || finderResult.last_name) && (
                    <div style={{ marginTop: 8, fontSize: 13, color: "#94a3b8" }}>
                      {finderResult.first_name} {finderResult.last_name}
                      {finderResult.position && <span> · {finderResult.position}</span>}
                    </div>
                  )}
                  {finderResult.linkedin_url && (
                    <a href={finderResult.linkedin_url} target="_blank" rel="noreferrer"
                      style={{ fontSize: 12, color: "#60a5fa", marginTop: 6, display: "inline-block" }}>
                      LinkedIn Profile →
                    </a>
                  )}
                </div>
                {finderResult.sources && finderResult.sources.length > 0 && (
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Found in {finderResult.sources.length} source{finderResult.sources.length > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: "#94a3b8", fontSize: 14 }}>No email found for this person at this domain.</div>
            )}
          </div>
        )}

        {/* Domain Search Results */}
        {tab === "domain" && domainResult && (
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14, padding: "22px 20px",
          }}>
            {/* Stats Bar */}
            <div style={{
              display: "flex", gap: 16, marginBottom: 18, flexWrap: "wrap", alignItems: "center",
            }}>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>
                <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 20 }}>{domainResult.emails?.length || 0}</span> emails found
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>
                <span style={{ fontWeight: 700, color: "#fb923c", fontSize: 20 }}>{dmCount}</span> decision makers
              </div>
              {domainResult.organization && (
                <div style={{ fontSize: 13, color: "#64748b", marginLeft: "auto" }}>
                  {domainResult.organization}
                </div>
              )}
            </div>

            {/* Filter Toggle */}
            {dmCount > 0 && (
              <button
                onClick={() => setFilterDM(!filterDM)}
                style={{
                  padding: "8px 16px", fontSize: 13, fontWeight: 600,
                  borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 16,
                  background: filterDM ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.06)",
                  color: filterDM ? "#fb923c" : "#94a3b8",
                  border: filterDM ? "1px solid rgba(249,115,22,0.3)" : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {filterDM ? "★ Showing Decision Makers Only" : "☆ Show Decision Makers Only"}
              </button>
            )}

            {/* Email List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {displayEmails.map((item, i) => {
                const dm = isDecisionMaker(item);
                const sLevel = dm ? seniorityLabel(item) : null;
                return (
                  <div
                    key={i}
                    style={{
                      padding: "14px 16px", borderRadius: 10,
                      background: dm ? "rgba(249,115,22,0.05)" : "rgba(0,0,0,0.2)",
                      border: dm ? "1px solid rgba(249,115,22,0.15)" : "1px solid rgba(255,255,255,0.04)",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {dm && <span style={{ fontSize: 14 }}>★</span>}
                      <span style={{
                        fontWeight: 600, fontSize: 14,
                        color: dm ? "#fb923c" : "#e2e8f0",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {item.value}
                      </span>
                      {confidenceBadge(item.confidence)}
                      <SourceBadge type={item.type} />
                      {item.department && <DeptBadge dept={item.department} />}
                      {dm && sLevel && (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 8px",
                          borderRadius: 4,
                          background: sLevel === "C-Suite / Founder" ? "rgba(168,85,247,0.15)" :
                                     sLevel === "VP-Level" ? "rgba(59,130,246,0.15)" :
                                     sLevel === "Director-Level" ? "rgba(20,184,166,0.15)" :
                                     "rgba(249,115,22,0.15)",
                          color: sLevel === "C-Suite / Founder" ? "#c084fc" :
                                 sLevel === "VP-Level" ? "#93c5fd" :
                                 sLevel === "Director-Level" ? "#5eead4" :
                                 "#fb923c",
                          border: `1px solid ${sLevel === "C-Suite / Founder" ? "rgba(168,85,247,0.3)" :
                                  sLevel === "VP-Level" ? "rgba(59,130,246,0.3)" :
                                  sLevel === "Director-Level" ? "rgba(20,184,166,0.3)" :
                                  "rgba(249,115,22,0.3)"}`,
                        }}>
                          {sLevel}
                        </span>
                      )}
                      {item.seniority && (
                        <span style={{ fontSize: 10, color: "#64748b", fontStyle: "italic" }}>
                          seniority: {item.seniority}
                        </span>
                      )}
                      <button
                        onClick={() => navigator.clipboard.writeText(item.value)}
                        style={{
                          marginLeft: "auto", padding: "3px 10px", fontSize: 11,
                          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 5, color: "#94a3b8", cursor: "pointer",
                        }}
                      >Copy</button>
                    </div>
                    <div style={{ marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                      {(item.first_name || item.last_name) && (
                        <span style={{ fontSize: 13, color: "#94a3b8" }}>
                          {item.first_name} {item.last_name}
                        </span>
                      )}
                      {item.position && (
                        <span style={{ fontSize: 12, color: "#64748b" }}>{item.position}</span>
                      )}
                      {item.linkedin && (
                        <a href={item.linkedin} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, color: "#60a5fa" }}>LinkedIn →</a>
                      )}
                      {item.twitter && (
                        <a href={`https://twitter.com/${item.twitter}`} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, color: "#60a5fa" }}>Twitter →</a>
                      )}
                      {item.phone_number && (
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>📞 {item.phone_number}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {displayEmails.length === 0 && (
                <div style={{ color: "#64748b", fontSize: 14, padding: 16, textAlign: "center" }}>
                  {filterDM ? "No decision makers found. Try showing all results." : "No emails found for this domain."}
                </div>
              )}
            </div>

            {/* Copy All */}
            {displayEmails.length > 0 && (
              <button
                onClick={() => {
                  const all = displayEmails.map((e) => {
                    const name = [e.first_name, e.last_name].filter(Boolean).join(" ");
                    return `${e.value}${name ? ` (${name})` : ""}${e.position ? ` - ${e.position}` : ""}`;
                  }).join("\n");
                  navigator.clipboard.writeText(all);
                }}
                style={{
                  marginTop: 16, padding: "10px 20px", fontSize: 13, fontWeight: 600,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, color: "#e2e8f0", cursor: "pointer",
                  width: "100%",
                }}
              >
                Copy All ({displayEmails.length} emails)
              </button>
            )}
          </div>
        )}

        {/* How it works */}
        {!finderResult && !domainResult && (
          <div style={{
            marginTop: 12, padding: "24px",
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 14, color: "#64748b", fontSize: 13, lineHeight: 1.7,
          }}>
            <div style={{ fontWeight: 600, color: "#94a3b8", marginBottom: 10, fontSize: 14 }}>How this works</div>
            <div style={{ marginBottom: 6 }}>
              <strong style={{ color: "#94a3b8" }}>Email Finder</strong> — Enter a person's name + company domain → get their verified email. Uses 1 request per lookup.
            </div>
            <div style={{ marginBottom: 6 }}>
              <strong style={{ color: "#94a3b8" }}>Domain Search</strong> — Enter a domain → get all discoverable emails + positions. Filter to decision makers instantly. Uses 1 request per search (returns up to 100 emails).
            </div>
            <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(249,115,22,0.06)", borderRadius: 8, border: "1px solid rgba(249,115,22,0.1)", color: "#fb923c" }}>
              💡 API key is set in the code. Free tier: 25 searches/month. Starter ($34/mo): 500.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
