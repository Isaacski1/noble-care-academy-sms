import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Clock3, MonitorPlay, Play, Video, X } from "lucide-react";
import PublicSiteLayout from "../../components/marketing/PublicSiteLayout";

type Category = "Getting Started" | "School Admin" | "Teacher" | "Parent";
type DemoVideo = {
  id: string;
  title: string;
  description: string;
  category: Category;
  duration: string;
  youtubeUrl: string;
};

// HOW TO PUBLISH A RECORDING:
// Paste its full YouTube link into youtubeUrl. The placeholder automatically
// becomes a playable video card on the website.
const DEMO_VIDEOS: DemoVideo[] = [
  { id: "overview", title: "Complete School Manager GH Overview", description: "Tour the platform, its dashboards, and the school operations it brings together.", category: "Getting Started", duration: "12 min", youtubeUrl: "https://youtu.be/4DztpOaDQBU" },
  { id: "workspace", title: "Create Your School Workspace", description: "Register a school, verify the administrator account, and begin the free trial.", category: "Getting Started", duration: "4:28 min", youtubeUrl: "https://youtu.be/01KfH8RJBuI" },
  { id: "setup", title: "Initial School Setup", description: "Configure branding, academic year, term, classes, and essential settings.", category: "Getting Started", duration: "6:12 min", youtubeUrl: "https://youtu.be/Bxpwu6Nh8z4" },
  { id: "admin", title: "School Admin Dashboard Tour", description: "Understand dashboard totals, shortcuts, alerts, and management areas.", category: "School Admin", duration: "22:25 min", youtubeUrl: "https://youtu.be/7pJNGKCr3Cw" },
  { id: "people", title: "Manage Students, Classes and Teachers", description: "Add school records, organize classes, and assign teachers.", category: "School Admin", duration: "4 min", youtubeUrl: "https://youtu.be/2WFuuqAaSwo" },
  { id: "fees", title: "Fees, Payments and Balances", description: "Create fee items, record payments, follow balances, and read finance reports.", category: "School Admin", duration: "7:29 min", youtubeUrl: "https://youtu.be/mP-U5lo5Tm0" },
  { id: "sms", title: "Send SMS Reminders to Parents", description: "Filter recipients by class, compose a message, review cost, and send safely.", category: "School Admin", duration: "7:35 min", youtubeUrl: "https://youtu.be/A5vFnlYQjoQ" },
  { id: "reports", title: "Account Security", description: "Secure accounts with multi-factor authentication (MFA) and manage security settings.", category: "School Admin", duration: "5–7 min", youtubeUrl: "" },
  { id: "teacher", title: "Teacher Dashboard Tour", description: "See assigned classes, classroom information, and the daily teacher workflow.", category: "Teacher", duration: "4–6 min", youtubeUrl: "" },
  { id: "attendance", title: "Attendance and Academic Records", description: "Take attendance and manage academic records for an assigned class.", category: "Teacher", duration: "5–7 min", youtubeUrl: "" },
  { id: "parent", title: "Parent Dashboard Tour", description: "View a ward's school information, attendance, fees, and notices.", category: "Parent", duration: "4–6 min", youtubeUrl: "" },
  { id: "notices", title: "Parent Notices and School Updates", description: "See how families receive communication and important updates.", category: "Parent", duration: "3–5 min", youtubeUrl: "" },
];

