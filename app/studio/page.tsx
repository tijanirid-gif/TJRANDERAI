"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  ref,
  get,
  update,
  push,
} from "firebase/database";
import { auth, db } from "../../lib/firebase";

type Section =
  | "workspace"
  | "history"
  | "credits"
  | "account";

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
   AD
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

      const alreadyLoaded =
        adRef.current.getAttribute(
          "data-adsbygoogle-status"
        );

      if (alreadyLoaded) {
        loaded.current = true;
        return;
      }

      try {
        window.adsbygoogle =
          window.adsbygoogle || [];

        window.adsbygoogle.push({});
        loaded.current = true;
      } catch (error) {
        console.error(
          "AdSense error:",
          error
        );
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "90px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
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
   HOME
========================= */

export default function Home() {
  const router = useRouter();

  const [user, setUser] =
    useState<User | null>(null);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [activeSection, setActiveSection] =
    useState<Section>("workspace");

  const [mobileMenuOpen, setMobileMenuOpen] =
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
              const data =
                snapshot.val();

              if (
                typeof data?.credits ===
                "number"
              ) {
                setCredits(
                  data.credits
                );
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

            if (
              historySnapshot.exists()
            ) {
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
     IMAGE UPLOAD
  ========================= */

  function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (
      !file.type.startsWith("image/")
    ) {
      setError(
        "Please select an image."
      );
      return;
    }

    setError("");

    const reader =
      new FileReader();

    reader.onload = () => {
      setImage(
        reader.result as string
      );

      setResult("");

      setActiveSection(
        "workspace"
      );
    };

    reader.onerror = () => {
      setError(
        "Could not read the image."
      );
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
      setError(
        "Describe what you want."
      );
      return;
    }

    if (credits <= 0) {
      setError(
        "You have no credits remaining."
      );
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
              prompt:
                prompt.trim(),
              ...(image
                ? {
                    imageUrl:
                      image,
                  }
                : {}),
            }),
          }
        );

      const responseText =
        await response.text();

      let data: any;

      try {
        data =
          JSON.parse(
            responseText
          );
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
        Math.max(
          credits - 1,
          0
        );

      const userRef =
        ref(
          db,
          `users/${user.uid}`
        );

      await update(userRef, {
        credits:
          newCredits,
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
        createdAt:
          Date.now(),
        prompt:
          prompt.trim(),
        imageUrl:
          generatedImage,
        mode: image
          ? "edit"
          : "generation",
      };

      await update(
        newHistoryRef,
        entry
      );

      setCredits(
        newCredits
      );

      setResult(
        generatedImage
      );

      setHistory(
        (prev) => [
          entry,
          ...prev,
        ]
      );
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
      setError(
        "Could not sign out."
      );
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
    if (!timestamp)
      return "";

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
    setResult(
      item.imageUrl
    );

    setPrompt(
      item.prompt
    );

    setActiveSection(
      "workspace"
    );
  }

  /* =========================
     WHATSAPP
  ========================= */

  function buyCredits(
    points: number,
    price: number
  ) {
    const phone =
      "212621198621";

    const message =
      `Hello TJ.RENDERAI,

I want to buy ${points} credits for $${price}.

Account:
${user?.email || ""}`;

    const url =
      `https://wa.me/${phone}?text=${encodeURIComponent(
        message
      )}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  /* =========================
     LOADING
  ========================= */

  if (checkingAuth) {
    return (
      <main
        style={{
          minHeight:
            "100vh",
          background:
            "#080a0e",
          color:
            "#fff",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          fontFamily:
            "Inter,Arial,Helvetica,sans-serif",
        }}
      >
        <div
          style={{
            textAlign:
              "center",
          }}
        >
          <div
            style={{
              fontSize:
                "30px",
              fontWeight:
                900,
            }}
          >
            TJ
            <span
              style={{
                opacity:
                  0.3,
              }}
            >
              .
            </span>
            RENDERAI
          </div>

          <div
            style={{
              marginTop:
                "10px",
              color:
                "#68717f",
              fontSize:
                "13px",
            }}
          >
            Loading workspace...
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  /* =========================
     UI
  ========================= */

  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "linear-gradient(180deg,#080a0e 0%,#0b0e13 100%)",
        color:
          "#fff",
        fontFamily:
          "Inter,Arial,Helvetica,sans-serif",
      }}
    >
      {/* HEADER */}

      <header
        style={{
          position:
            "sticky",
          top: 0,
          zIndex: 100,
          borderBottom:
            "1px solid rgba(255,255,255,.07)",
          background:
            "rgba(8,10,14,.94)",
          backdropFilter:
            "blur(18px)",
        }}
      >
        <div
          style={{
            maxWidth:
              "1400px",
            margin:
              "0 auto",
            minHeight:
              "72px",
            padding:
              "0 22px",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap:
              "20px",
          }}
        >
          {/* LOGO */}

          <button
            onClick={() =>
              setActiveSection(
                "workspace"
              )
            }
            style={{
              border:
                "none",
              background:
                "transparent",
              color:
                "#fff",
              cursor:
                "pointer",
              padding:
                0,
              textAlign:
                "left",
            }}
          >
            <div
              style={{
                fontSize:
                  "22px",
                fontWeight:
                  900,
                letterSpacing:
                  "-1.2px",
              }}
            >
              TJ
              <span
                style={{
                  opacity:
                    0.3,
                }}
              >
                .
              </span>
              RENDERAI
              <span
                style={{
                  marginLeft:
                    "8px",
                  fontSize:
                    "9px",
                  padding:
                    "3px 7px",
                  borderRadius:
                    "6px",
                  border:
                    "1px solid rgba(255,255,255,.1)",
                  background:
                    "rgba(255,255,255,.04)",
                  color:
                    "#8c95a2",
                  letterSpacing:
                    "1px",
                }}
              >
                PRO
              </span>
            </div>

            <div
              style={{
                marginTop:
                  "3px",
                color:
                  "#58616e",
                fontSize:
                  "9px",
                letterSpacing:
                  "2px",
                textTransform:
                  "uppercase",
              }}
            >
              AI Architectural Studio
            </div>
          </button>

          {/* MENU */}

          <nav
            className="desktop-menu"
            style={{
              display:
                "flex",
              gap:
                "6px",
              alignItems:
                "center",
            }}
          >
            {[
              [
                "workspace",
                "Workspace",
              ],
              [
                "history",
                "History",
              ],
              [
                "credits",
                "Credits",
              ],
              [
                "account",
                "Account",
              ],
            ].map(
              ([value, label]) => (
                <button
                  key={value}
                  onClick={() =>
                    setActiveSection(
                      value as Section
                    )
                  }
                  style={{
                    border:
                      activeSection === value
                        ? "1px solid rgba(255,255,255,.12)"
                        : "1px solid transparent",
                    background:
                      activeSection === value
                        ? "rgba(255,255,255,.055)"
                        : "transparent",
                    color:
                      activeSection === value
                        ? "#fff"
                        : "#747d89",
                    borderRadius:
                      "11px",
                    padding:
                      "9px 13px",
                    cursor:
                      "pointer",
                    fontSize:
                      "12px",
                    fontWeight:
                      700,
                  }}
                >
                  {label}
                </button>
              )
            )}
          </nav>

          {/* RIGHT */}

          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap:
                "8px",
            }}
          >
            <button
              onClick={() =>
                setActiveSection(
                  "credits"
                )
              }
              style={{
                border:
                  "1px solid rgba(255,255,255,.08)",
                background:
                  "rgba(255,255,255,.04)",
                borderRadius:
                  "11px",
                padding:
                  "9px 12px",
                fontSize:
                  "12px",
                cursor:
                  "pointer",
                color:
                  "#fff",
              }}
            >
              <span
                style={{
                  color:
                    "#707987",
                }}
              >
                Credits
              </span>

              <strong
                style={{
                  marginLeft:
                    "7px",
                }}
              >
                {credits}
              </strong>
            </button>

            <button
              onClick={
                handleLogout
              }
              style={{
                border:
                  "1px solid rgba(255,255,255,.08)",
                background:
                  "rgba(255,255,255,.03)",
                color:
                  "#c8cdd4",
                borderRadius:
                  "11px",
                padding:
                  "9px 12px",
                cursor:
                  "pointer",
                fontSize:
                  "12px",
                fontWeight:
                  700,
              }}
            >
              Sign out
            </button>

            <button
              onClick={() =>
                setMobileMenuOpen(
                  (v) => !v
                )
              }
              className="mobile-menu-button"
              style={{
                display:
                  "none",
                width:
                  "38px",
                height:
                  "38px",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                border:
                  "1px solid rgba(255,255,255,.08)",
                background:
                  "rgba(255,255,255,.03)",
                color:
                  "#fff",
                borderRadius:
                  "11px",
                cursor:
                  "pointer",
                fontSize:
                  "18px",
              }}
            >
              ☰
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            className="mobile-menu"
            style={{
              display:
                "none",
              borderTop:
                "1px solid rgba(255,255,255,.06)",
              padding:
                "10px 22px 16px",
            }}
          >
            {[
              [
                "workspace",
                "Workspace",
              ],
              [
                "history",
                "History",
              ],
              [
                "credits",
                "Credits",
              ],
              [
                "account",
                "Account",
              ],
            ].map(
              ([value, label]) => (
                <button
                  key={value}
                  onClick={() => {
                    setActiveSection(
                      value as Section
                    );

                    setMobileMenuOpen(
                      false
                    );
                  }}
                  style={{
                    width:
                      "100%",
                    textAlign:
                      "left",
                    border:
                      "none",
                    background:
                      "transparent",
                    color:
                      "#fff",
                    padding:
                      "11px 0",
                    cursor:
                      "pointer",
                    fontSize:
                      "13px",
                    fontWeight:
                      700,
                  }}
                >
                  {label}
                </button>
              )
            )}
          </div>
        )}
      </header>

      {/* AD */}

      <div
        style={{
          maxWidth:
            "1400px",
          margin:
            "14px auto 0",
          padding:
            "0 22px",
        }}
      >
        <AdSpace />
      </div>

      {/* CONTENT */}

      <div
        style={{
          maxWidth:
            "1400px",
          margin:
            "0 auto",
          padding:
            "34px 22px 70px",
        }}
      >
        {/* =========================
            WORKSPACE
        ========================= */}

        {activeSection ===
          "workspace" && (
          <>
            <div
              style={{
                marginBottom:
                  "28px",
              }}
            >
              <div
                style={{
                  color:
                    "#5e6674",
                  fontSize:
                    "10px",
                  letterSpacing:
                    "2.5px",
                  textTransform:
                    "uppercase",
                }}
              >
                Workspace
              </div>

              <h1
                style={{
                  margin:
                    "8px 0 0",
                  fontSize:
                    "clamp(38px,5vw,58px)",
                  lineHeight:
                    0.95,
                  letterSpacing:
                    "-3px",
                  fontWeight:
                    900,
                }}
              >
                Create your
                <br />
                next render.
              </h1>

              <p
                style={{
                  color:
                    "#737c89",
                  maxWidth:
                    "680px",
                  marginTop:
                    "16px",
                  lineHeight:
                    1.7,
                  fontSize:
                    "14px",
                }}
              >
                Write naturally in
                Darija, العربية,
                Français or English.
                No professional prompt
                writing required.
              </p>
            </div>

            <div
              className="workspace-grid"
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "minmax(0,1fr) minmax(0,1fr)",
                gap:
                  "20px",
              }}
            >
              {/* INPUT */}

              <section
                style={{
                  background:
                    "rgba(255,255,255,.025)",
                  border:
                    "1px solid rgba(255,255,255,.08)",
                  borderRadius:
                    "22px",
                  padding:
                    "24px",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                    marginBottom:
                      "14px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize:
                          "17px",
                        fontWeight:
                          800,
                      }}
                    >
                      Reference image
                    </div>

                    <div
                      style={{
                        color:
                          "#5f6774",
                        fontSize:
                          "12px",
                        marginTop:
                          "5px",
                      }}
                    >
                      Upload your render
                      or start from text.
                    </div>
                  </div>

                  {image && (
                    <button
                      onClick={() =>
                        setImage("")
                      }
                      style={{
                        border:
                          "none",
                        background:
                          "transparent",
                        color:
                          "#737b88",
                        cursor:
                          "pointer",
                        fontSize:
                          "11px",
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <label
                  htmlFor="image-upload"
                  style={{
                    display:
                      "block",
                    cursor:
                      "pointer",
                  }}
                >
                  <div
                    style={{
                      height:
                        "360px",
                      borderRadius:
                        "16px",
                      border:
                        "1px dashed rgba(255,255,255,.13)",
                      background:
                        "#07090d",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      overflow:
                        "hidden",
                    }}
                  >
                    {image ? (
                      <img
                        src={
                          image
                        }
                        alt="Reference"
                        style={{
                          width:
                            "100%",
                          height:
                            "100%",
                          objectFit:
                            "contain",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          textAlign:
                            "center",
                          color:
                            "#5f6774",
                        }}
                      >
                        <div
                          style={{
                            width:
                              "60px",
                            height:
                              "60px",
                            margin:
                              "0 auto",
                            border:
                              "1px solid rgba(255,255,255,.09)",
                            borderRadius:
                              "16px",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            fontSize:
                              "30px",
                            color:
                              "#fff",
                          }}
                        >
                          +
                        </div>

                        <div
                          style={{
                            marginTop:
                              "15px",
                            color:
                              "#c4c8cf",
                            fontWeight:
                              700,
                          }}
                        >
                          Upload architectural image
                        </div>

                        <div
                          style={{
                            marginTop:
                              "6px",
                            fontSize:
                              "12px",
                          }}
                        >
                          PNG, JPG or WEBP
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
                    display:
                      "none",
                  }}
                />

                <div
                  style={{
                    marginTop:
                      "20px",
                  }}
                >
                  <label
                    style={{
                      fontSize:
                        "13px",
                      fontWeight:
                        700,
                    }}
                  >
                    What do you want?
                  </label>

                  <textarea
                    value={
                      prompt
                    }
                    onChange={(e) =>
                      setPrompt(
                        e.target.value
                      )
                    }
                    rows={6}
                    placeholder="Describe the architectural changes you want..."
                    style={{
                      width:
                        "100%",
                      boxSizing:
                        "border-box",
                      marginTop:
                        "9px",
                      resize:
                        "vertical",
                      background:
                        "#07090d",
                      border:
                        "1px solid rgba(255,255,255,.09)",
                      borderRadius:
                        "14px",
                      color:
                        "#fff",
                      padding:
                        "15px",
                      outline:
                        "none",
                      fontSize:
                        "14px",
                      lineHeight:
                        1.65,
                    }}
                  />
                </div>

                <button
                  onClick={
                    generateRender
                  }
                  disabled={
                    loading ||
                    credits <= 0
                  }
                  style={{
                    width:
                      "100%",
                    marginTop:
                      "16px",
                    padding:
                      "15px",
                    border:
                      "none",
                    borderRadius:
                      "14px",
                    background:
                      loading ||
                      credits <= 0
                        ? "#454b55"
                        : "#fff",
                    color:
                      "#000",
                    fontWeight:
                      900,
                    cursor:
                      loading ||
                      credits <= 0
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {loading
                    ? "Generating..."
                    : image
                    ? "Modify Render • 1 Credit"
                    : "Generate Render • 1 Credit"}
                </button>

                {error && (
                  <div
                    style={{
                      marginTop:
                        "14px",
                      border:
                        "1px solid rgba(255,70,90,.18)",
                      background:
                        "rgba(255,70,90,.07)",
                      color:
                        "#ff9ca6",
                      borderRadius:
                        "12px",
                      padding:
                        "12px 14px",
                      fontSize:
                        "13px",
                    }}
                  >
                    {error}
                  </div>
                )}
              </section>

              {/* RESULT */}

              <section
                style={{
                  background:
                    "rgba(255,255,255,.025)",
                  border:
                    "1px solid rgba(255,255,255,.08)",
                  borderRadius:
                    "22px",
                  padding:
                    "24px",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize:
                          "17px",
                        fontWeight:
                          800,
                      }}
                    >
                      Result
                    </div>

                    <div
                      style={{
                        color:
                          "#5f6774",
                        fontSize:
                          "12px",
                        marginTop:
                          "5px",
                      }}
                    >
                      Your AI render.
                    </div>
                  </div>

                  {result && (
                    <a
                      href={
                        result
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color:
                          "#9ba3af",
                        fontSize:
                          "11px",
                        textDecoration:
                          "none",
                      }}
                    >
                      Open
                    </a>
                  )}
                </div>

                <div
                  style={{
                    marginTop:
                      "15px",
                    height:
                      "535px",
                    background:
                      "#07090d",
                    border:
                      "1px solid rgba(255,255,255,.07)",
                    borderRadius:
                      "16px",
                    overflow:
                      "hidden",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                  }}
                >
                  {result ? (
                    <img
                      src={
                        result
                      }
                      alt="Generated render"
                      style={{
                        width:
                          "100%",
                        height:
                          "100%",
                        objectFit:
                          "contain",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        textAlign:
                          "center",
                        color:
                          "#565f6c",
                      }}
                    >
                      <div
                        style={{
                          fontSize:
                            "42px",
                          opacity:
                            0.25,
                        }}
                      >
                        ◇
                      </div>

                      <div
                        style={{
                          marginTop:
                            "10px",
                          fontWeight:
                            700,
                        }}
                      >
                        No render yet
                      </div>
                    </div>
                  )}
                </div>

                {result && (
                  <a
                    href={
                      result
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display:
                        "block",
                      textAlign:
                        "center",
                      marginTop:
                        "14px",
                      padding:
                        "13px",
                      border:
                        "1px solid rgba(255,255,255,.08)",
                      background:
                        "rgba(255,255,255,.035)",
                      color:
                        "#fff",
                      textDecoration:
                        "none",
                      borderRadius:
                        "12px",
                      fontWeight:
                        700,
                      fontSize:
                        "13px",
                    }}
                  >
                    Open Full Image
                  </a>
                )}
              </section>
            </div>
          </>
        )}

        {/* =========================
            HISTORY
        ========================= */}

        {activeSection ===
          "history" && (
          <section>
            <div
              style={{
                marginBottom:
                  "24px",
              }}
            >
              <div
                style={{
                  color:
                    "#5e6674",
                  fontSize:
                    "10px",
                  letterSpacing:
                    "2.5px",
                  textTransform:
                    "uppercase",
                }}
              >
                History
              </div>

              <h1
                style={{
                  margin:
                    "8px 0 0",
                  fontSize:
                    "42px",
                  fontWeight:
                    900,
                  letterSpacing:
                    "-2px",
                }}
              >
                Your renders
              </h1>
            </div>

            {history.length ===
            0 ? (
              <div
                style={{
                  padding:
                    "70px 25px",
                  textAlign:
                    "center",
                  background:
                    "rgba(255,255,255,.025)",
                  border:
                    "1px solid rgba(255,255,255,.08)",
                  borderRadius:
                    "20px",
                }}
              >
                <div
                  style={{
                    fontSize:
                      "38px",
                    opacity:
                      0.2,
                  }}
                >
                  ◇
                </div>

                <div
                  style={{
                    marginTop:
                      "12px",
                    color:
                      "#737b88",
                  }}
                >
                  No render history yet.
                </div>
              </div>
            ) : (
              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill,minmax(260px,1fr))",
                  gap:
                    "18px",
                }}
              >
                {history.map(
                  (item) => (
                    <button
                      key={
                        item.id
                      }
                      onClick={() =>
                        openHistory(
                          item
                        )
                      }
                      style={{
                        padding:
                          0,
                        textAlign:
                          "left",
                        border:
                          "1px solid rgba(255,255,255,.08)",
                        background:
                          "rgba(255,255,255,.025)",
                        borderRadius:
                          "18px",
                        overflow:
                          "hidden",
                        color:
                          "#fff",
                        cursor:
                          "pointer",
                      }}
                    >
                      <div
                        style={{
                          aspectRatio:
                            "4/3",
                          background:
                            "#07090d",
                        }}
                      >
                        <img
                          src={
                            item.imageUrl
                          }
                          alt=""
                          style={{
                            width:
                              "100%",
                            height:
                              "100%",
                            objectFit:
                              "cover",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          padding:
                            "14px",
                        }}
                      >
                        <div
                          style={{
                            fontSize:
                              "10px",
                            color:
                              "#626a77",
                            textTransform:
                              "uppercase",
                          }}
                        >
                          {item.mode ===
                          "edit"
                            ? "Edited"
                            : "Generated"}
                        </div>

                        <div
                          style={{
                            marginTop:
                              "7px",
                            fontSize:
                              "13px",
                            lineHeight:
                              1.45,
                          }}
                        >
                          {
                            item.prompt
                          }
                        </div>

                        <div
                          style={{
                            marginTop:
                              "9px",
                            color:
                              "#4d5561",
                            fontSize:
                              "10px",
                          }}
                        >
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

        {/* =========================
            CREDITS
        ========================= */}

        {activeSection ===
          "credits" && (
          <section>
            <div
              style={{
                marginBottom:
                  "30px",
              }}
            >
              <div
                style={{
                  color:
                    "#5e6674",
                  fontSize:
                    "10px",
                  letterSpacing:
                    "2.5px",
                  textTransform:
                    "uppercase",
                }}
              >
                Credits
              </div>

              <h1
                style={{
                  margin:
                    "8px 0 0",
                  fontSize:
                    "42px",
                  fontWeight:
                    900,
                  letterSpacing:
                    "-2px",
                }}
              >
                Get more credits.
              </h1>

              <p
                style={{
                  margin:
                    "14px 0 0",
                  color:
                    "#737c89",
                  maxWidth:
                    "650px",
                  fontSize:
                    "14px",
                  lineHeight:
                    1.7,
                }}
              >
                Choose a credit package and
                contact TJ.RENDERAI through
                WhatsApp to complete your order.
              </p>
            </div>

            <div
              className="credits-grid"
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(3,minmax(0,1fr))",
                gap:
                  "16px",
              }}
            >
              {[
                {
                  points: 20,
                  price: 1,
                },
                {
                  points: 50,
                  price: 3,
                },
                {
                  points: 100,
                  price: 5,
                },
                {
                  points: 500,
                  price: 15,
                },
                {
                  points: 1000,
                  price: 25,
                },
                {
                  points: 1500,
                  price: 30,
                },
              ].map(
                (plan) => (
                  <div
                    key={
                      plan.points
                    }
                    style={{
                      position:
                        "relative",
                      overflow:
                        "hidden",
                      background:
                        "linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.018))",
                      border:
                        "1px solid rgba(255,255,255,.09)",
                      borderRadius:
                        "20px",
                      padding:
                        "24px",
                    }}
                  >
                    <div
                      style={{
                        color:
                          "#626a77",
                        fontSize:
                          "10px",
                        letterSpacing:
                          "1.5px",
                        textTransform:
                          "uppercase",
                        fontWeight:
                          700,
                      }}
                    >
                      Credit Pack
                    </div>

                    <div
                      style={{
                        marginTop:
                          "18px",
                        display:
                          "flex",
                        alignItems:
                          "baseline",
                        gap:
                          "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize:
                            "40px",
                          fontWeight:
                            900,
                          letterSpacing:
                            "-2px",
                        }}
                      >
                        {plan.points}
                      </span>

                      <span
                        style={{
                          color:
                            "#707987",
                          fontSize:
                            "12px",
                        }}
                      >
                        points
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop:
                          "20px",
                        fontSize:
                          "28px",
                        fontWeight:
                          900,
                      }}
                    >
                      ${plan.price}
                    </div>

                    <div
                      style={{
                        marginTop:
                          "5px",
                        color:
                          "#59616d",
                        fontSize:
                          "11px",
                      }}
                    >
                      One-time package
                    </div>

                    <button
                      onClick={() =>
                        buyCredits(
                          plan.points,
                          plan.price
                        )
                      }
                      style={{
                        width:
                          "100%",
                        marginTop:
                          "22px",
                        padding:
                          "13px",
                        border:
                          "none",
                        borderRadius:
                          "12px",
                        background:
                          "#fff",
                        color:
                          "#05070a",
                        cursor:
                          "pointer",
                        fontSize:
                          "12px",
                        fontWeight:
                          900,
                      }}
                    >
                      Buy via WhatsApp
                    </button>
                  </div>
                )
              )}
            </div>

            <div
              style={{
                marginTop:
                  "22px",
                padding:
                  "18px 20px",
                border:
                  "1px solid rgba(255,255,255,.07)",
                background:
                  "rgba(255,255,255,.02)",
                borderRadius:
                  "16px",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap:
                  "20px",
                flexWrap:
                  "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    color:
                      "#626a77",
                    fontSize:
                      "10px",
                    textTransform:
                      "uppercase",
                    letterSpacing:
                      "1.5px",
                  }}
                >
                  Current balance
                </div>

                <div
                  style={{
                    marginTop:
                      "6px",
                    fontSize:
                      "24px",
                    fontWeight:
                      900,
                  }}
                >
                  {credits} credits
                </div>
              </div>

              <div
                style={{
                  color:
                    "#737c89",
                  fontSize:
                    "12px",
                  lineHeight:
                    1.6,
                  textAlign:
                    "right",
                }}
              >
                WhatsApp
                <br />
                0621198621
              </div>
            </div>
          </section>
        )}

        {/* =========================
            ACCOUNT
        ========================= */}

        {activeSection ===
          "account" && (
          <section>
            <div
              style={{
                marginBottom:
                  "24px",
              }}
            >
              <div
                style={{
                  color:
                    "#5e6674",
                  fontSize:
                    "10px",
                  letterSpacing:
                    "2.5px",
                  textTransform:
                    "uppercase",
                }}
              >
                Account
              </div>

              <h1
                style={{
                  margin:
                    "8px 0 0",
                  fontSize:
                    "42px",
                  fontWeight:
                    900,
                  letterSpacing:
                    "-2px",
                }}
              >
                Your account
              </h1>
            </div>

            <div
              className="account-grid"
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(2,minmax(0,1fr))",
                gap:
                  "18px",
              }}
            >
              <div
                style={{
                  background:
                    "rgba(255,255,255,.025)",
                  border:
                    "1px solid rgba(255,255,255,.08)",
                  borderRadius:
                    "20px",
                  padding:
                    "24px",
                }}
              >
                <div
                  style={{
                    fontSize:
                      "10px",
                    color:
                      "#626a77",
                    letterSpacing:
                      "1.5px",
                    textTransform:
                      "uppercase",
                  }}
                >
                  Account
                </div>

                <div
                  style={{
                    marginTop:
                      "12px",
                    fontSize:
                      "18px",
                    fontWeight:
                      800,
                  }}
                >
                  {displayName}
                </div>

                <div
                  style={{
                    marginTop:
                      "7px",
                    color:
                      "#737b88",
                    fontSize:
                      "13px",
                  }}
                >
                  {user.email}
                </div>
              </div>

              <div
                style={{
                  background:
                    "rgba(255,255,255,.025)",
                  border:
                    "1px solid rgba(255,255,255,.08)",
                  borderRadius:
                    "20px",
                  padding:
                    "24px",
                }}
              >
                <div
                  style={{
                    fontSize:
                      "10px",
                    color:
                      "#626a77",
                    letterSpacing:
                      "1.5px",
                    textTransform:
                      "uppercase",
                  }}
                >
                  Credits
                </div>

                <div
                  style={{
                    marginTop:
                      "9px",
                    fontSize:
                      "46px",
                    lineHeight:
                      1,
                    fontWeight:
                      900,
                  }}
                >
                  {credits}
                </div>

                <button
                  onClick={() =>
                    setActiveSection(
                      "credits"
                    )
                  }
                  style={{
                    marginTop:
                      "18px",
                    padding:
                      "11px 15px",
                    border:
                      "1px solid rgba(255,255,255,.09)",
                    background:
                      "rgba(255,255,255,.04)",
                    color:
                      "#fff",
                    borderRadius:
                      "11px",
                    cursor:
                      "pointer",
                    fontSize:
                      "12px",
                    fontWeight:
                      700,
                  }}
                >
                  Buy Credits
                </button>
              </div>
            </div>

            <button
              onClick={
                handleLogout
              }
              style={{
                marginTop:
                  "18px",
                padding:
                  "13px 18px",
                border:
                  "1px solid rgba(255,255,255,.08)",
                background:
                  "rgba(255,255,255,.03)",
                color:
                  "#d1d5dc",
                borderRadius:
                  "12px",
                cursor:
                  "pointer",
                fontWeight:
                  700,
              }}
            >
              Sign out
            </button>
          </section>
        )}
      </div>

      {/* RESPONSIVE */}

      <style jsx>{`
        @media (max-width: 1000px) {
          .credits-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }
        }

        @media (max-width: 900px) {
          .desktop-menu {
            display: none !important;
          }

          .mobile-menu-button {
            display: flex !important;
          }

          .mobile-menu {
            display: block !important;
          }

          .workspace-grid {
            grid-template-columns: 1fr !important;
          }

          .account-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 650px) {
          main > div {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .credits-grid {
            grid-template-columns: 1fr !important;
          }

          h1 {
            letter-spacing: -2px !important;
          }
        }
      `}</style>
    </main>
  );
}