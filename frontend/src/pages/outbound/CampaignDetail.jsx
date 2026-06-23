import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Play,
  Loader2,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getOutboundCampaignApi,
  getOutboundCampaignStatsApi,
  getOutboundContactsApi,
  addOutboundContactApi,
  deleteOutboundContactApi,
  importOutboundContactsApi,
  startOutboundCampaignApi,
} from "../../api/api";
import { C, StatusBadge, Btn, spinStyle } from "./outboundStyles";

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const fetchLock = useRef(false);
  const [campaign, setCampaign] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone_number: "",
    email: "",
    company: "",
  });

  const fetchAll = useCallback(async (silent = false) => {
    if (fetchLock.current) return;
    fetchLock.current = true;
    if (!silent) setRefreshing(true);
    try {
      const [c, ct, st] = await Promise.all([
        getOutboundCampaignApi(id),
        getOutboundContactsApi(id),
        getOutboundCampaignStatsApi(id),
      ]);
      setCampaign(c);
      setContacts(ct);
      setStats(st);
    } catch {
      if (!silent) toast.error("Failed to load campaign");
    } finally {
      fetchLock.current = false;
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll(false);
  }, [fetchAll]);

  useEffect(() => {
    if (showAdd || savingContact || starting) return undefined;
    const interval = setInterval(() => fetchAll(true), 20000);
    return () => clearInterval(interval);
  }, [fetchAll, showAdd, savingContact, starting]);

  const addContact = async (e) => {
    e.preventDefault();
    if (savingContact) return;
    if (!form.phone_number.trim()) {
      toast.error("Phone number is required");
      return;
    }
    setSavingContact(true);
    try {
      await addOutboundContactApi(id, form);
      toast.success("Contact added");
      setShowAdd(false);
      setForm({ name: "", phone_number: "", email: "", company: "" });
      await fetchAll(true);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to add contact");
    } finally {
      setSavingContact(false);
    }
  };

  const removeContact = async (contactId) => {
    if (deletingId) return;
    if (!window.confirm("Delete contact?")) return;
    setDeletingId(contactId);
    try {
      await deleteOutboundContactApi(contactId);
      toast.success("Contact deleted");
      await fetchAll(true);
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || importing) return;
    setImporting(true);
    try {
      const result = await importOutboundContactsApi(id, file);
      toast.success(`Imported ${result.imported} contacts`);
      await fetchAll(true);
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  const startCampaign = async () => {
    if (starting || campaign?.status === "completed") return;
    setStarting(true);
    try {
      const result = await startOutboundCampaignApi(id);
      toast.success(`Started calling ${result.queued_contacts} contacts`);
      await fetchAll(true);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to start campaign");
    } finally {
      setStarting(false);
    }
  };

  if (initialLoading) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <Loader2 size={28} style={spinStyle} />
      </div>
    );
  }

  if (!campaign) {
    return <div style={{ padding: 40 }}>Campaign not found</div>;
  }

  return (
    <div style={{ background: C.pageBg, minHeight: "100vh", padding: "24px 28px" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Btn variant="ghost" onClick={() => navigate("/dashboard/calling/outbound/campaigns")}>
          <ArrowLeft size={18} />
        </Btn>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: C.text }}>
            {campaign.name}
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: ".82rem", color: C.textMuted }}>
            {campaign.description || "No description"}
          </p>
        </div>
        <StatusBadge status={campaign.status} />
        <Btn variant="secondary" loading={refreshing} onClick={() => fetchAll(false)} style={{ padding: 8 }}>
          <RefreshCw size={14} />
        </Btn>
        <Btn
          variant="success"
          loading={starting}
          disabled={campaign.status === "completed"}
          onClick={startCampaign}
        >
          <Play size={14} />
          {starting ? "Starting…" : "Start Calling"}
        </Btn>
      </div>

      {stats && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "Total", value: stats.total },
            { label: "Pending", value: stats.pending },
            { label: "Completed", value: stats.completed },
            { label: "Failed", value: stats.failed },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "12px 18px",
                minWidth: 100,
              }}
            >
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: C.text }}>{s.value}</div>
              <div style={{ fontSize: ".72rem", color: C.textMuted, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Btn variant="primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} />
          Add Contact
        </Btn>
        <Btn variant="secondary" loading={importing} onClick={() => fileRef.current?.click()}>
          <Upload size={14} />
          {importing ? "Importing…" : "CSV / JSON Upload"}
        </Btn>
        <input ref={fileRef} type="file" accept=".csv,.json" hidden onChange={handleFile} />
      </div>

      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".82rem" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: "#FAFBFD" }}>
              {["Name", "Phone", "Email", "Company", "Status", "Actions"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    fontWeight: 700,
                    color: C.textMuted,
                    fontSize: ".72rem",
                    textTransform: "uppercase",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: "center", color: C.textMuted }}>
                  No contacts yet
                </td>
              </tr>
            ) : (
              contacts.map((ct) => (
                <tr key={ct.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{ct.name || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>{ct.phone_number}</td>
                  <td style={{ padding: "12px 16px", color: C.textMuted }}>{ct.email || "—"}</td>
                  <td style={{ padding: "12px 16px", color: C.textMuted }}>{ct.company || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <StatusBadge status={ct.status} />
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <Btn
                      variant="danger"
                      loading={deletingId === ct.id}
                      disabled={!!deletingId}
                      onClick={() => removeContact(ct.id)}
                    >
                      <Trash2 size={14} />
                    </Btn>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,15,26,.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowAdd(false);
          }}
        >
          <div
            style={{ background: C.card, borderRadius: 14, padding: 24, width: 400, maxWidth: "90vw" }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px", fontWeight: 800 }}>Add Contact</h3>
            <form onSubmit={addContact}>
              {["name", "phone_number", "email", "company"].map((field) => (
                <input
                  key={field}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  placeholder={field.replace("_", " ")}
                  disabled={savingContact}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    marginBottom: 10,
                    boxSizing: "border-box",
                  }}
                />
              ))}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn
                  variant="secondary"
                  disabled={savingContact}
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </Btn>
                <Btn type="submit" variant="primary" loading={savingContact}>
                  {savingContact ? "Adding…" : "Add"}
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
