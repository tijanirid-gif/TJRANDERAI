
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  ref,
  get,
  update,
  push,
} from "firebase/database";
import { auth, db } from "../lib/firebase";

type Section = "workspace" | "history" | "account";

type HistoryItem = {
  id: string;
  createdAt: number;
  prompt: string;
  imageUrl: string;
  mode: "edit" | "generation";
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/* =========================
   ICONS
========================= */

function Icon({
  name,
  size = 18,
}: {
  name: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "grid") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c.8-3.3 3.2-5 7-5s6.2 1.7 7 5" />
      </svg>
    );
  }

  if (name === "upload") {
    return (
      <svg {...common}>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M5 20h14" />
      </svg>
    );
  }

  if (name === "spark") {
    return (
      <svg {...common}>
        <path d="m12 2 1.4 6.6L20 10l-6.6 1.4L12 18l-1.4-6.6L4 10l6.6-1.4L12 2Z" />
        <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
      </svg>
    );
  }

  if (name === "logout") {
    return (
      <svg {...common}>
        <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" />
        <path d="m15 16 4-4-4-4" />
        <path d="M19 12H9" />
      </svg>
    );
  }

  if (name === "menu") {
    return (
      <svg {...common}>
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    );
  }

  if (name === "close") {
    return (
      <svg {...common}>
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    );
  }

  if (name === "image") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8" cy="9" r="1.5" />
        <path d="m4 17 5-5 4 4 2-2 5 5" />
      </svg>
    );
  }

  return null;
}

/* =========================
   ADS
========================= */

function AdSpace() {
  const adRef = useRef<HTMLModElement | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;

    const ad = adRef.current;
    if (!ad) return;

    const timer = window.setTimeout(() => {
      if (!adRef.current) return;

      const status =
        adRef.current.getAttribute(
          "data-adsbygoogle-status"
        );

      if (status) {
        loaded.current = true;
        return;
      }

      try {
        window.adsbygoogle =
          window.adsbygoogle || [];

        window.adsbygoogle.push({});
        loaded.current = true;
      } catch (error) {
        console.error("AdSense error:", error);
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="ad-wrap">
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: "block",
          width: "100%",
          maxWidth: "728px",
          height: "90px",
        }}
        data-ad-client="ca-pub-7139680741654550"
        data-ad-slot="7106638825"
      />
    </div>
  );
}

/* =========================
   MAIN
========================= */

