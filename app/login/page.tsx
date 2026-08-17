
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function LoginPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          router.replace("/studio");
        } else {
          setLoading(false);
        }
      }
    );

    return unsubscribe;
  }, [router]);

  async function loginWithGoogle() {
    try {
      setLoading(true);
      setError("");

      const provider =
        new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: "select_account",
      });

      const result =
        await signInWithPopup(
          auth,
          provider
        );

      if (result.user) {
        router.replace("/studio");
      }
    } catch (err) {
      console.error(
        "GOOGLE LOGIN ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Google login failed."
      );

      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 50% 10%, #1b1f27 0%, #080a0e 45%, #050608 100%)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily:
          "Inter, Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            letterSpacing: "2.8px",
            color: "#818a96",
            textTransform: "uppercase",
          }}
        >
          AI Architectural Render Studio
        </div>

        <div
          style={{
            marginTop: "18px",
            fontSize: "52px",
            fontWeight: 900,
            letterSpacing: "-3px",
          }}
        >
          TJ
          <span
            style={{
              opacity: 0.3,
            }}
          >
            .
          </span>
          RENDERAI
        </div>

        <p
          style={{
            margin:
              "16px auto 0",
            maxWidth: "360px",
            color: "#858d99",
            fontSize: "14px",
            lineHeight: 1.7,
          }}
        >
          Sign in to access your
          architectural workspace.
        </p>

        <button
          type="button"
          onClick={
            loginWithGoogle
          }
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "30px",
            padding: "16px",
            border: "none",
            borderRadius: "14px",
            background: "#fff",
            color: "#000",
            fontSize: "14px",
            fontWeight: 900,
            cursor: loading
              ? "not-allowed"
              : "pointer",
            opacity: loading
              ? 0.6
              : 1,
          }}
        >
          {loading
            ? "Checking account..."
            : "Continue with Google"}
        </button>

        {error && (
          <div
            style={{
              marginTop: "16px",
              border:
                "1px solid rgba(255,80,100,.2)",
              background:
                "rgba(255,60,80,.07)",
              color: "#ff9da6",
              padding: "13px",
              borderRadius: "12px",
              textAlign: "left",
              fontSize: "12px",
              lineHeight: 1.6,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            router.push("/")
          }
          style={{
            marginTop: "20px",
            border: "none",
            background: "transparent",
            color: "#59616d",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          ← Back to TJ.RENDERAI
        </button>
      </div>
    </main>
  );
}
