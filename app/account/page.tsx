"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const T = { bg: "#F4F5F7", surface: "#FFFFFF", border: "#E6E8EC", ink: "#15171C", inkSoft: "#565C67", accent: "#2C36A8", accentInk: "#232A85", loss: "#C33328" };
const DISP = "'Space Grotesk', system-ui, sans-serif";

function Logo() {
  return <div style={{ width: 28, height: 28, borderRadius: 7, background: T.accent, position: "relative", flexShrink: 0 }}><div style={{ position: "absolute", left: 6.5, bottom: 6.5, width: 3, height: 8, background: "#fff", borderRadius: 1 }} /><div style={{ position: "absolute", left: 12, bottom: 6.5, width: 3, height: 13, background: "#fff", borderRadius: 1 }} /><div style={{ position: "absolute", left: 17.5, bottom: 6.5, width: 3, height: 5, background: "rgba(255,255,255,.6)", borderRadius: 1 }} /></div>;
}

export default function Account() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signin") setMode("signin");
    supabase.auth.getSession().then(({ data }) => { if (data.session) router.replace("/app"); });
  }, [router]);

  const submit = async () => {
    setError(""); setNote("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError("Enter a valid email address.");
    if (pw.length < 6) return setError("Use at least 6 characters for your password.");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password: pw });
        if (error) throw error;
        if (data.session) router.replace("/app");
        else setNote("Account created. Check your email to confirm it, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        router.replace("/app");
      }
    } catch (e: any) { setError(e?.message || "Something went wrong."); }
    finally { setBusy(false); }
  };

  return <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: "'Inter', system-ui, sans-serif", display: "grid", placeItems: "center", padding: 24 }}>
    <style>{`.a-field{width:100%;box-sizing:border-box;padding:11px 13px;border:1px solid ${T.border};border-radius:10px;background:#fff;font:15px Inter,system-ui,sans-serif;color:${T.ink}}.a-field:focus{outline:none;border-color:${T.accent};box-shadow:0 0 0 3px #ECEEFA}.a-btn{width:100%;height:44px;border:0;border-radius:10px;background:${T.accent};color:#fff;font:550 14.5px Inter,system-ui,sans-serif;cursor:pointer}.a-btn:hover{background:${T.accentInk}}`}</style>
    <main style={{ width: "100%", maxWidth: 390 }}>
      <a href="/" style={{ display: "inline-flex", gap: 10, alignItems: "center", color: T.ink, textDecoration: "none" }}><Logo /><span style={{ fontFamily: DISP, fontWeight: 600, fontSize: 18 }}>Parse</span></a>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, marginTop: 22 }}>
        <h1 style={{ fontFamily: DISP, fontSize: 26, letterSpacing: "-0.02em", margin: "0 0 6px", fontWeight: 600 }}>{mode === "signup" ? "Save your screens" : "Welcome back"}</h1>
        <p style={{ color: T.inkSoft, fontSize: 14.5, lineHeight: 1.5, margin: "0 0 22px" }}>{mode === "signup" ? "Create an account when you want to save and revisit your work." : "Sign in to reach your saved screens."}</p>
        <label style={{ display: "block", fontSize: 13, fontWeight: 550, color: T.inkSoft, marginBottom: 6 }}>Email</label><input className="a-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <label style={{ display: "block", fontSize: 13, fontWeight: 550, color: T.inkSoft, margin: "14px 0 6px" }}>Password</label><input className="a-field" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" onKeyDown={(e) => e.key === "Enter" && submit()} />
        {error && <div style={{ color: T.loss, fontSize: 13.5, marginTop: 12 }}>{error}</div>}{note && <div style={{ color: T.accentInk, fontSize: 13.5, marginTop: 12, lineHeight: 1.45 }}>{note}</div>}
        <button className="a-btn" onClick={submit} disabled={busy} style={{ marginTop: 20, opacity: busy ? .7 : 1 }}>{busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}</button>
        <div style={{ color: T.inkSoft, fontSize: 14, marginTop: 17 }}>{mode === "signup" ? "Already have an account? " : "New to Parse? "}<button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setNote(""); }} style={{ border: 0, background: "transparent", padding: 0, color: T.accent, font: "550 14px Inter,system-ui,sans-serif", cursor: "pointer" }}>{mode === "signup" ? "Sign in" : "Create one"}</button></div>
      </div>
      <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", fontSize: 13 }}><a href="/" style={{ color: T.inkSoft, textDecoration: "none" }}>← Back to Parse</a><a href="/methodology" style={{ color: T.inkSoft, textDecoration: "none" }}>How it works</a></div>
    </main>
  </div>;
}