export default function Home() {
  const router = useRouter();

  const [user, setUser] =
    useState<User | null>(null);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [activeSection, setActiveSection] =
    useState<Section>("workspace");

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [prompt, setPrompt] =
    useState("");

  const [image, setImage] =
    useState("");

  const [result, setResult] =
    useState("");

  const [credits, setCredits] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [history, setHistory] =
    useState<HistoryItem[]>([]);

  /* =========================
     AUTH
  ========================= */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (currentUser) => {
          if (!currentUser) {
            setUser(null);
            setCheckingAuth(false);
            router.replace("/login");
            return;
          }

          setUser(currentUser);

          try {
            const userRef = ref(
              db,
              `users/${currentUser.uid}`
            );

            const snapshot =
              await get(userRef);

            if (!snapshot.exists()) {
              await update(userRef, {
                credits: 5,
              });

              setCredits(5);
            } else {
              const data = snapshot.val();

              if (
                typeof data?.credits === "number"
              ) {
                setCredits(data.credits);
              } else {
                await update(userRef, {
                  credits: 5,
                });

                setCredits(5);
              }
            }

            const historySnapshot =
              await get(
                ref(
                  db,
                  `users/${currentUser.uid}/history`
                )
              );

            if (historySnapshot.exists()) {
              const data =
                historySnapshot.val();

              const items: HistoryItem[] =
                Object.entries(data)
                  .map(
                    ([id, value]: [
                      string,
                      any
                    ]) => ({
                      id,
                      createdAt:
                        typeof value?.createdAt ===
                        "number"
                          ? value.createdAt
                          : 0,
                      prompt:
                        typeof value?.prompt ===
                        "string"
                          ? value.prompt
                          : "",
                      imageUrl:
                        typeof value?.imageUrl ===
                        "string"
                          ? value.imageUrl
                          : "",
                      mode:
                        value?.mode === "edit"
                          ? "edit"
                          : "generation",
                    })
                  )
                  .sort(
                    (a, b) =>
                      b.createdAt -
                      a.createdAt
                  );

              setHistory(items);
            } else {
              setHistory([]);
            }
          } catch (err) {
            console.error(
              "Firebase error:",
              err
            );

            setError(
              "Could not load your account."
            );
          } finally {
            setCheckingAuth(false);
          }
        }
      );

    return unsubscribe;
  }, [router]);

  /* =========================
     UPLOAD
  ========================= */

  function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image.");
      return;
    }

    setError("");

    const reader = new FileReader();

    reader.onload = () => {
      setImage(reader.result as string);
      setResult("");
      setActiveSection("workspace");
    };

    reader.onerror = () => {
      setError("Could not read the image.");
    };

    reader.readAsDataURL(file);
  }

  /* =========================
     GENERATE
  ========================= */

  async function generateRender() {
    if (!user) {
      router.replace("/login");
      return;
    }

    if (!prompt.trim()) {
      setError("Describe what you want.");
      return;
    }

    if (credits <= 0) {
      setError("You have no credits remaining.");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    try {
      const idToken =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/generate",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              prompt: prompt.trim(),
              ...(image
                ? {
                    imageUrl: image,
                  }
                : {}),
            }),
          }
        );

      const responseText =
        await response.text();

      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          "Server returned invalid JSON."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Generation failed."
        );
      }

      const generatedImage =
        data?.imageUrl ||
        data?.image?.url;

      if (!generatedImage) {
        throw new Error(
          "No image returned by AI."
        );
      }

      const newCredits =
        Math.max(credits - 1, 0);

      const userRef =
        ref(
          db,
          `users/${user.uid}`
        );

      await update(userRef, {
        credits: newCredits,
      });

      const historyRef =
        ref(
          db,
          `users/${user.uid}/history`
        );

      const newHistoryRef =
        push(historyRef);

      const entry: HistoryItem = {
        id:
          newHistoryRef.key ||
          `${Date.now()}`,
        createdAt: Date.now(),
        prompt: prompt.trim(),
        imageUrl: generatedImage,
        mode: image
          ? "edit"
          : "generation",
      };

      await update(
        newHistoryRef,
        entry
      );

      setCredits(newCredits);
      setResult(generatedImage);

      setHistory((prev) => [
        entry,
        ...prev,
      ]);
    } catch (err) {
      console.error(
        "GENERATE ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     LOGOUT
  ========================= */

  async function handleLogout() {
    try {
      await auth.signOut();
      router.replace("/login");
    } catch {
      setError("Could not sign out.");
    }
  }

  /* =========================
     HELPERS
  ========================= */

  const displayName =
    useMemo(() => {
      if (!user) return "User";

      return (
        user.displayName ||
        user.email ||
        "User"
      );
    }, [user]);

  function formatDate(
    timestamp: number
  ) {
    if (!timestamp) return "";

    return new Date(
      timestamp
    ).toLocaleString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function openHistory(
    item: HistoryItem
  ) {
    setResult(item.imageUrl);
    setPrompt(item.prompt);
    setActiveSection("workspace");
    setMobileOpen(false);
  }

  function changeSection(
    section: Section
  ) {
    setActiveSection(section);
    setMobileOpen(false);
  }

  /* =========================
     LOADING
  ========================= */

  if (checkingAuth) {
    return (
      <>
        <style jsx global>{`
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: #07080b;
          }
        `}</style>

        <main className="loading-screen">
          <div className="loading-logo">
            TJ<span>.</span>RENDERAI
          </div>

          <div className="loading-line" />

          <p>Loading your workspace...</p>
        </main>
      </>
    );
  }

  if (!user) {
    return null;
  }

  /* =========================
     UI
  ========================= */

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #07080b;
        }

        body {
          color: #f5f7fa;
          font-family:
            Inter,
            Arial,
            Helvetica,
            sans-serif;
        }

        button,
        textarea,
        input {
          font-family: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        ::selection {
          background: rgba(255, 255, 255, 0.18);
        }

        .studio {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 75% -10%,
              rgba(255, 255, 255, 0.06),
              transparent 28%
            ),
            radial-gradient(
              circle at 10% 40%,
              rgba(95, 120, 160, 0.035),
              transparent 28%
            ),
            #07080b;
        }

        .shell {
          display: flex;
          min-height: 100vh;
        }

        .sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          width: 248px;
          padding: 22px 16px;
          border-right: 1px solid
            rgba(255, 255, 255, 0.07);
          background:
            rgba(8, 9, 12, 0.96);
          display: flex;
          flex-direction: column;
          z-index: 100;
        }

        .brand {
          padding: 4px 10px 28px;
        }

        .brand-name {
          font-size: 21px;
          font-weight: 900;
          letter-spacing: -1.1px;
        }

        .brand-name span {
          opacity: 0.3;
        }

        .brand-sub {
          margin-top: 5px;
          color: #555c68;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .nav-label {
          padding: 0 10px;
          margin: 8px 0 9px;
          color: #414751;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.7px;
          text-transform: uppercase;
        }

        .nav {
          display: grid;
          gap: 5px;
        }

        .nav-button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 11px 12px;
          border: 1px solid transparent;
          border-radius: 11px;
          background: transparent;
          color: #737b88;
          cursor: pointer;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          transition:
            background 0.18s,
            color 0.18s,
            border 0.18s;
        }

        .nav-button:hover {
          background: rgba(255, 255, 255, 0.035);
          color: #d8dce2;
        }

        .nav-button.active {
          background: rgba(255, 255, 255, 0.065);
          border-color: rgba(255, 255, 255, 0.08);
          color: #fff;
        }

        .sidebar-bottom {
          margin-top: auto;
        }

        .credit-card {
          padding: 15px;
          border: 1px solid
            rgba(255, 255, 255, 0.08);
          border-radius: 15px;
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.055),
              rgba(255, 255, 255, 0.018)
            );
        }

        .credit-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .credit-label {
          color: #666e7b;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .credit-number {
          font-size: 25px;
          font-weight: 900;
          letter-spacing: -1px;
        }

        .credit-text {
          margin-top: 6px;
          color: #565e6a;
          font-size: 10px;
          line-height: 1.5;
        }

        .logout {
          width: 100%;
          margin-top: 9px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          padding: 10px;
          border: 1px solid
            rgba(255, 255, 255, 0.07);
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.025);
          color: #858c98;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
        }

        .main {
          width: calc(100% - 248px);
          margin-left: 248px;
          min-width: 0;
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 30px;
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.065);
          background: rgba(7, 8, 11, 0.84);
          backdrop-filter: blur(20px);
        }

        .top-title {
          font-size: 12px;
          font-weight: 800;
        }

        .top-path {
          color: #535b67;
          margin-right: 7px;
        }

        .top-user {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #f2f3f5;
          color: #08090b;
          font-size: 11px;
          font-weight: 900;
        }

        .top-user-name {
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #9ba2ad;
          font-size: 11px;
        }

        .mobile-bar {
          display: none;
        }

        .page {
          width: min(1450px, 100%);
          margin: 0 auto;
          padding: 28px 30px 70px;
        }

        .ad-wrap {
          min-height: 90px;
          margin: 0 auto 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          opacity: 0.9;
        }

        .hero {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 28px;
        }

        .eyebrow {
          color: #545c68;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 2.3px;
          text-transform: uppercase;
        }

        .hero h1 {
          margin: 8px 0 0;
          font-size: clamp(42px, 5vw, 68px);
          line-height: 0.95;
          letter-spacing: -4px;
          font-weight: 950;
        }

        .hero p {
          max-width: 610px;
          margin: 17px 0 0;
          color: #68717d;
          font-size: 13px;
          line-height: 1.75;
        }

        .hero-credit {
          min-width: 150px;
          padding: 14px 16px;
          border: 1px solid
            rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.025);
        }

        .hero-credit-label {
          color: #565e6a;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1.4px;
          font-weight: 800;
        }

        .hero-credit strong {
          display: block;
          margin-top: 5px;
          font-size: 25px;
        }

        .workspace {
          display: grid;
          grid-template-columns:
            minmax(360px, 0.84fr)
            minmax(450px, 1.16fr);
          gap: 18px;
        }

        .panel {
          border: 1px solid
            rgba(255, 255, 255, 0.075);
          border-radius: 20px;
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.038),
              rgba(255, 255, 255, 0.018)
            );
          overflow: hidden;
        }

        .panel-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 19px 20px;
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.055);
        }

        .panel-title {
          font-size: 13px;
          font-weight: 850;
        }

        .panel-subtitle {
          margin-top: 4px;
          color: #555e6b;
          font-size: 10px;
        }

        .panel-body {
          padding: 20px;
        }

        .upload {
          position: relative;
          height: 355px;
          border: 1px dashed
            rgba(255, 255, 255, 0.13);
          border-radius: 15px;
          background: #090b0f;
          overflow: hidden;
          cursor: pointer;
          transition:
            border 0.2s,
            background 0.2s;
        }

        .upload:hover {
          border-color: rgba(255, 255, 255, 0.25);
          background: #0b0d11;
        }

        .upload img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .upload-empty {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          text-align: center;
        }

        .upload-icon {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          border: 1px solid
            rgba(255, 255, 255, 0.09);
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.025);
          color: #bfc4cc;
        }

        .upload-title {
          margin-top: 15px;
          color: #d4d7dd;
          font-size: 12px;
          font-weight: 800;
        }

        .upload-info {
          margin-top: 6px;
          color: #4e5662;
          font-size: 10px;
        }

        .remove-image {
          position: absolute;
          right: 10px;
          top: 10px;
          padding: 7px 9px;
          border: 1px solid
            rgba(255, 255, 255, 0.09);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.65);
          color: #b4bac2;
          cursor: pointer;
          font-size: 9px;
        }

        .prompt-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 18px;
          margin-bottom: 8px;
          color: #c6cad1;
          font-size: 11px;
          font-weight: 800;
        }

        .prompt-hint {
          color: #4e5662;
          font-weight: 600;
        }

        textarea {
          width: 100%;
          min-height: 142px;
          resize: vertical;
          padding: 14px;
          border: 1px solid
            rgba(255, 255, 255, 0.08);
          border-radius: 13px;
          outline: none;
          background: #090b0f;
          color: #f5f6f8;
          font-size: 12px;
          line-height: 1.7;
        }

        textarea:focus {
          border-color: rgba(255, 255, 255, 0.2);
        }

        textarea::placeholder {
          color: #444b56;
        }

        .generate {
          width: 100%;
          margin-top: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          border: 0;
          border-radius: 12px;
          background: #f4f5f7;
          color: #08090b;
          cursor: pointer;
          font-size: 11px;
          font-weight: 900;
          transition:
            transform 0.15s,
            opacity 0.15s;
        }

        .generate:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .generate:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .error {
          margin-top: 11px;
          padding: 11px 13px;
          border: 1px solid
            rgba(255, 75, 95, 0.17);
          border-radius: 11px;
          background: rgba(255, 75, 95, 0.06);
          color: #ff9ba5;
          font-size: 10px;
          line-height: 1.5;
        }

        .result-box {
          height: 100%;
          min-height: 610px;
          display: flex;
          flex-direction: column;
        }

        .result-stage {
          position: relative;
          flex: 1;
          min-height: 535px;
          margin: 20px;
          margin-top: 0;
          border: 1px solid
            rgba(255, 255, 255, 0.07);
          border-radius: 15px;
          background:
            radial-gradient(
              circle at center,
              rgba(255, 255, 255, 0.025),
              transparent 58%
            ),
            #080a0e;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .result-stage img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .empty-result {
          text-align: center;
          color: #4d5561;
        }

        .empty-result-icon {
          margin: 0 auto 12px;
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border: 1px solid
            rgba(255, 255, 255, 0.07);
          border-radius: 15px;
          opacity: 0.5;
        }

        .empty-result strong {
          display: block;
          color: #707884;
          font-size: 11px;
        }

        .empty-result span {
          display: block;
          margin-top: 5px;
          color: #424a55;
          font-size: 9px;
        }

        .result-actions {
          display: flex;
          gap: 8px;
          margin: 0 20px 20px;
        }

        .result-action {
          flex: 1;
          padding: 11px;
          border: 1px solid
            rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.025);
          color: #b9bec6;
          text-decoration: none;
          text-align: center;
          font-size: 10px;
          font-weight: 800;
        }

        .section-head {
          margin-bottom: 22px;
        }

        .section-head h1 {
          margin: 7px 0 0;
          font-size: 45px;
          letter-spacing: -2.5px;
          font-weight: 950;
        }

        .section-head p {
          margin: 9px 0 0;
          color: #626b77;
          font-size: 12px;
        }

        .history-grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fill,
              minmax(250px, 1fr)
            );
          gap: 15px;
        }

        .history-card {
          padding: 0;
          overflow: hidden;
          border: 1px solid
            rgba(255, 255, 255, 0.075);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.025);
          color: #fff;
          cursor: pointer;
          text-align: left;
          transition:
            transform 0.18s,
            border 0.18s;
        }

        .history-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .history-image {
          aspect-ratio: 4 / 3;
          background: #090b0f;
          overflow: hidden;
        }

        .history-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }

        .history-card:hover .history-image img {
          transform: scale(1.025);
        }

        .history-info {
          padding: 13px;
        }

        .history-mode {
          color: #59616d;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.3px;
          text-transform: uppercase;
        }

        .history-prompt {
          display: -webkit-box;
          overflow: hidden;
          margin-top: 7px;
          color: #bfc4cb;
          font-size: 11px;
          line-height: 1.5;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
        }

        .history-date {
          margin-top: 9px;
          color: #454d58;
          font-size: 9px;
        }

        .empty-history {
          padding: 80px 20px;
          border: 1px solid
            rgba(255, 255, 255, 0.07);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.02);
          text-align: center;
        }

        .empty-history-icon {
          width: 54px;
          height: 54px;
          margin: 0 auto;
          display: grid;
          place-items: center;
          border: 1px solid
            rgba(255, 255, 255, 0.07);
          border-radius: 15px;
          color: #626a76;
        }

        .empty-history strong {
          display: block;
          margin-top: 14px;
          font-size: 12px;
        }

        .empty-history p {
          margin: 7px 0 0;
          color: #4d5560;
          font-size: 10px;
        }

        .account-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 15px;
        }

        .account-card {
          padding: 23px;
          border: 1px solid
            rgba(255, 255, 255, 0.075);
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.025);
        }

        .account-label {
          color: #565e69;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .account-value {
          margin-top: 10px;
          color: #f0f2f5;
          font-size: 18px;
          font-weight: 850;
          word-break: break-word;
        }

        .account-email {
          margin-top: 6px;
          color: #656d79;
          font-size: 11px;
          word-break: break-word;
        }

        .account-credits {
          margin-top: 9px;
          font-size: 48px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -2px;
        }

        .mobile-overlay {
          display: none;
        }

        @media (max-width: 1050px) {
          .sidebar {
            width: 215px;
          }

          .main {
            width: calc(100% - 215px);
            margin-left: 215px;
          }

          .workspace {
            grid-template-columns: 1fr;
          }

          .result-box {
            min-height: 650px;
          }
        }

        @media (max-width: 800px) {
          .sidebar {
            transform: translateX(-100%);
            transition: transform 0.25s ease;
            box-shadow: 20px 0 50px rgba(0, 0, 0, 0.35);
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .main {
            width: 100%;
            margin-left: 0;
          }

          .mobile-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 64px;
            padding: 0 17px;
            border-bottom: 1px solid
              rgba(255, 255, 255, 0.07);
          }

          .mobile-brand {
            font-size: 17px;
            font-weight: 900;
          }

          .mobile-brand span {
            opacity: 0.3;
          }

          .mobile-menu-button {
            width: 38px;
            height: 38px;
            display: grid;
            place-items: center;
            border: 1px solid
              rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.03);
            color: #fff;
            cursor: pointer;
          }

          .topbar {
            display: none;
          }

          .mobile-overlay {
            position: fixed;
            inset: 0;
            z-index: 90;
            display: block;
            background: rgba(0, 0, 0, 0.55);
            backdrop-filter: blur(3px);
          }

          .page {
            padding: 20px 15px 50px;
          }

          .hero {
            align-items: flex-start;
            flex-direction: column;
            margin-bottom: 22px;
          }

          .hero h1 {
            letter-spacing: -2.8px;
          }

          .hero-credit {
            width: 100%;
          }

          .result-stage {
            min-height: 430px;
          }

          .account-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .ad-wrap {
            min-height: 60px;
            transform: scale(0.72);
            transform-origin: center;
            margin-bottom: 5px;
          }

          .hero h1 {
            font-size: 43px;
          }

          .workspace {
            gap: 13px;
          }

          .panel-body {
            padding: 14px;
          }

          .panel-head {
            padding: 15px;
          }

          .upload {
            height: 285px;
          }

          .result-stage {
            min-height: 350px;
            margin: 14px;
          }

          .result-actions {
            margin: 0 14px 14px;
          }

          .section-head h1 {
            font-size: 37px;
          }

          .history-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="studio">
        <div className="shell">
          {/* MOBILE OVERLAY */}

          {mobileOpen && (
            <div
              className="mobile-overlay"
              onClick={() =>
                setMobileOpen(false)
              }
            />
          )}

          {/* SIDEBAR */}

          <aside
            className={`sidebar ${
              mobileOpen ? "open" : ""
            }`}
          >
            <div className="brand">
              <div className="brand-name">
                TJ<span>.</span>RENDERAI
              </div>

              <div className="brand-sub">
                AI Architectural Studio
              </div>
            </div>

            <div className="nav-label">
              Studio
            </div>

            <nav className="nav">
              <button
                className={`nav-button ${
                  activeSection ===
                  "workspace"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  changeSection(
                    "workspace"
                  )
                }
              >
                <Icon name="grid" />
                Workspace
              </button>

              <button
                className={`nav-button ${
                  activeSection ===
                  "history"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  changeSection(
                    "history"
                  )
                }
              >
                <Icon name="clock" />
                History
              </button>

              <button
                className={`nav-button ${
                  activeSection ===
                  "account"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  changeSection(
                    "account"
                  )
                }
              >
                <Icon name="user" />
                Account
              </button>
            </nav>

            <div className="sidebar-bottom">
              <div className="credit-card">
                <div className="credit-top">
                  <span className="credit-label">
                    Available credits
                  </span>

                  <span className="credit-number">
                    {credits}
                  </span>
                </div>

                <div className="credit-text">
                  Each AI generation uses
                  one credit.
                </div>
              </div>

              <button
                className="logout"
                onClick={
                  handleLogout
                }
              >
                <Icon
                  name="logout"
                  size={15}
                />
                Sign out
              </button>
            </div>
          </aside>

          {/* MAIN */}

          <div className="main">
            {/* MOBILE BAR */}

            <div className="mobile-bar">
              <div className="mobile-brand">
                TJ<span>.</span>RENDERAI
              </div>

              <button
                className="mobile-menu-button"
                onClick={() =>
                  setMobileOpen(
                    (v) => !v
                  )
                }
              >
                <Icon
                  name={
                    mobileOpen
                      ? "close"
                      : "menu"
                  }
                  size={18}
                />
              </button>
            </div>

            {/* TOPBAR */}

            <header className="topbar">
              <div className="top-title">
                <span className="top-path">
                  Studio /
                </span>
                {activeSection ===
                  "workspace" &&
                  "Workspace"}
                {activeSection ===
                  "history" &&
                  "History"}
                {activeSection ===
                  "account" &&
                  "Account"}
              </div>

              <div className="top-user">
                <div className="top-user-name">
                  {displayName}
                </div>

                <div className="avatar">
                  {(
                    displayName
                      .trim()
                      .charAt(0) ||
                    "U"
                  ).toUpperCase()}
                </div>
              </div>
            </header>

            <div className="page">
              {/* AD */}

              <AdSpace />

              {/* WORKSPACE */}

              {activeSection ===
                "workspace" && (
                <>
                  <section className="hero">
                    <div>
                      <div className="eyebrow">
                        AI Rendering Workspace
                      </div>

                      <h1>
                        Create.
                        <br />
                        Refine.
                        <br />
                        Render.
                      </h1>

                      <p>
                        Upload an
                        architectural
                        image or start
                        from text. Describe
                        your vision naturally
                        and let AI transform
                        the render.
                      </p>
                    </div>

                    <div className="hero-credit">
                      <div className="hero-credit-label">
                        Your balance
                      </div>

                      <strong>
                        {credits} credits
                      </strong>
                    </div>
                  </section>

                  <div className="workspace">
                    {/* INPUT */}

                    <section className="panel">
                      <div className="panel-head">
                        <div>
                          <div className="panel-title">
                            Reference
                          </div>

                          <div className="panel-subtitle">
                            Start with an
                            image or text
                          </div>
                        </div>

                        <Icon
                          name="image"
                          size={17}
                        />
                      </div>

                      <div className="panel-body">
                        <label htmlFor="image-upload">
                          <div className="upload">
                            {image ? (
                              <>
                                <img
                                  src={image}
                                  alt="Reference"
                                />

                                <button
                                  type="button"
                                  className="remove-image"
                                  onClick={(
                                    event
                                  ) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setImage(
                                      ""
                                    );
                                  }}
                                >
                                  Remove
                                </button>
                              </>
                            ) : (
                              <div className="upload-empty">
                                <div className="upload-icon">
                                  <Icon
                                    name="upload"
                                    size={21}
                                  />
                                </div>

                                <div className="upload-title">
                                  Upload
                                  architectural
                                  image
                                </div>

                                <div className="upload-info">
                                  PNG · JPG ·
                                  WEBP
                                </div>
                              </div>
                            )}
                          </div>
                        </label>

                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={
                            handleImageUpload
                          }
                          style={{
                            display: "none",
                          }}
                        />

                        <div className="prompt-label">
                          <span>
                            Describe your
                            changes
                          </span>

                          <span className="prompt-hint">
                            Darija · العربية ·
                            Français · English
                          </span>
                        </div>

                        <textarea
                          value={prompt}
                          onChange={(e) =>
                            setPrompt(
                              e.target.value
                            )
                          }
                          placeholder="Example: Keep the building exactly the same, improve the surrounding environment, add realistic vegetation and natural daylight..."
                        />

                        <button
                          className="generate"
                          onClick={
                            generateRender
                          }
                          disabled={
                            loading ||
                            credits <= 0
                          }
                        >
                          <Icon
                            name="spark"
                            size={15}
                          />

                          {loading
                            ? "Generating..."
                            : image
                            ? "Modify Render · 1 Credit"
                            : "Generate Render · 1 Credit"}
                        </button>

                        {error && (
                          <div className="error">
                            {error}
                          </div>
                        )}
                      </div>
                    </section>

                    {/* RESULT */}

                    <section className="panel result-box">
                      <div className="panel-head">
                        <div>
                          <div className="panel-title">
                            Result
                          </div>

                          <div className="panel-subtitle">
                            Your generated
                            architectural render
                          </div>
                        </div>

                        {result && (
                          <span
                            style={{
                              color:
                                "#78818d",
                              fontSize:
                                "9px",
                              fontWeight:
                                800,
                            }}
                          >
                            READY
                          </span>
                        )}
                      </div>

                      <div className="result-stage">
                        {result ? (
                          <img
                            src={result}
                            alt="Generated render"
                          />
                        ) : (
                          <div className="empty-result">
                            <div className="empty-result-icon">
                              <Icon
                                name="spark"
                                size={22}
                              />
                            </div>

                            <strong>
                              Your render
                              appears here
                            </strong>

                            <span>
                              Upload an image
                              or describe a
                              scene to begin
                            </span>
                          </div>
                        )}
                      </div>

                      {result && (
                        <div className="result-actions">
                          <a
                            className="result-action"
                            href={result}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open Full Image
                          </a>

                          <a
                            className="result-action"
                            href={result}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                          >
                            Open / Save
                          </a>
                        </div>
                      )}
                    </section>
                  </div>
                </>
              )}

              {/* HISTORY */}

              {activeSection ===
                "history" && (
                <section>
                  <div className="section-head">
                    <div className="eyebrow">
                      Your workspace
                    </div>

                    <h1>
                      Render history
                    </h1>

                    <p>
                      Every generated and
                      edited render saved to
                      your account.
                    </p>
                  </div>

                  {history.length === 0 ? (
                    <div className="empty-history">
                      <div className="empty-history-icon">
                        <Icon
                          name="clock"
                          size={22}
                        />
                      </div>

                      <strong>
                        No renders yet
                      </strong>

                      <p>
                        Your generated
                        images will appear
                        here.
                      </p>
                    </div>
                  ) : (
                    <div className="history-grid">
                      {history.map(
                        (item) => (
                          <button
                            key={item.id}
                            className="history-card"
                            onClick={() =>
                              openHistory(
                                item
                              )
                            }
                          >
                            <div className="history-image">
                              <img
                                src={
                                  item.imageUrl
                                }
                                alt=""
                              />
                            </div>

                            <div className="history-info">
                              <div className="history-mode">
                                {item.mode ===
                                "edit"
                                  ? "Edited render"
                                  : "Generated render"}
                              </div>

                              <div className="history-prompt">
                                {item.prompt}
                              </div>

                              <div className="history-date">
                                {formatDate(
                                  item.createdAt
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* ACCOUNT */}

              {activeSection ===
                "account" && (
                <section>
                  <div className="section-head">
                    <div className="eyebrow">
                      Profile
                    </div>

                    <h1>
                      Your account
                    </h1>

                    <p>
                      Manage your
                      workspace identity
                      and available
                      credits.
                    </p>
                  </div>

                  <div className="account-grid">
                    <div className="account-card">
                      <div className="account-label">
                        Account
                      </div>

                      <div className="account-value">
                        {displayName}
                      </div>

                      <div className="account-email">
                        {user.email}
                      </div>
                    </div>

                    <div className="account-card">
                      <div className="account-label">
                        Available credits
                      </div>

                      <div className="account-credits">
                        {credits}
                      </div>
                    </div>
                  </div>

                  <button
                    className="logout"
                    style={{
                      width:
                        "auto",
                      marginTop:
                        "15px",
                      padding:
                        "12px 17px",
                    }}
                    onClick={
                      handleLogout
                    }
                  >
                    <Icon
                      name="logout"
                      size={15}
                    />
                    Sign out
                  </button>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

