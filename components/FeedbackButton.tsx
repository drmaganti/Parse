"use client";

import React, { useState } from "react";
import { supabase } from "../lib/supabase";

const T = {
  ink: "#15171C", inkSoft: "#565C67", border: "#E6E8EC",
  accent: "#2C36A8", accentInk: "#232A85", loss: "#C33328", surfaceAlt: "#FAFBFC",
};
const DISP = "'Space Grotesk', system-ui, sans-serif";

export default function FeedbackButton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const close = () => { setOpen(false); setTimeout(() => { setDone(false); setEmail(""); setMsg(""); setErr(""); }, 200); };
  const submit = async () => {
    setErr("");
    if (!msg.trim()) return setErr("Add a message first.");
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setErr("That email doesn't look right.");
    setBusy(true);
    const { error } = await supabase.from("feedback").insert({ email: email.trim() || null, message: msg.trim() });
    setBusy(false);
    if (error) { setErr("Couldn't send — please try again."); return; }
    setDone(true);
  };

  const field: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 14.5, background: "#fff",
    border: `1px solid ${T.border}`, borderRadius: 9, color: T.ink, fontFamily: "inherit", boxSizing: "border-box" };

  return (
    <>
      <button className={className} style={style} onClick={() => setOpen(true)}>Feedback</button>
      {open && (
        <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(21,23,28,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 100 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: "#fff",
            borderRadius: 16, padding: 24, boxShadow: "0 12px 44px rgba(0,0,0,0.22)" }}>
            {done ? (
              <div>
                <div style={{ fontFamily: DISP, fontSize: 19, fontWeight: 600, marginBottom: 6 }}>Thanks — got it.</div>
                <div style={{ color: T.inkSoft, fontSize: 14, marginBottom: 20 }}>Appreciate you taking the time.</div>
                <button onClick={close} style={{ background: T.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14.5, fontWeight: 550, cursor: "pointer", fontFamily: "inherit" }}>Close</button>
              </div>
            ) : (
              <div>
                <div style={{ fontFamily: DISP, fontSize: 19, fontWeight: 600, marginBottom: 4 }}>Send feedback</div>
                <div style={{ color: T.inkSoft, fontSize: 13.5, marginBottom: 18 }}>What's working, what's missing, what's broken.</div>

                <label style={{ display: "block", fontSize: 13, fontWeight: 550, color: T.inkSoft, marginBottom: 6 }}>Email <span style={{ color: T.inkSoft, fontWeight: 400 }}>(optional, if you want a reply)</span></label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={field} />

                <label style={{ display: "block", fontSize: 13, fontWeight: 550, color: T.inkSoft, margin: "14px 0 6px" }}>Message</label>
                <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} placeholder="Tell us what you think…"
                  style={{ ...field, resize: "vertical", lineHeight: 1.45 }} />

                {err && <div style={{ color: T.loss, fontSize: 13.5, marginTop: 12 }}>{err}</div>}

                <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
                  <button onClick={close} style={{ background: "transparent", color: T.inkSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 16px", fontSize: 14, fontWeight: 550, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                  <button onClick={submit} disabled={busy} style={{ background: T.accent, color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 14, fontWeight: 550, cursor: "pointer", fontFamily: "inherit", opacity: busy ? 0.7 : 1 }}>{busy ? "Sending…" : "Send"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
