"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function Home() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setChecking(false);
    });

    return () => unsubscribe();
  }, []);

  function openStudio() {
    if (user) {
      router.push("/studio");
    } else {
      router.push("/login");
    }
  }

  if (checking) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#05070a",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "32px",
              fontWeight: 900,
              letterSpacing: "-1.5px",
            }}
          >
            TJ<span style={{ opacity: 0.3 }}>.</span>RENDERAI
          </div>

          <div
            style={{
              marginTop: "12px",
              color: "#68717f",
              fontSize: "13px",
            }}
          >
            Loading...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 50% 0%, #11161D 0%, #080B10 40%, #05070A 80%)",
        color: "#fff",
        fontFamily: "Inter, Arial, Helvetica, sans-serif",
        overflowX: "hidden",
      }}
    >
      {/* NAVBAR */}
      <header
        style={{
          height: "76px",
          borderBottom: "1px solid rgba(255,255,255,.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          background: "rgba(5,7,10,.88)",
          backdropFilter: "blur(20px)",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          onClick={() => router.push("/")}
          style={{
            fontSize: "20px",
            fontWeight: 900,
            letterSpacing: "-0.8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          TJ
          <span style={{ color: "#68717f" }}>.</span>
          RENDERAI

          <span
            style={{
              fontSize: "10px",
              padding: "3px 7px",
              borderRadius: "6px",
              background: "rgba(255,255,255,.06)",
              border: "1px solid rgba(255,255,255,.1)",
              color: "#9ca5b1",
              fontWeight: 600,
              letterSpacing: "0.5px",
            }}
          >
            PRO
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <button
            onClick={() => router.push("/studio")}
            style={{
              border: "1px solid rgba(255,255,255,.08)",
              background: "rgba(255,255,255,.03)",
              color: "#c5cbd3",
              padding: "9px 16px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            Studio Workspace
          </button>

          <button
            onClick={openStudio}
            style={{
              border: "1px solid rgba(255,255,255,.15)",
              background: "#fff",
              color: "#05070a",
              padding: "9px 18px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            {user ? "Open Studio" : "Get Started"}
          </button>
        </div>
      </header>

      {/* HERO */}
      <section
        style={{
          minHeight: "calc(100vh - 76px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "70px 24px 100px",
          position: "relative",
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            width: "750px",
            height: "750px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,.045), transparent 70%)",
            top: "-150px",
            left: "50%",
            transform: "translateX(-50%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            width: "100%",
            maxWidth: "1080px",
            textAlign: "center",
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* BADGE */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              border: "1px solid rgba(255,255,255,.08)",
              background: "rgba(255,255,255,.025)",
              padding: "7px 14px",
              borderRadius: "999px",
              color: "#9ca5b1",
              fontSize: "11px",
              letterSpacing: "1.5px",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#10b981",
                display: "inline-block",
              }}
            />

            Architectural Intelligence Engine
          </div>

          {/* TITLE */}
          <h1
            style={{
              margin: "25px auto 0",
              maxWidth: "950px",
              fontSize: "clamp(48px, 8vw, 96px)",
              lineHeight: ".95",
              letterSpacing: "-4px",
              fontWeight: 900,
            }}
          >
            Transform concepts into
            <br />

            <span style={{ color: "#6b7280" }}>
              architectural masterpieces.
            </span>
          </h1>

          {/* DESCRIPTION */}
          <p
            style={{
              maxWidth: "650px",
              margin: "25px auto 0",
              color: "#9ca3af",
              fontSize: "16px",
              lineHeight: 1.7,
            }}
          >
            Professional AI rendering suite for architects and designers.
            Create, modify and iterate on architectural visuals with
            precision. Prompt naturally in Darija, العربية, Français or
            English.
          </p>

          {/* BUTTONS */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "38px",
            }}
          >
            <button
              onClick={openStudio}
              style={{
                border: "1px solid rgba(255,255,255,.2)",
                background: "#fff",
                color: "#05070a",
                padding: "15px 30px",
                borderRadius: "14px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 900,
                minWidth: "190px",
                boxShadow:
                  "0 12px 35px -8px rgba(255,255,255,.15)",
              }}
            >
              Launch Workspace →
            </button>

            <button
              onClick={() => router.push("/studio")}
              style={{
                border: "1px solid rgba(255,255,255,.08)",
                background: "rgba(255,255,255,.03)",
                color: "#d1d5db",
                padding: "15px 30px",
                borderRadius: "14px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                minWidth: "190px",
              }}
            >
              Explore Studio
            </button>
          </div>

          {/* FEATURES */}
          <div
            className="features"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: "16px",
              marginTop: "75px",
              textAlign: "left",
            }}
          >
            <Feature
              number="01"
              title="Advanced Generation"
              text="Transform architectural concepts and prompts into highly realistic visual renders."
            />

            <Feature
              number="02"
              title="Precise Modification"
              text="Upload an existing architectural image and modify only the elements you describe."
            />

            <Feature
              number="03"
              title="Cloud History"
              text="Keep your generated renders organized and accessible from your account."
            />
          </div>

          {/* FOOTER LABEL */}
          <div
            style={{
              marginTop: "60px",
              color: "#4b5563",
              fontSize: "10px",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            TJ.RENDERAI • PROFESSIONAL ARCHITECTURAL
            VISUALIZATION PLATFORM
          </div>
        </div>
      </section>

      <style jsx>{`
        @media (max-width: 768px) {
          header {
            padding: 0 16px !important;
          }

          header button:first-child {
            display: none !important;
          }

          section {
            padding: 45px 16px 80px !important;
          }

          h1 {
            letter-spacing: -2.5px !important;
          }

          .features {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

function Feature({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,.06)",
        background: "rgba(255,255,255,.015)",
        borderRadius: "20px",
        padding: "24px",
      }}
    >
      <div
        style={{
          color: "#6b7280",
          fontSize: "11px",
          letterSpacing: "1.5px",
          fontWeight: 700,
        }}
      >
        {number}
      </div>

      <div
        style={{
          marginTop: "16px",
          fontSize: "16px",
          fontWeight: 700,
          color: "#f3f4f6",
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: "8px",
          color: "#9ca3af",
          fontSize: "13px",
          lineHeight: 1.6,
        }}
      >
        {text}
      </div>
    </div>
  );
}