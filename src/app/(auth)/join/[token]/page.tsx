"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";

type InviteData = {
  email: string;
  role: string;
  organizationName: string;
  organizationLogoUrl: string | null;
  expiresAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  DISPATCHER: "Dispatcher",
  TECHNICIAN: "Technician",
};

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [token, setToken] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [status, setStatus] = useState<"loading" | "valid" | "error" | "accepting" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    params.then(({ token: t }) => setToken(t));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/staff/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setErrorMsg(data.error);
          setStatus("error");
        } else {
          setInvite(data.data);
          setStatus("valid");
        }
      })
      .catch(() => {
        setErrorMsg("Failed to load invitation");
        setStatus("error");
      });
  }, [token]);

  const accept = async () => {
    if (!token) return;
    setStatus("accepting");
    try {
      const res = await fetch(`/api/staff/invite/${token}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to accept invitation");
        setStatus("error");
        return;
      }
      setStatus("done");
      router.push(data.data.redirectTo);
    } catch {
      setErrorMsg("Something went wrong");
      setStatus("error");
    }
  };

  if (status === "loading" || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F4FFFE" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#0ABAB5", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#F4FFFE" }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)" }}
          >
            <span className="text-white text-lg">🐾</span>
          </div>
          <span className="font-bold text-foreground text-xl">FieldDetect</span>
        </div>

        {status === "error" && (
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-foreground mb-2">Invitation Invalid</h2>
            <p className="text-muted-foreground text-sm mb-6">{errorMsg}</p>
            <a href="/sign-in" className="text-sm font-semibold" style={{ color: "#0ABAB5" }}>
              Go to sign in →
            </a>
          </div>
        )}

        {(status === "valid" || status === "accepting" || status === "done") && invite && (
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <div className="text-center mb-6">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
                style={{ background: "rgba(10,186,181,0.12)" }}
              >
                🏢
              </div>
              <h2 className="text-xl font-bold text-foreground">You're invited!</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Join <strong>{invite.organizationName}</strong> as a{" "}
                <span className="font-semibold" style={{ color: "#0ABAB5" }}>
                  {ROLE_LABELS[invite.role] ?? invite.role}
                </span>
              </p>
            </div>

            <div className="bg-muted/40 rounded-xl p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-foreground">{invite.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium text-foreground">{ROLE_LABELS[invite.role] ?? invite.role}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Organization</span>
                <span className="font-medium text-foreground">{invite.organizationName}</span>
              </div>
            </div>

            {!user ? (
              <div className="space-y-3">
                <p className="text-sm text-center text-muted-foreground mb-4">
                  Create a free account or sign in to accept this invitation.
                </p>
                <SignUpButton
                  mode="redirect"
                  forceRedirectUrl={`/join/${token}`}
                >
                  <button
                    className="w-full h-11 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-px"
                    style={{
                      background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)",
                      boxShadow: "0 2px 10px rgba(10,186,181,0.35)",
                    }}
                  >
                    Create Account & Accept
                  </button>
                </SignUpButton>
                <SignInButton
                  mode="redirect"
                  forceRedirectUrl={`/join/${token}`}
                >
                  <button className="w-full h-11 rounded-xl text-sm font-semibold border border-border hover:bg-muted transition-colors">
                    Sign In & Accept
                  </button>
                </SignInButton>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 text-center">
                  Signed in as <strong>{user.primaryEmailAddress?.emailAddress}</strong>
                </div>
                {user.primaryEmailAddress?.emailAddress?.toLowerCase() !== invite.email.toLowerCase() && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                    ⚠️ This invitation was sent to <strong>{invite.email}</strong> but you're signed in with a different email. Please sign in with the correct account.
                  </div>
                )}
                <button
                  onClick={accept}
                  disabled={
                    status === "accepting" ||
                    user.primaryEmailAddress?.emailAddress?.toLowerCase() !== invite.email.toLowerCase()
                  }
                  className="w-full h-11 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:-translate-y-px disabled:hover:translate-y-0"
                  style={{
                    background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)",
                    boxShadow: "0 2px 10px rgba(10,186,181,0.35)",
                  }}
                >
                  {status === "accepting" ? "Accepting…" : "Accept Invitation →"}
                </button>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-5">
          K9 Inspection Management · Powered by FieldDetect
        </p>
      </div>
    </div>
  );
}
