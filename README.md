# ResumeForge

Build a polished, ATS-friendly resume, review a live compatibility estimate, and export a print-ready PDF.

Created by L Sadiya Ashrafi.

## Run locally

Requirements: Node.js 20.9 or later and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Run `npm run lint` and `npm run build` to check the project.

## Included in this demo

- Welcome screen with a clear path into the free resume builder
- Responsive resume editor with a live preview
- Separate prompts for students/first resumes and experienced professionals, with multiple work-history entries
- Personal details, summary, education, skills, projects, achievements, and certifications
- Three resume styles: Professional, Minimal, and Student
- An explainable ATS-readiness checklist with local job-description keyword overlap and tailored suggestions
- Multiple resume drafts with automatic browser-local saving; resume content is not sent to a server
- A4 print layout; use **Export PDF** or **Download**, then choose **Save as PDF** in the browser print dialog

The home page introduces ResumeForge; choose **Let’s build** to open the editor. Choose a student or professional path to get relevant prompts, add multiple roles, and include projects, achievements, and certifications. Paste a job description in the ATS panel to see local keyword overlap; the app does not upload that text. The ATS score is an educational writing estimate, not a real ATS simulation or hiring guarantee. Drafts are stored in the current browser on the current device. The workspace menu explains this storage boundary, **My resumes** switches between local drafts, and **Help & support** describes the available actions. This demo does not include sign-in, cloud synchronization, cross-device backup, or account management.

## Publish publicly

The app can be deployed to a Next.js host such as Vercel. Import the project into a hosting account, select the Next.js preset, and deploy; the current demo needs no environment variables. A deployment gives you a public app URL that others can open and use with their own browser-local drafts. It does not publish or synchronize your resume data, and this workspace must be connected to a hosting account before a real public URL can be created.

Before enabling registration or storing personal information centrally, add a real authentication provider, a database with per-user authorization, server-side validation, rate limiting, secure session handling, privacy and deletion workflows, and production security review. Add the provider's secrets only through the hosting platform's environment-variable settings; never commit secrets to this repository. Configure a custom domain through the hosting provider when one is available.

## Stack

Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, Framer Motion, React Hook Form, Zod, and Lucide icons.