const getEmbedUrl = (value: string) => {
  if (!value.trim()) return null;
  try {
    const url = new URL(value.trim());
    let id = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || "";
    if (!id && url.pathname.startsWith("/embed/")) id = url.pathname.split("/embed/")[1] || "";
    if (!id && url.pathname.startsWith("/shorts/")) id = url.pathname.split("/shorts/")[1] || "";
    id = id.split(/[?&/]/)[0].replace(/[^a-zA-Z0-9_-]/g, "");
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
};

const getThumbnailUrl = (value: string) => {
  if (!value.trim()) return null;
  try {
    const url = new URL(value.trim());
    let id = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || "";
    if (!id && url.pathname.startsWith("/embed/")) id = url.pathname.split("/embed/")[1] || "";
    if (!id && url.pathname.startsWith("/shorts/")) id = url.pathname.split("/shorts/")[1] || "";
    id = id.split(/[?&/]/)[0].replace(/[^a-zA-Z0-9_-]/g, "");
    // Use hqdefault for better quality
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  } catch {
    return null;
  }
};

const DemoVideos = () => {
  const [category, setCategory] = useState<"All" | Category>("All");
  const [active, setActive] = useState<DemoVideo | null>(null);
  const [showModal, setShowModal] = useState(false);

  const videos = useMemo(
    () => category === "All" ? DEMO_VIDEOS : DEMO_VIDEOS.filter((video) => video.category === category),
    [category],
  );

  const handleWatch = (video: DemoVideo) => {
    setActive(video);
    setShowModal(true);
  };

  const activeEmbed = active ? getEmbedUrl(active.youtubeUrl) : null;
  const categories: Array<"All" | Category> = ["All", "Getting Started", "School Admin", "Teacher", "Parent"];

  return (
    <PublicSiteLayout>
      <style>{`
        .demo-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; }
        .demo-filters { display:flex; flex-wrap:wrap; justify-content:center; gap:9px; }
        .demo-player { aspect-ratio:16/9; }
        @media(max-width:900px){.demo-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
        @media(max-width:640px){
          .demo-header{padding:58px 20px 36px!important}.demo-section{padding:0 16px 72px!important}
          .demo-grid{grid-template-columns:1fr}.demo-filters{justify-content:flex-start;flex-wrap:nowrap;overflow-x:auto;padding-bottom:8px}.demo-filters button{flex:0 0 auto}
        }
      `}</style>

      <AnimatePresence>
        {showModal && activeEmbed && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: "20px" }}>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(2,8,23,.92)", backdropFilter: "blur(8px)" }} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{ position: "relative", zIndex: 1001, width: "100%", maxWidth: 1000, background: "#0F172A", borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}
            >
              <div style={{ padding: "16px 24px", background: "rgba(255,255,255,.03)", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(14,165,233,.15)", color: "#0EA5E9", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{active?.category}</span>
                  <h2 style={{ color: "white", fontSize: 16, fontWeight: 700, margin: 0 }}>{active?.title}</h2>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.05)", border: 0, color: "white", cursor: "pointer", display: "grid", placeItems: "center" }}
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="demo-player" style={{ position: "relative", width: "100%", background: "black" }}>
                <iframe
                  src={`${activeEmbed}?autoplay=1&rel=0`}
                  title={active?.title}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div style={{ padding: "20px 24px" }}>
                <p style={{ color: "rgba(255,255,255,.6)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{active?.description}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <section className="demo-header" style={{ padding: "78px 24px 46px" }}>
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 880, margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ fontSize: "clamp(34px,5vw,58px)", fontWeight: 900, lineHeight: 1.08, color: "white", margin: "0 0 16px" }}>Watch how School Manager GH works</h1>
          <p style={{ maxWidth: 740, margin: "0 auto", color: "rgba(255,255,255,.72)", fontSize: 17, lineHeight: 1.75 }}>Practical walkthroughs for school administrators, teachers, and parents.</p>
        </motion.div>
      </section>

      <section className="demo-section" style={{ padding: "0 24px 96px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <div className="demo-filters" style={{ marginBottom: 24 }}>
            {categories.map((item) => (
              <button key={item} type="button" onClick={() => setCategory(item)} style={{ padding: "10px 15px", borderRadius: 999, cursor: "pointer", border: category === item ? "1px solid #38BDF8" : "1px solid rgba(255,255,255,.12)", background: category === item ? "rgba(14,165,233,.18)" : "rgba(255,255,255,.04)", color: category === item ? "white" : "rgba(255,255,255,.65)", fontSize: 13, fontWeight: 700 }}>
                {item}
              </button>
            ))}
          </div>

          <div className="demo-grid">
            {videos.map((video, index) => {
              const playable = Boolean(getEmbedUrl(video.youtubeUrl));
              const thumbnail = getThumbnailUrl(video.youtubeUrl);

              return (
                <motion.article key={video.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .12 }} transition={{ delay: Math.min(index * .035, .2) }} style={{ display: "flex", flexDirection: "column", minHeight: 310, overflow: "hidden", borderRadius: 20, border: playable ? "1px solid rgba(56,189,248,.3)" : "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.045)", transition: "all .2s ease" }}>
                  <div 
                    onClick={() => playable && handleWatch(video)}
                    style={{ 
                      minHeight: 160, 
                      position: "relative", 
                      display: "grid", 
                      placeItems: "center", 
                      cursor: playable ? "pointer" : "default",
                      background: playable ? "linear-gradient(135deg,#0B4A82,#1160A8)" : "linear-gradient(135deg,rgba(15,23,42,.95),rgba(11,74,130,.42))",
                      overflow: "hidden"
                    }}
                  >
                    {playable && thumbnail && (
                      <img 
                        src={thumbnail} 
                        alt={video.title} 
                        style={{ 
                          position: "absolute", 
                          inset: 0, 
                          width: "100%", 
                          height: "100%", 
                          objectFit: "cover", 
                          opacity: 0.6,
                          transition: "transform .3s ease"
                        }} 
                        onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                        onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                      />
                    )}
                    <span style={{ position: "relative", zIndex: 2, width: 52, height: 52, display: "grid", placeItems: "center", borderRadius: "50%", background: playable ? "#0EA5E9" : "rgba(255,255,255,.1)", color: "white", border: "1px solid rgba(255,255,255,.15)", boxShadow: playable ? "0 0 20px rgba(14,165,233,.4)" : "none" }}>{playable ? <Play size={21} fill="currentColor"/> : <Video size={21}/>}</span>
                    <span style={{ position: "absolute", left: 12, top: 12, zIndex: 2, padding: "5px 8px", borderRadius: 999, background: "rgba(2,8,23,.75)", color: "rgba(255,255,255,.9)", fontSize: 10, fontWeight: 800, textTransform: "uppercase", backdropFilter: "blur(4px)" }}>{video.category}</span>
                    <span style={{ position: "absolute", right: 12, bottom: 12, zIndex: 2, display: "flex", alignItems: "center", gap: 5, background: "rgba(2,8,23,.75)", padding: "4px 8px", borderRadius: 6, color: "white", fontSize: 11, backdropFilter: "blur(4px)" }}><Clock3 size={12}/>{video.duration}</span>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 19 }}>
                    <h3 style={{ color: "white", fontSize: 17, lineHeight: 1.35, margin: "0 0 8px" }}>{video.title}</h3>
                    <p style={{ flex: 1, color: "rgba(255,255,255,.57)", fontSize: 13, lineHeight: 1.65, margin: "0 0 17px" }}>{video.description}</p>
                    {playable ? (
                      <button type="button" onClick={() => handleWatch(video)} style={watchButtonStyle}>
                        <Play size={14} fill="currentColor"/> Watch tutorial
                      </button>
                    ) : (
                      <div style={{ padding: "10px 12px", textAlign: "center", borderRadius: 10, border: "1px dashed rgba(255,255,255,.18)", color: "rgba(255,255,255,.45)", fontSize: 12, fontWeight: 700 }}>
                        Recording planned
                      </div>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>

          <div style={{ marginTop: 42, padding: "30px 22px", borderRadius: 24, textAlign: "center", border: "1px solid rgba(110,231,183,.18)", background: "rgba(16,185,129,.07)" }}>
            <h2 style={{ color: "white", fontSize: 23, margin: "0 0 8px" }}>Ready to explore your own workspace?</h2>
            <p style={{ color: "rgba(255,255,255,.62)", margin: "0 auto 19px", lineHeight: 1.65 }}>Register for a 30-day free trial or book a guided live demonstration.</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 11, flexWrap: "wrap" }}>
              <Link to="/get-started" style={{ ...ctaStyle, background: "#10B981" }}>Register Your School <ArrowRight size={16}/></Link>
              <Link to="/book-demo" style={{ ...ctaStyle, border: "1px solid rgba(255,255,255,.18)", background: "transparent" }}>Book a Live Demo</Link>
            </div>
          </div>
        </div>
      </section>
    </PublicSiteLayout>
  );
};

const pillStyle: React.CSSProperties = { padding: "8px 13px", borderRadius: 999, background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.72)", fontSize: 13 };
const watchButtonStyle: React.CSSProperties = { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 13px", borderRadius: 10, border: 0, background: "linear-gradient(135deg,#0EA5E9,#2563EB)", color: "white", fontWeight: 800, cursor: "pointer" };
const ctaStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 999, color: "white", fontWeight: 800, textDecoration: "none" };

export default DemoVideos;
