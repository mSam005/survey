# GI Symptoms & Parasitic Infection Survey — Setup Guide

Flow: **person fills survey → you get a short email ("Name submitted your survey, response #N") → the response is saved in a Google Sheet → you open the dashboard (like Google Forms / Tally) to see how many responded, who responded, each person's answers + result, and the full analysis (graphs, tables, %, interpretations, Excel, PDF).**

## Files
| File | Purpose |
|---|---|
| `index.html` | The survey (cover page, 9 sections, mobile friendly) — share this link |
| `admin.html` | Your private analysis dashboard (cover page, charts, tables, %, interpretations, Excel/PDF) |
| `config.js` | Your name, supervisor, university text, logo path, Apps Script URL |
| `questions.js` | All 50 questions (from your questionnaire) + scoring |
| `apps-script/Code.gs` | Backend: saves to Google Sheet + sends you the short notification email |
| `assets/logo.png` | **Put the UoG logo here** (PNG). Until then a "UoG" badge is shown |

## Step 1 — Logo and details
1. Save the University of Gujrat logo as `assets/logo.png`.
2. Open `config.js` and fill `RESEARCHER`, `SUPERVISOR`, `SESSION`. (Change `UNIVERSITY` if "UoG" means a different university.)

## Step 2 — Connect your email (Google Apps Script, free)
1. Go to https://sheets.google.com → create a **new blank Sheet** (name it e.g. "GI Survey Responses").
2. Menu **Extensions → Apps Script**. Delete the default code, paste all of `apps-script/Code.gs`.
3. Edit the top lines: `OWNER_EMAIL` (your Gmail), `ADMIN_TOKEN` (any secret password you choose) and, once your site is online, `DASHBOARD_URL` (your admin.html link, so the email has an "Open dashboard" button).
4. Click **Deploy → New deployment → ⚙ Web app**. Set *Execute as:* **Me**, *Who has access:* **Anyone**. Click Deploy and **authorize** when Google asks (Advanced → Go to project → Allow).
5. Copy the **Web app URL** and paste it into `SCRIPT_URL` in `config.js`.
6. Tip: if you later edit Code.gs, use Deploy → *Manage deployments* → edit → New version.

## Step 3 — Put the website online (free)
Upload the whole folder to **Netlify Drop** (https://app.netlify.com/drop) or GitHub Pages. You get a link like `https://yoursite.netlify.app/` → share that (it opens `index.html`). Your dashboard is at `.../admin.html`.

## Step 4 — Test before sharing
Open the site, fill one survey, press Submit. You should get a short email ("<name> submitted your survey") within a minute and see a row in the Sheet. (While `SCRIPT_URL` is empty the site is in demo mode and nothing is emailed.)

## Step 5 — Dashboard (admin.html)
Open `admin.html` → enter your `ADMIN_TOKEN` → **Load responses** (tick *Auto-refresh* to update every minute).
- **Responses tab** (like Google Forms): total responses, today's count, responses-per-day chart, and a list of everyone who submitted (name, date, age, gender, symptoms, severity, hygiene/exposure level). Search by name, and **click a person** to see all their answers, scores and interpretation (can be printed).
- **Analysis report tab**: cover page, executive summary, tables with n and %, graphs, interpretation for every question, cross-tabs with chi-square p-values.
- **Download analysis sheet (Excel)** → Raw Data, Summary, Frequency Tables, Cross-tabs, Interpretations, Codebook.
- **Print / Save report as PDF** → the analysis report with cover page.
- **Load demo data** previews everything with 80 *simulated* responses (never use these as results).

## Notes
- Gmail limits scripts to about 100 emails/day (consumer account). All responses are still saved in the Sheet.
- Fixed spelling in the questionnaire ("Cts"→"Cats", "symtoms", "consuption"). Wording is otherwise unchanged.
- Questions that depend on an earlier answer (e.g. symptom details when "No symptoms") are hidden automatically and recorded as "Not applicable". The final free-text question is optional.
- Name is stored in your Sheet/email but is **not** used in analysis charts.
- Interpretations and hygiene/exposure indices are automatic descriptive summaries — review them before putting them in your thesis.
