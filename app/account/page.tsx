"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { identifyAnalyticsUser, trackEvent } from "../../lib/analytics";
import { authenticatedHandoffHref, validatedGuestScreenState, encodePendingScreenRecord, decodePendingScreenRecord, PENDING_SCREEN_STORAGE_KEY } from "../../lib/growth-handoff";
import ParseBrand from "../../components/ParseBrand";

const T = { bg: "#F4F5F7", surface: "#FFFFFF", border: "#E6E8EC", ink: "#15171C", inkSoft: "#565C67", accent: "#2C36A8", accentInk: "#232A85", loss: "#C33328" };
const DISP = "var(--font-display), 'Instrument Sans', system-ui, sans-serif";
function pendingScreenState(): string | null {
  const fromUrl = validatedGuestScreenState(new URLSearchParams(window.location.search).get("state"));
  if (fromUrl) {
    const record = encodePendingScreenRecord(fromUrl);
    try { if (record) window.localStorage.setItem(PENDING_SCREEN_STORAGE_KEY, record); } catch {}
    return fromUrl;
  }

  try {
    const stored = decodePendingScreenRecord(window.localStorage.getItem(PENDING_SCREEN_STORAGE_KEY));
    if (stored) return stored;
    window.localStorage.removeItem(PENDING_SCREEN_STORAGE_KEY);
  } catch {}
  return null;
}

function authenticatedDestination(): string {
  return authenticatedHandoffHref(pendingScreenState());
}

export default function Account() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasPendingScreen, setHasPendingScreen] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signin") setMode("signin");
    setHasPendingScreen(Boolean(pendingScreenState()));
    supabase.auth.getSession().then(({ data }) => { if (data.session) { identifyAnalyticsUser(data.session.user.id); router.replace(authenticatedDestination()); } });
  }, [router]);

  const submit = async () => {
    setError(""); setNote("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError("Enter a valid email address.");
    if (pw.length < 6) return setError("Use at least 6 characters for your password.");
    setBusy(true);
    trackEvent(mode === "signup" ? "signup_started" : "signin_started");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password: pw });
        if (error) throw error;
        trackEvent("signup_submitted", { email_confirmation_required: !data.session, has_screen_handoff: hasPendingScreen });
        if (data.session) {
          identifyAnalyticsUser(data.session.user.id);
          trackEvent("signup_completed", { email_confirmation_required: false, has_screen_handoff: hasPendingScreen });
          router.replace(authenticatedDestination());
        } else setNote(hasPendingScreen
          ? "Check your email to confirm your account, then sign in here on this device to return to your screen."
          : "Account created. Check your email to confirm it, then sign in.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        identifyAnalyticsUser(data.user.id);
        trackEvent("signin_completed");
        router.replace(authenticatedDestination());
      }
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
      trackEvent(mode === "signup" ? "signup_error" : "signin_error");
    }
    finally { setBusy(false); }
  };

  return <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: "var(--font-body), 'Inter', system-ui, sans-serif", display: "grid", placeItems: "center", padding: 24 }}>
    <style>{`.a-field{width:100%;box-sizing:border-box;padding:11px 13px;border:1px solid ${T.border};border-radius:10px;background:#fff;font:15px Inter,system-ui,sans-serif;color:${T.ink}}.a-field:focus{outline:none;border-color:${T.accent};box-shadow:0 0 0 3px #ECEEFA}.a-btn{width:100%;height:44px;border:0;border-radius:10px;background:${T.accent};color:#fff;font:550 14.5px Inter,system-ui,sans-serif;cursor:pointer}.a-btn:hover{background:${T.accentInk}}`}</style>
    <main style={{ width: "100%", maxWidth: 390 }}>
      <ParseBrand />
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, marginTop: 22 }}>
        <h1 style={{ fontFamily: DISP, fontSize: 26, letterSpacing: "-0.02em", margin: "0 0 6px", fontWeight: 600 }}>{mode === "signup" ? (hasPendingScreen ? "Keep your screen" : "Save your screens") : "Welcome back"}</h1>
        <p style={{ color: T.inkSoft, fontSize: 14.5, lineHeight: 1.5, margin: "0 0 22px" }}>{mode === "signup" ? (hasPendingScreen ? "Create a free account to return to your current screen, then save it to use again." : "Create an account when you want to save and revisit your work.") : (hasPendingScreen ? "Sign in to return to your current screen and save it." : "Sign in to reach your saved screens.")}</p>
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
