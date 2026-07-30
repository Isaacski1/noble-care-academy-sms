import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Clock3, MonitorPlay, Play, Video } from "lucide-react";
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
  { id: "overview", title: "Complete School Manager GH Overview", description: "Tour the platform, its dashboards, and the school operations it brings together.", category: "Getting Started", duration: "5–8 min", youtubeUrl: "" },
  { id: "workspace", title: "Create Your School Workspace", description: "Register a school, verify the administrator account, and begin the free trial.", category: "Getting Started", duration: "3–5 min", youtubeUrl: "" },
  { id: "setup", title: "Initial School Setup", description: "Configure branding, academic year, term, classes, and essential settings.", category: "Getting Started", duration: "5–7 min", youtubeUrl: "" },
  { id: "admin", title: "School Admin Dashboard Tour", description: "Understand dashboard totals, shortcuts, alerts, and management areas.", category: "School Admin", duration: "5–7 min", youtubeUrl: "" },
  { id: "people", title: "Manage Students, Classes and Teachers", description: "Add school records, organize classes, and assign teachers.", category: "School Admin", duration: "6–8 min", youtubeUrl: "" },
  { id: "fees", title: "Fees, Payments and Balances", description: "Create fee items, record payments, follow balances, and read finance reports.", category: "School Admin", duration: "6–8 min", youtubeUrl: "" },
  { id: "sms", title: "Send SMS Reminders to Parents", description: "Filter recipients by class, compose a message, review cost, and send safely.", category: "School Admin", duration: "4–6 min", youtubeUrl: "" },
  { id: "reports", title: "Reports, Users and Account Security", description: "Review reports, manage staff access, and protect accounts with MFA.", category: "School Admin", duration: "5–7 min", youtubeUrl: "" },
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

