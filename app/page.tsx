"use client";

          import { zodResolver } from "@hookform/resolvers/zod";
          import { AnimatePresence, motion } from "framer-motion";
          import {
            ArrowDownToLine,
            ArrowRight,
            ArrowUpRight,
            Check,
            ChevronDown,
            CircleHelp,
            FileText,
            BriefcaseBusiness,
            GraduationCap,
            LayoutDashboard,
            Plus,
            Settings2,
            ShieldCheck,
            Sparkles,
            Trash2,
            WandSparkles,
            X,
          } from "lucide-react";
          import { useEffect, useState } from "react";
          import { useFieldArray, useForm, useWatch, type FieldPath, type UseFormRegister } from "react-hook-form";
          import { z } from "zod";

          const resumeSchema = z.object({
            fullName: z.string().max(80),
            role: z.string().max(100),
            email: z.string().max(120),
            phone: z.string().max(40),
            location: z.string().max(100),
            linkedin: z.string().max(160),
            careerStage: z.enum(["professional", "student"]),
            targetRole: z.string().max(120),
            jobDescription: z.string().max(6000),
            summary: z.string().max(700),
            skills: z.string().max(500),
            experienceTitle: z.string().max(120),
            company: z.string().max(120),
            experienceDates: z.string().max(80),
            experience: z.string().max(900),
            education: z.string().max(180),
            school: z.string().max(140),
            educationDates: z.string().max(80),
            projectName: z.string().max(120),
            projectDescription: z.string().max(600),
            achievements: z.string().max(1200),
            certifications: z.string().max(800),
            additionalExperience: z.array(z.object({
              title: z.string().max(120),
              company: z.string().max(120),
              dates: z.string().max(80),
              details: z.string().max(900),
            })).max(8),
          });
          type ResumeData = z.infer<typeof resumeSchema>;
          type Template = "professional" | "minimal" | "student";
          type ResumeDocument = { id: string; data: ResumeData; updatedAt: string };
          type Dialog = "help" | "workspace" | "resumes" | "privacy" | null;

          const emptyResume: ResumeData = {
            fullName: "",
            role: "",
            email: "",
            phone: "",
            location: "",
            linkedin: "",
            careerStage: "professional",
            targetRole: "",
            jobDescription: "",
            summary: "",
            skills: "",
            experienceTitle: "",
            company: "",
            experienceDates: "",
            experience: "",
            education: "",
            school: "",
            educationDates: "",
            projectName: "",
            projectDescription: "",
            achievements: "",
            certifications: "",
            additionalExperience: [],
          };

          const WORKSPACE_KEY = "resumeforge.workspace.v2";
          const LEGACY_RESUME_KEY = "resumeforge.resume.v1";
          const TEMPLATE_KEY = "resumeforge.template.v1";

          function migrateResumeData(value: unknown): ResumeData | null {
            const parsed = resumeSchema.partial().safeParse(value);
            if (!parsed.success) return null;
            return {
              ...emptyResume,
              ...parsed.data,
              additionalExperience: parsed.data.additionalExperience ?? [],
            };
          }

          function makeDocument(data: ResumeData = emptyResume): ResumeDocument {
            return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, data: { ...data }, updatedAt: new Date().toISOString() };
          }

          function getInitials(name: string) {
            return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "?").join("") || "?";
          }

          function getAtsReport(data: ResumeData) {
            const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim());
            const contactFields = [data.fullName.trim(), validEmail, data.phone.trim()].filter(Boolean).length;
            const skills = [...new Set(data.skills.split(",").map((skill) => skill.trim().toLowerCase()).filter(Boolean))];
            const hasProject = Boolean(data.projectName.trim() && data.projectDescription.trim());
            const hasPartialProject = Boolean(data.projectName.trim() || data.projectDescription.trim());
            const hasExperience = Boolean(
              data.experienceTitle.trim() && data.company.trim() && data.experience.trim(),
            ) || data.additionalExperience.some((entry) => entry.title.trim() && entry.company.trim() && entry.details.trim());
            const allExperience = [data.experience, ...data.additionalExperience.map((entry) => entry.details)].join(" ");
            const evidence = [
              data.role, data.summary, data.skills, data.experienceTitle, data.company, allExperience,
              data.projectName, data.projectDescription, data.achievements, data.certifications,
            ].join(" ").toLowerCase();
            const stopWords = new Set([
              "about", "after", "also", "and", "are", "all", "any", "for", "from", "has",
              "have", "how", "into", "its", "our", "out", "per", "the", "their", "this",
              "through", "with", "will", "you", "your", "who", "what", "when", "where",
              "which", "while", "years", "year", "work", "team", "role", "must", "can",
              "able", "using", "ability", "strong", "including", "such", "within", "need",
            ]);
            const jobTerms = [...new Set([
              ...(data.jobDescription.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) ?? []),
              ...(data.targetRole.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) ?? []),
            ].filter((term) => !stopWords.has(term)))];
            const matchedTerms = jobTerms.filter((term) => {
              const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              return new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, "i").test(evidence);
            });
            const keywordMatch = data.jobDescription.trim() && jobTerms.length
              ? Math.round((matchedTerms.length / jobTerms.length) * 100)
              : null;
            const hasEducation = Boolean(data.education.trim() && data.school.trim());
            const hasImpact = /\b\d+(?:[.,]\d+)?%?\b|\$\s?\d/.test(`${allExperience} ${data.projectDescription} ${data.achievements}`);
            const summaryScore = data.summary.trim().length >= 80 ? 15 : data.summary.trim().length >= 40 ? 10 : data.summary.trim() ? 5 : 0;
            const evidenceScore = data.careerStage === "student"
              ? hasProject ? 25 : hasPartialProject ? 13 : 0
              : hasExperience ? 25 : allExperience.trim() ? 14 : hasProject ? 10 : 0;
            const score = Math.round(
              (contactFields / 3) * 15 +
              summaryScore +
              evidenceScore +
              Math.min(skills.length / 5, 1) * 15 +
              (hasEducation ? 10 : data.education.trim() || data.school.trim() ? 5 : 0) +
              (hasImpact ? 10 : 0) +
              (keywordMatch === null ? 10 : (keywordMatch / 100) * 10),
            );
            const hasContact = contactFields === 3;
            const hasSummary = data.summary.trim().length >= 40;
            const hasSkills = skills.length >= 5;
            const hasEvidence = data.careerStage === "student" ? hasProject : hasExperience || hasProject;
            const hasJobMatch = keywordMatch === null || keywordMatch >= 50;
            const checks = [
              { label: "Contact details and valid email", complete: hasContact },
              { label: "A focused professional summary", complete: hasSummary },
              { label: "At least five relevant skills", complete: hasSkills },
              { label: data.careerStage === "student" ? "A project with a clear outcome" : "Role details and achievement bullets", complete: hasEvidence },
              { label: "Education and institution", complete: hasEducation },
              { label: "Numbers that show your impact", complete: hasImpact },
              { label: "Relevant terms from the job post", complete: hasJobMatch },
            ];
            const suggestions = [
              ...(!data.fullName.trim() ? ["Add your name so recruiters can identify your resume."] : []),
              ...(!validEmail ? ["Add a valid professional email address."] : []),
              ...(!hasSummary ? ["Add a focused summary of your strengths and the role you want."] : []),
              ...(skills.length < 5 ? ["Add at least five relevant skills, using the wording from the role where it fits."] : []),
              ...(data.careerStage === "student" && !hasProject ? ["Add a class, personal, or volunteer project to show what you can do."] : []),
              ...(data.careerStage === "professional" && !hasExperience ? ["Add a role with achievement bullets; a project can help if you are changing careers."] : []),
              ...(!hasEducation ? ["Add your qualification and school or training provider."] : []),
              ...(!hasImpact ? ["Add a truthful number or result to show the scale of your impact."] : []),
              ...(keywordMatch !== null && matchedTerms.length < jobTerms.length
                ? [`Only add these job-post terms if they accurately describe your experience: ${jobTerms.filter((term) => !matchedTerms.includes(term)).slice(0, 4).join(", ")}.`]
                : []),
            ];
            return { score: Math.min(score, 100), suggestions: suggestions.slice(0, 4), checks, keywordMatch, matchedTerms, totalTerms: jobTerms.length };
          }

          function Field({
            label,
            name,
            register,
            placeholder,
            multiline = false,
            hint,
          }: {
            label: string;
            name: FieldPath<ResumeData>;
            register: UseFormRegister<ResumeData>;
            placeholder?: string;
            multiline?: boolean;
            hint?: string;
          }) {
            const common = { id: name, ...register(name), placeholder };
            return (
              <label className="field" htmlFor={name}>
                <span className="field-label">{label}</span>
                {multiline ? <textarea {...common} rows={3} /> : <input {...common} />}
                {hint && <span className="field-hint">{hint}</span>}
              </label>
            );
          }

          function ResumePreview({ data, template }: { data: ResumeData; template: Template }) {
            const skills = data.skills.split(",").map((skill) => skill.trim()).filter(Boolean);
            const hasPrimaryExperience = Boolean(data.experienceTitle || data.company || data.experience);
            const additionalExperience = data.additionalExperience.filter((entry) => entry.title || entry.company || entry.details);
            return (
              <article className={`resume-paper template-${template}`} aria-label="Live resume preview">
                <header className="resume-header">
                  <h1>{data.fullName || "Your name"}</h1>
                  <p className="resume-role">{data.role || "Your professional title"}</p>
                  <div className="resume-contact">
                    {[data.email, data.phone, data.location, data.linkedin].filter(Boolean).map((item) => <span key={item}>{item}</span>)}
                  </div>
                </header>
                {data.summary && <section className="resume-section"><h2>Profile</h2><p>{data.summary}</p></section>}
                {skills.length > 0 && <section className="resume-section"><h2>Core skills</h2><p>{skills.join("  ·  ")}</p></section>}
                {hasPrimaryExperience && (
                  <section className="resume-section">
                    <h2>Experience</h2>
                    <div className="resume-entry-heading"><strong>{data.experienceTitle || "Role"}</strong><span>{data.experienceDates}</span></div>
                    <div className="resume-entry-heading resume-muted"><span>{data.company || "Company"}</span></div>
                    {data.experience && <ul>{data.experience.split("\n").filter(Boolean).map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>}
                  </section>
                )}
                {additionalExperience.map((entry, index) => (
                  (entry.title || entry.company || entry.details) && (
                    <section className="resume-section" key={`experience-${index}`}>
                      {!hasPrimaryExperience && index === 0 && <h2>Experience</h2>}
                      <div className="resume-entry-heading"><strong>{entry.title || "Role"}</strong><span>{entry.dates}</span></div>
                      <div className="resume-entry-heading resume-muted"><span>{entry.company}</span></div>
                      {entry.details && <ul>{entry.details.split("\n").filter(Boolean).map((item, bulletIndex) => <li key={`${bulletIndex}-${item}`}>{item}</li>)}</ul>}
                    </section>
                  )
                ))}
                {(data.projectName || data.projectDescription) && <section className="resume-section"><h2>Selected project</h2><strong>{data.projectName || "Project name"}</strong>{data.projectDescription && <p>{data.projectDescription}</p>}</section>}
                {data.achievements && <section className="resume-section"><h2>Achievements</h2><ul>{data.achievements.split("\n").filter(Boolean).map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></section>}
                {data.certifications && <section className="resume-section"><h2>Certifications</h2><ul>{data.certifications.split("\n").filter(Boolean).map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></section>}
                {(data.education || data.school) && (
                  <section className="resume-section"><h2>Education</h2><div className="resume-entry-heading"><strong>{data.education || "Degree"}</strong><span>{data.educationDates}</span></div><p className="resume-muted">{data.school}</p></section>
                )}
              </article>
            );
          }

          function WelcomePage({ onStart }: { onStart: () => void }) {
            return (
              <main className="welcome-page">
                <header className="welcome-nav">
                  <a className="welcome-brand" href="#home" aria-label="ResumeForge home">
                    <span className="welcome-brand-mark"><FileText size={17} /></span>
                    <span>resume<span>forge</span></span>
                  </a>
                  <div className="welcome-nav-right"><span><span className="welcome-status-dot" />Free to use</span><button className="welcome-nav-cta" onClick={onStart}>Open builder <ArrowRight size={15} /></button></div>
                </header>

                <section className="welcome-hero" id="home">
                  <div className="welcome-copy">
                    <div className="welcome-eyebrow"><Sparkles size={14} /> YOUR NEXT OPPORTUNITY STARTS HERE</div>
                    <h1>Make your experience <em>impossible to miss.</em></h1>
                    <p className="welcome-description">Starting from scratch or making your next move? Build a student or professional resume, get practical ATS-readiness guidance, and download a polished PDF for free.</p>
                    <div className="welcome-actions"><button className="welcome-primary" onClick={onStart}>Let’s build <ArrowRight size={17} /></button><span>No account needed</span></div>
                    <div className="welcome-proof"><ShieldCheck size={17} /><span>Your drafts stay in this browser. You decide what to share.</span></div>
                  </div>

                  <div className="welcome-visual" aria-label="Preview of the resume builder">
                    <div className="visual-topline"><span><i />RESUMEFORGE WORKSPACE</span><span>LIVE PREVIEW</span></div>
                    <div className="visual-canvas">
                      <article className="visual-resume">
                        <div className="visual-resume-overline">YOUR NEXT CHAPTER</div>
                        <h2>Your Name</h2><p className="visual-role">Your professional title</p>
                        <div className="visual-contact"><span>your@email.com</span><span>City, Country</span></div>
                        <div className="visual-rule" />
                        <div className="visual-section"><strong>PROFILE</strong><span /></div>
                        <div className="visual-lines"><i /><i /><i className="short" /></div>
                        <div className="visual-section"><strong>EXPERIENCE</strong><span /></div>
                        <div className="visual-experience"><b>Recent role</b><small>Company · 2022 – Present</small></div>
                        <div className="visual-lines"><i /><i /><i className="short" /></div>
                        <div className="visual-section"><strong>SKILLS</strong><span /></div>
                        <div className="visual-skills"><i /><i /><i /><i /></div>
                      </article>
                      <div className="visual-score"><div className="visual-score-icon"><Sparkles size={17} /></div><div><strong>ATS-friendly feedback</strong><span>Suggestions as you write</span></div><div className="visual-score-mark"><span /></div></div>
                      <div className="visual-note"><span>01</span> Thoughtful structure. Your voice.</div>
                    </div>
                    <div className="visual-footer"><span>PROFESSIONAL TEMPLATE</span><span>BUILT AROUND YOU</span></div>
                  </div>
                </section>

                <section className="welcome-benefits" aria-label="ResumeForge features">
                  <div><span className="benefit-index">01</span><strong>Built for your next step</strong><p>Choose student or professional prompts that fit your experience.</p></div>
                  <div><span className="benefit-index">02</span><strong>See it take shape</strong><p>A live preview that updates as you build.</p></div>
                  <div><span className="benefit-index">03</span><strong>Leave ready to apply</strong><p>ATS feedback and a print-ready PDF.</p></div>
                </section>
                <footer className="welcome-footer"><span>ResumeForge</span><span>Make the next move yours.</span></footer>
              </main>
            );
          }

          export default function Home() {
            const [template, setTemplate] = useState<Template>("professional");
            const [saveState, setSaveState] = useState<"loading" | "saving" | "saved" | "error">("loading");
            const [hydrated, setHydrated] = useState(false);
            const [started, setStarted] = useState(false);
            const [documents, setDocuments] = useState<ResumeDocument[]>([]);
            const [activeId, setActiveId] = useState("");
            const [dialog, setDialog] = useState<Dialog>(null);
            const { register, control, reset, setValue } = useForm<ResumeData>({
              resolver: zodResolver(resumeSchema),
              defaultValues: emptyResume,
              mode: "onChange",
            });
            const { fields: additionalExperienceFields, append: addExperience, remove: removeExperience } = useFieldArray({
              control,
              name: "additionalExperience",
            });
            const data = useWatch({ control }) as ResumeData;
            const activeDocument = documents.find((document) => document.id === activeId);
            const displayName = data.fullName.trim() || "Personal";
            const documentTitle = data.fullName.trim() ? `${data.fullName.trim()}’s Resume` : "Untitled resume";
            const report = getAtsReport(data);
            const completionFields = Object.entries(data).filter(([field]) =>
              !["careerStage", "targetRole", "jobDescription", "additionalExperience"].includes(field),
            );
            const completedFields = completionFields.filter(([, value]) => typeof value === "string" && value.trim()).length +
              (data.additionalExperience.some((entry) => entry.title || entry.company || entry.details) ? 1 : 0);
            const completion = Math.round((completedFields / (completionFields.length + 1)) * 100);

            useEffect(() => {
              try {
                const stored = localStorage.getItem(WORKSPACE_KEY);
                let loadedDocuments: ResumeDocument[] = [];
                let loadedActiveId = "";
                if (stored) {
                  const parsed = JSON.parse(stored) as { documents?: unknown; activeId?: unknown; template?: unknown };
                  if (Array.isArray(parsed.documents)) {
                    loadedDocuments = parsed.documents.flatMap((item): ResumeDocument[] => {
                      if (!item || typeof item !== "object") return [];
                      const entry = item as { id?: unknown; data?: unknown; updatedAt?: unknown };
                      const migratedData = migrateResumeData(entry.data);
                      return typeof entry.id === "string" && migratedData
                        ? [{ id: entry.id, data: migratedData, updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString() }]
                        : [];
                    });
                    if (typeof parsed.activeId === "string") loadedActiveId = parsed.activeId;
                    if (parsed.template === "minimal" || parsed.template === "professional" || parsed.template === "student") setTemplate(parsed.template);
                  }
                }
                if (loadedDocuments.length === 0) {
                  const legacy = localStorage.getItem(LEGACY_RESUME_KEY);
                  const migratedLegacy = legacy ? migrateResumeData(JSON.parse(legacy)) : null;
                  loadedDocuments = [makeDocument(migratedLegacy ?? emptyResume)];
                  loadedActiveId = loadedDocuments[0].id;
                  const storedTemplate = localStorage.getItem(TEMPLATE_KEY);
                  if (storedTemplate === "minimal" || storedTemplate === "professional" || storedTemplate === "student") setTemplate(storedTemplate);
                }
                if (!loadedDocuments.some((document) => document.id === loadedActiveId)) loadedActiveId = loadedDocuments[0].id;
                setDocuments(loadedDocuments);
                setActiveId(loadedActiveId);
                reset(loadedDocuments.find((document) => document.id === loadedActiveId)?.data ?? emptyResume);
              } catch {
                const newActiveId = `${Date.now()}-recovered`;
                setDocuments([{ id: newActiveId, data: { ...emptyResume }, updatedAt: new Date().toISOString() }]);
                setActiveId(newActiveId);
                reset(emptyResume);
              }
              setHydrated(true);
            }, [reset]);

            useEffect(() => {
              if (!hydrated || !activeId) return;
              setDocuments((current) => current.map((document) => {
                if (document.id !== activeId || JSON.stringify(document.data) === JSON.stringify(data)) return document;
                return { ...document, data, updatedAt: new Date().toISOString() };
              }));
            }, [activeId, data, hydrated]);

            useEffect(() => {
              if (!hydrated) return;
              setSaveState("saving");
              const timer = window.setTimeout(() => {
                try {
                  localStorage.setItem(WORKSPACE_KEY, JSON.stringify({ documents, activeId, template }));
                  localStorage.removeItem(LEGACY_RESUME_KEY);
                  localStorage.removeItem(TEMPLATE_KEY);
                  setSaveState("saved");
                } catch {
                  setSaveState("error");
                }
              }, 350);
              return () => window.clearTimeout(timer);
            }, [activeId, documents, hydrated, template]);

            useEffect(() => {
              if (!dialog) return;
              const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setDialog(null); };
              window.addEventListener("keydown", closeOnEscape);
              return () => window.removeEventListener("keydown", closeOnEscape);
            }, [dialog]);

            useEffect(() => {
              const handleHistory = () => setStarted(window.location.hash === "#builder");
              handleHistory();
              window.addEventListener("popstate", handleHistory);
              return () => window.removeEventListener("popstate", handleHistory);
            }, []);

            function openBuilder() {
              window.history.pushState(null, "", "#builder");
              setStarted(true);
            }

            function createResume() {
              const newDocument = makeDocument();
              setDocuments((current) => [...current, newDocument]);
              setActiveId(newDocument.id);
              reset(emptyResume);
              setDialog(null);
              window.document.getElementById("editor")?.scrollIntoView({ behavior: "smooth" });
            }

            function selectResume(document: ResumeDocument) {
              setActiveId(document.id);
              reset(document.data);
              setDialog(null);
            }

            function deleteResume(id: string) {
              const remaining = documents.filter((document) => document.id !== id);
              if (remaining.length === 0) remaining.push(makeDocument());
              setDocuments(remaining);
              if (id === activeId) {
                setActiveId(remaining[0].id);
                reset(remaining[0].data);
              }
            }

            if (!started) return <WelcomePage onStart={openBuilder} />;

            return (
              <main className="app-shell">
                <aside className="sidebar">
                  <a className="brand-lockup" href="#workspace" aria-label="ResumeForge home">
                    <span className="brand-mark"><span /></span><span>resume<span className="brand-light">forge</span></span>
                  </a>
                  <button className="workspace-switcher" onClick={() => setDialog("workspace")}><span className="workspace-avatar">{getInitials(data.fullName)}</span><span><strong>{displayName === "Personal" ? "Personal workspace" : `${displayName}’s workspace`}</strong><small>This browser only</small></span><ChevronDown size={15} /></button>
                  <div className="nav-caption">WORKSPACE</div>
                  <nav className="sidebar-nav" aria-label="Main navigation">
                    <a className="nav-item active" href="#workspace"><LayoutDashboard size={17} />Dashboard</a>
                    <button className="nav-item nav-button" onClick={() => setDialog("resumes")}><FileText size={17} />My resumes<span className="nav-count">{documents.length}</span></button>
                    <a className="nav-item" href="#templates"><Settings2 size={17} />Templates</a>
                  </nav>
                  <div className="sidebar-bottom">
                    <div className="sidebar-tip"><Sparkles size={16} /><strong>Make every word count.</strong><p>Clear, specific details help your experience stand out.</p><a href="#analysis">View writing tips <ArrowUpRight size={13} /></a></div>
                    <button className="nav-item nav-button" onClick={() => setDialog("help")}><CircleHelp size={17} />Help & support</button>
                    <button className="profile-row profile-button" onClick={() => setDialog("workspace")}><span className="profile-avatar">{getInitials(data.fullName)}</span><span><strong>{data.fullName.trim() || "Name not set"}</strong><small>Local workspace</small></span><Settings2 size={16} /></button>
                  </div>
                </aside>

                <section className="main-area" id="workspace">
                  <header className="topbar">
                    <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>Resume builder</strong></div>
                    <div className="topbar-actions"><span className={`autosave save-${saveState}`} role="status" title="Resumes are saved in this browser only"><span className="save-dot">{saveState === "saved" ? <Check size={10} /> : null}</span>{saveState === "loading" ? "Loading" : saveState === "saving" ? "Saving…" : saveState === "error" ? "Save failed" : "Saved on this device"}</span><button className="icon-button help-button" title="Help" aria-label="Help" onClick={() => setDialog("help")}><CircleHelp size={18} /></button><span className="top-avatar">{getInitials(data.fullName)}</span></div>
                  </header>

                  <div className="page-content">
                    <motion.div className="page-heading" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                      <div><div className="eyebrow"><span className="eyebrow-line" />YOUR CAREER, WELL PRESENTED</div><h1>Good work deserves a <em>great resume.</em></h1><p>Build a polished, ATS-ready resume that sounds like you.</p></div>
                      <button className="primary-button" onClick={() => window.print()}><ArrowDownToLine size={16} />Export PDF</button>
                    </motion.div>

                    <div className="summary-strip">
                      <div className="summary-item"><span className="summary-icon blue"><FileText size={17} /></span><span><small>Current document</small><strong>{documentTitle}</strong></span></div>
                      <span className="summary-divider" />
                      <div className="summary-item score-summary"><span className="score-ring" style={{ "--score": `${report.score}%` } as React.CSSProperties}><span>{report.score}</span></span><span><small>ATS readiness estimate</small><strong>{report.score >= 80 ? "Looking strong" : "Room to improve"}</strong></span></div>
                      <span className="summary-divider" />
                      <div className="summary-item"><span className="summary-icon green"><ShieldCheck size={17} /></span><span><small>Last edited</small><strong>{activeDocument ? new Date(activeDocument.updatedAt).toLocaleString() : "Not saved yet"}</strong></span></div>
                    </div>

                    <div className="builder-toolbar" id="editor">
                      <div className="builder-title"><div className="document-icon"><FileText size={18} /></div><div><h2>{documentTitle}</h2><span>{saveState === "error" ? "Could not save. Check browser storage settings." : "Autosaved in this browser"}</span></div></div>
                      <div className="toolbar-actions"><button className="secondary-button" onClick={createResume}><Plus size={15} />New resume</button><button className="primary-button small" onClick={() => window.print()}><ArrowDownToLine size={15} /><span>Download</span></button></div>
                    </div>

                    <div className="builder-grid">
                      <motion.section className="editor-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
                        <div className="panel-heading"><div><span className="section-kicker">YOUR DETAILS</span><h2>Resume content</h2></div><button className="text-button" title="Clear this resume" onClick={() => reset(emptyResume)}>Start fresh</button></div>
                        <div className="progress-row"><div className="progress-track"><span style={{ width: `${Math.max(8, completion)}%` }} /></div><span>{completion}% complete</span></div>
                        <div className="career-path-picker" role="group" aria-label="Choose your career stage">
                          <span><strong>Where are you in your career?</strong><small>We’ll tailor the prompts to your experience.</small></span>
                          <div>
                            <button type="button" className={data.careerStage === "student" ? "career-path-option selected" : "career-path-option"} aria-pressed={data.careerStage === "student"} onClick={() => setValue("careerStage", "student", { shouldDirty: true })}><GraduationCap size={15} />Student / first resume</button>
                            <button type="button" className={data.careerStage === "professional" ? "career-path-option selected" : "career-path-option"} aria-pressed={data.careerStage === "professional"} onClick={() => setValue("careerStage", "professional", { shouldDirty: true })}><BriefcaseBusiness size={15} />Professional</button>
                          </div>
                        </div>
                        <form className="resume-form">
                          <details open className="form-section"><summary><span className="step-number">01</span><span><strong>Personal information</strong><small>How employers can reach you</small></span><ChevronDown size={16} /></summary><div className="form-fields"><div className="field-grid"><Field label="Full name" name="fullName" register={register} placeholder="e.g. L Sadiya Ashrafi" /><Field label="Professional title" name="role" register={register} placeholder="e.g. Product Designer" /></div><div className="field-grid"><Field label="Email address" name="email" register={register} placeholder="you@email.com" /><Field label="Phone number" name="phone" register={register} placeholder="+1 (555) 000-0000" /></div><div className="field-grid"><Field label="Location" name="location" register={register} placeholder="City, Country" /><Field label="LinkedIn profile" name="linkedin" register={register} placeholder="linkedin.com/in/you" /></div></div></details>
                          <details open className="form-section"><summary><span className="step-number">02</span><span><strong>Professional summary</strong><small>A focused introduction to your work</small></span><ChevronDown size={16} /></summary><div className="form-fields"><Field label="Summary" name="summary" register={register} multiline placeholder="Share your experience, strengths, and the impact you bring..." hint="Aim for 2–4 sentences. Use specific, measurable outcomes where you can." /></div></details>
                          <details open className="form-section"><summary><span className="step-number">03</span><span><strong>{data.careerStage === "student" ? "Experience (optional)" : "Experience"}</strong><small>{data.careerStage === "student" ? "Include internships, part-time work, or volunteering" : "Show the impact behind your work"}</small></span><ChevronDown size={16} /></summary><div className="form-fields"><div className="field-grid"><Field label="Job title" name="experienceTitle" register={register} placeholder="e.g. Product Designer" /><Field label="Company" name="company" register={register} placeholder="Company name" /></div><Field label="Dates" name="experienceDates" register={register} placeholder="2022 — Present" /><Field label="Achievements & responsibilities" name="experience" register={register} multiline placeholder="One achievement per line. Start with a strong action verb..." hint="Add numbers where possible: revenue, time saved, users reached, or growth." />
                            {additionalExperienceFields.map((field, index) => <div className="repeatable-entry" key={field.id}><div className="repeatable-entry-heading"><strong>Additional role {index + 1}</strong><button type="button" className="remove-entry-button" onClick={() => removeExperience(index)} aria-label={`Remove additional role ${index + 1}`}><Trash2 size={14} />Remove</button></div><div className="field-grid"><Field label="Job title" name={`additionalExperience.${index}.title`} register={register} placeholder="e.g. Project Intern" /><Field label="Company" name={`additionalExperience.${index}.company`} register={register} placeholder="Company or organization" /></div><Field label="Dates" name={`additionalExperience.${index}.dates`} register={register} placeholder="Summer 2024" /><Field label="Achievements & responsibilities" name={`additionalExperience.${index}.details`} register={register} multiline placeholder="One achievement per line..." /></div>)}
                            <button type="button" className="add-entry-button" disabled={additionalExperienceFields.length >= 8} onClick={() => addExperience({ title: "", company: "", dates: "", details: "" })}><Plus size={14} />{additionalExperienceFields.length >= 8 ? "Maximum of 8 additional roles" : "Add another role"}</button>
                          </div></details>
                          <details className="form-section"><summary><span className="step-number">04</span><span><strong>Education</strong><small>Degrees, training, and coursework</small></span><ChevronDown size={16} /></summary><div className="form-fields"><div className="field-grid"><Field label="Degree or qualification" name="education" register={register} placeholder="e.g. BFA, Communication Design" /><Field label="Institution" name="school" register={register} placeholder="School or university" /></div><Field label="Dates" name="educationDates" register={register} placeholder="2017 — 2021" /></div></details>
                          <details className="form-section"><summary><span className="step-number">05</span><span><strong>Skills</strong><small>Relevant strengths and tools</small></span><ChevronDown size={16} /></summary><div className="form-fields"><Field label="Skills" name="skills" register={register} placeholder="Figma, Research, Prototyping..." hint="Separate each skill with a comma. Tailor this list to the role." /></div></details>
                          <details className="form-section"><summary><span className="step-number">06</span><span><strong>Projects</strong><small>Work that shows what you can do</small></span><ChevronDown size={16} /></summary><div className="form-fields"><Field label="Project name" name="projectName" register={register} placeholder="e.g. Fieldnotes" /><Field label="Project description" name="projectDescription" register={register} multiline placeholder="What did you build, and what changed because of it?" /></div></details>
                          <details className="form-section"><summary><span className="step-number">07</span><span><strong>Achievements & certifications</strong><small>Recognition, courses, and credentials</small></span><ChevronDown size={16} /></summary><div className="form-fields"><Field label="Achievements" name="achievements" register={register} multiline placeholder="One award, achievement, or leadership example per line..." /><Field label="Certifications & training" name="certifications" register={register} multiline placeholder="One certification or course per line..." /></div></details>
                        </form>
                        <div className="editor-footnote"><ShieldCheck size={15} /><span>Your resume stays in this browser. You control what you share.</span></div>
                      </motion.section>

                      <motion.aside className="preview-column" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.16 }}>
                        <div className="preview-heading"><div><span className="section-kicker">LIVE PREVIEW</span><h2>Your resume</h2></div><button className="icon-button" title="Download as PDF" aria-label="Download as PDF" onClick={() => window.print()}><ArrowDownToLine size={17} /></button></div>
                        <div className="template-switch" id="templates"><span>Choose style</span><div role="group" aria-label="Resume template"><button aria-pressed={template === "professional"} className={template === "professional" ? "template-option selected" : "template-option"} onClick={() => setTemplate("professional")}><span className="template-thumb professional-thumb"><i /><i /><i /><i /></span><span>Professional</span></button><button aria-pressed={template === "minimal"} className={template === "minimal" ? "template-option selected" : "template-option"} onClick={() => setTemplate("minimal")}><span className="template-thumb minimal-thumb"><i /><i /><i /><i /></span><span>Minimal</span></button><button aria-pressed={template === "student"} className={template === "student" ? "template-option selected" : "template-option"} onClick={() => setTemplate("student")}><span className="template-thumb student-thumb"><i /><i /><i /><i /></span><span>Student</span></button></div></div>
                        <div className="paper-stage"><AnimatePresence mode="wait"><motion.div key={template} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.2 }}><ResumePreview data={data} template={template} /></motion.div></AnimatePresence></div>
                        <div className="analysis-panel" id="analysis">
                          <div className="analysis-heading"><span className="analysis-spark"><WandSparkles size={16} /></span><div><h3>ATS readiness check</h3><span>A transparent, on-device checklist</span></div><strong className="analysis-score">{report.score}<small>/100</small></strong></div>
                          <div className="analysis-bar"><span style={{ width: `${report.score}%` }} /></div>
                          <details className="job-match-details"><summary><span><strong>Match a job description</strong><small>{report.keywordMatch === null ? "Add a role and paste a job post" : `${report.keywordMatch}% keyword overlap`}</small></span><ChevronDown size={15} /></summary><div className="job-match-fields"><Field label="Target job title" name="targetRole" register={register} placeholder="e.g. Junior UX Designer" /><Field label="Paste the job description" name="jobDescription" register={register} multiline placeholder="Paste a job description to compare key terms..." hint="Compared locally in this browser; the text is not uploaded." /></div></details>
                          {report.keywordMatch !== null && <div className="keyword-match"><span>Job post keyword overlap</span><strong>{report.keywordMatch}%</strong><small>{report.matchedTerms.length} of {report.totalTerms} distinct terms found</small></div>}
                          <div className="ats-checks">{report.checks.map((check) => <div className={check.complete ? "ats-check complete" : "ats-check"} key={check.label}><span>{check.complete ? <Check size={11} /> : <span className="ats-check-empty" />}</span>{check.label}</div>)}</div>
                          {report.suggestions.length > 0 ? <ul className="suggestion-list">{report.suggestions.map((suggestion) => <li key={suggestion}><ArrowUpRight size={13} />{suggestion}</li>)}</ul> : <p className="all-clear"><Check size={14} />Strong start. Keep tailoring this resume to each role.</p>}
                          <a className="analysis-link" href="#editor">Improve your score <ArrowUpRight size={14} /></a>
                        </div>
                        <p className="preview-disclaimer"><CircleHelp size={13} />A writing estimate—not a real ATS simulation or hiring guarantee.</p>
                      </motion.aside>
                    </div>
                    <footer className="page-footer"><span>ResumeForge <span>·</span> {displayName === "Personal" ? "Your local resume workspace" : `Created for ${displayName}`}</span><button onClick={() => setDialog("privacy")}>Privacy & data <ArrowUpRight size={12} /></button></footer>
                  </div>
                </section>
                {dialog && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}><section className="app-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header><h2 id="dialog-title">{dialog === "help" ? "Help & support" : dialog === "workspace" ? "Your workspace" : dialog === "resumes" ? "My resumes" : "Privacy & data"}</h2><button className="icon-button" onClick={() => setDialog(null)} aria-label="Close"><X size={18} /></button></header>
                  {dialog === "help" && <div className="dialog-content"><p>Build your resume by filling in the sections. The preview updates as you type.</p><ul><li><strong>Export PDF</strong> opens your browser’s print dialog. Choose “Save as PDF”.</li><li><strong>Autosave</strong> stores resumes in this browser on this device.</li><li><strong>ATS quick scan</strong> is a rough writing checklist, not a hiring prediction.</li><li><strong>My resumes</strong> lets you switch between drafts or delete one.</li></ul><p className="dialog-note">No support inbox is configured for this demo yet.</p></div>}
                  {dialog === "workspace" && <div className="dialog-content"><p>A workspace is the place this app keeps your resume drafts. This version saves privately to local browser storage; it does not have sign-in, cloud backup, or cross-device syncing.</p><p>Sharing the deployed app link lets other people use their own browser workspace. It does not share your resume with them.</p><button className="primary-button" onClick={() => { setDialog("resumes"); }}>Open my resumes</button></div>}
                  {dialog === "resumes" && <div className="dialog-content"><div className="resume-list">{documents.map((document) => { const name = document.data.fullName.trim(); return <div className={`resume-list-item${document.id === activeId ? " current" : ""}`} key={document.id}><button className="resume-select" onClick={() => selectResume(document)}><FileText size={17} /><span><strong>{name ? `${name}’s Resume` : "Untitled resume"}</strong><small>{document.id === activeId ? "Currently open" : `Edited ${new Date(document.updatedAt).toLocaleDateString()}`}</small></span></button><button className="icon-button delete-resume" aria-label={`Delete ${name || "untitled"} resume`} title="Delete resume" onClick={() => deleteResume(document.id)}><Trash2 size={16} /></button></div>; })}</div><button className="secondary-button" onClick={createResume}><Plus size={15} />Create a resume</button></div>}
                  {dialog === "privacy" && <div className="dialog-content"><p>Your drafts are stored only in this browser. They are not uploaded or included in a public link. Clearing browser data or switching browsers may remove access to them.</p><p>Download a PDF before clearing local drafts if you want to keep a copy.</p><button className="danger-button" onClick={() => { if (window.confirm("Delete all saved resumes from this browser? This cannot be undone.")) { localStorage.removeItem(WORKSPACE_KEY); localStorage.removeItem(LEGACY_RESUME_KEY); localStorage.removeItem(TEMPLATE_KEY); const fresh = makeDocument(); setDocuments([fresh]); setActiveId(fresh.id); reset(emptyResume); setTemplate("professional"); setDialog(null); } }}><Trash2 size={15} />Clear all browser data</button></div>}
                </section></div>}
              </main>
            );
          }