const DemoVideos = () => {
  const [category, setCategory] = useState<"All" | Category>("All");
  const [active, setActive] = useState<DemoVideo | null>(() =>
    DEMO_VIDEOS.find((video) => getEmbedUrl(video.youtubeUrl)) || null,
  );
  const videos = useMemo(
    () => category === "All" ? DEMO_VIDEOS : DEMO_VIDEOS.filter((video) => video.category === category),
    [category],
  );
  const activeEmbed = active ? getEmbedUrl(active.youtubeUrl) : null;
  const published = DEMO_VIDEOS.filter((video) => getEmbedUrl(video.youtubeUrl)).length;
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

      <section className="demo-header" style={{ padding: "78px 24px 46px" }}>
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 880, margin: "0 auto", textAlign: "center" }}>
          <p style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 13px", borderRadius: 999, background: "rgba(14,165,233,.12)", border: "1px solid rgba(125,211,252,.25)", color: "#7DD3FC", fontSize: 12, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", margin: "0 0 18px" }}><Video size={15}/> Video Academy</p>
          <h1 style={{ fontSize: "clamp(34px,5vw,58px)", fontWeight: 900, lineHeight: 1.08, color: "white", margin: "0 0 16px" }}>Watch how School Manager GH works</h1>
          <p style={{ maxWidth: 740, margin: "0 auto", color: "rgba(255,255,255,.72)", fontSize: 17, lineHeight: 1.75 }}>Practical walkthroughs for school administrators, teachers, and parents. Tutorials become playable here as soon as they are published.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 24 }}>
            <span style={pillStyle}>{DEMO_VIDEOS.length} planned tutorials</span>
            <span style={{ ...pillStyle, color: published ? "#6EE7B7" : "#FCD34D" }}>{published ? `${published} available now` : "Recordings coming soon"}</span>
          </div>
        </motion.div>
      </section>

      <section className="demo-section" style={{ padding: "0 24px 96px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          {active && activeEmbed ? (
            <div style={{ marginBottom: 34, overflow: "hidden", borderRadius: 24, border: "1px solid rgba(56,189,248,.25)", background: "#020817", boxShadow: "0 25px 70px rgba(0,0,0,.3)" }}>
              <div className="demo-player"><iframe key={activeEmbed} src={activeEmbed} title={active.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen style={{ width: "100%", height: "100%", border: 0 }}/></div>
              <div style={{ padding: 22 }}><p style={{ color: "#7DD3FC", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em", margin: "0 0 5px" }}>{active.category}</p><h2 style={{ color: "white", margin: "0 0 7px", fontSize: 22 }}>{active.title}</h2><p style={{ color: "rgba(255,255,255,.62)", margin: 0, lineHeight: 1.65 }}>{active.description}</p></div>
            </div>
          ) : (
            <div style={{ marginBottom: 34, display: "flex", gap: 17, alignItems: "center", padding: 24, borderRadius: 22, border: "1px solid rgba(125,211,252,.18)", background: "rgba(14,165,233,.07)" }}>
              <span style={{ width: 50, height: 50, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: 15, color: "#7DD3FC", background: "rgba(56,189,248,.13)" }}><MonitorPlay size={25}/></span>
              <div><h2 style={{ color: "white", fontSize: 20, margin: "0 0 5px" }}>Your recording series is ready</h2><p style={{ color: "rgba(255,255,255,.62)", fontSize: 14, lineHeight: 1.65, margin: 0 }}>Each card is a YouTube-ready placeholder. Add a video link and visitors can play it directly on this page.</p></div>
            </div>
          )}

          <div className="demo-filters" style={{ marginBottom: 24 }}>
            {categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} style={{ padding: "10px 15px", borderRadius: 999, cursor: "pointer", border: category === item ? "1px solid #38BDF8" : "1px solid rgba(255,255,255,.12)", background: category === item ? "rgba(14,165,233,.18)" : "rgba(255,255,255,.04)", color: category === item ? "white" : "rgba(255,255,255,.65)", fontSize: 13, fontWeight: 700 }}>{item}</button>)}
          </div>

          <div className="demo-grid">
            {videos.map((video, index) => {
              const playable = Boolean(getEmbedUrl(video.youtubeUrl));
              return <motion.article key={video.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .12 }} transition={{ delay: Math.min(index * .035, .2) }} style={{ display: "flex", flexDirection: "column", minHeight: 310, overflow: "hidden", borderRadius: 20, border: playable ? "1px solid rgba(56,189,248,.3)" : "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.045)" }}>
                <div style={{ minHeight: 128, position: "relative", display: "grid", placeItems: "center", background: playable ? "linear-gradient(135deg,#0B4A82,#1160A8)" : "linear-gradient(135deg,rgba(15,23,42,.95),rgba(11,74,130,.42))" }}>
                  <span style={{ width: 52, height: 52, display: "grid", placeItems: "center", borderRadius: "50%", background: playable ? "#0EA5E9" : "rgba(255,255,255,.1)", color: "white", border: "1px solid rgba(255,255,255,.15)" }}>{playable ? <Play size={21} fill="currentColor"/> : <Video size={21}/>}</span>
                  <span style={{ position: "absolute", left: 12, top: 12, padding: "5px 8px", borderRadius: 999, background: "rgba(2,8,23,.65)", color: "rgba(255,255,255,.8)", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{video.category}</span>
                  <span style={{ position: "absolute", right: 12, bottom: 12, display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,.68)", fontSize: 11 }}><Clock3 size={12}/>{video.duration}</span>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 19 }}><h3 style={{ color: "white", fontSize: 17, lineHeight: 1.35, margin: "0 0 8px" }}>{video.title}</h3><p style={{ flex: 1, color: "rgba(255,255,255,.57)", fontSize: 13, lineHeight: 1.65, margin: "0 0 17px" }}>{video.description}</p>
                  {playable ? <button type="button" onClick={() => { setActive(video); window.scrollTo({ top: 220, behavior: "smooth" }); }} style={watchButtonStyle}><Play size={14} fill="currentColor"/> Watch tutorial</button> : <div style={{ padding: "10px 12px", textAlign: "center", borderRadius: 10, border: "1px dashed rgba(255,255,255,.18)", color: "rgba(255,255,255,.45)", fontSize: 12, fontWeight: 700 }}>Recording planned</div>}
                </div>
              </motion.article>;
            })}
          </div>

          <div style={{ marginTop: 42, padding: "30px 22px", borderRadius: 24, textAlign: "center", border: "1px solid rgba(110,231,183,.18)", background: "rgba(16,185,129,.07)" }}><h2 style={{ color: "white", fontSize: 23, margin: "0 0 8px" }}>Ready to explore your own workspace?</h2><p style={{ color: "rgba(255,255,255,.62)", margin: "0 auto 19px", lineHeight: 1.65 }}>Register for a 30-day free trial or book a guided live demonstration.</p><div style={{ display: "flex", justifyContent: "center", gap: 11, flexWrap: "wrap" }}><Link to="/get-started" style={{ ...ctaStyle, background: "#10B981" }}>Register Your School <ArrowRight size={16}/></Link><Link to="/book-demo" style={{ ...ctaStyle, border: "1px solid rgba(255,255,255,.18)", background: "transparent" }}>Book a Live Demo</Link></div></div>
        </div>
      </section>
    </PublicSiteLayout>
  );
};

const pillStyle: React.CSSProperties = { padding: "8px 13px", borderRadius: 999, background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.72)", fontSize: 13 };
const watchButtonStyle: React.CSSProperties = { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 13px", borderRadius: 10, border: 0, background: "linear-gradient(135deg,#0EA5E9,#2563EB)", color: "white", fontWeight: 800, cursor: "pointer" };
const ctaStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 999, color: "white", fontWeight: 800, textDecoration: "none" };

export default DemoVideos;
