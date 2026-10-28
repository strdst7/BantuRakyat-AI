<div align="center">

# 🇲🇾 BantuRakyat-AI

### An eligibility checker for Malaysian public aid programmes, with plain-language explanations in BM and English.

Built with **Next.js**, **TypeScript**, **Drizzle ORM / PGlite**, and **OpenDOSM** open data.

---

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

</div>

---

> [!IMPORTANT]
> **This is not an official government service.** It is an independent, open-source project. Every eligibility result and ringgit figure is an **estimate** produced by this application's own rules — never an official determination. Always confirm with the relevant agency before applying.

---

# ✨ What it does

A user enters their state, household income, household size, employment status, and any special indicators (OKU, warga emas, single parent, youth). The app then:

1. Filters a catalogue of aid programmes against those inputs.
2. Returns the programmes the user appears to qualify for, with an estimated annual value.
3. Explains each match in Malay and English, and lists the documents needed.
4. Shows the user's income relative to their state's median household income, using DOSM data.
5. Lets the user mark programmes they already receive, to surface unclaimed support.
6. Copies an action plan to the clipboard for offline use.

---

# 🔍 What is real, and what is an estimate

Being precise about this matters more than sounding impressive.

| Element | Status |
| --- | --- |
| State household income, low-income CPI | **Live** from `api.data.gov.my` (OpenDOSM), cached 5 minutes, with a bundled DOSM 2024 fallback |
| State poverty rates | **Bundled** DOSM 2024 figures — not fetched live |
| Aid programme catalogue | **Curated by hand** in `src/db/seed-data.ts`; editable via the admin API |
| Eligibility matching | **Deterministic rules** in `src/lib/aid-engine.ts` |
| Explanations (BM/EN) | **Templated strings** chosen by programme code — no language model is called |
| Estimated annual values | **Heuristic** (base amount plus a household-size adjustment), clearly labelled `EST.` |
| Payout calendar dates | **Indicative only** — not sourced from any API; the UI says so |
| Notification delivery | **Not implemented.** Contact registration records interest only |

The banner on screen and the `status` field in `/api/pasarapi/snapshot` reflect the real state of the live feed (`online` / `partial` / `fallback`). If OpenDOSM is unreachable, the app says so instead of claiming to be live.

---

# 🧠 Why rules instead of an LLM

Eligibility outcomes here need to be explainable and reproducible. A deterministic engine means:

- The same input always produces the same output.
- Every match can be traced to a specific rule and reason string.
- No personal financial data leaves the server to a third-party model provider.

The trade-off is that the catalogue and rules need manual upkeep as schemes change. That is deliberate.

---

# ⚠️ Known limitations

- **Notification alerts are not delivered.** `/api/alerts` stores a keyed hash and a masked contact; nothing sends email or SMS yet. The UI says this explicitly.
- **Serverless storage is ephemeral.** On Vercel, PGlite runs in memory, so scan history and alert registrations do not survive a cold start. Point `DATABASE_URL` at a networked Postgres for durable storage.
- **Programme data ages.** Thresholds and payout dates are hardcoded and must be reviewed each budget cycle.
- **No automated tests yet.** The eligibility engine is the highest-value place to add them.
- **`v1/`** is a legacy prototype, excluded from typecheck and lint.

---

# 🚀 Quick start

Requires Node.js **20+**.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

```bash
npm run build    # production build
npm run start    # serve the build
npm run lint
npm run typecheck
```

---

# 🔐 Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `ADMIN_API_KEY` | For admin use | Unlocks `/api/admin/*`. If unset in production, those routes return 404. |
| `ALERT_HASH_SECRET` | Recommended | Key for the HMAC used to hash alert contacts. A dev-only fallback is used if unset. |
| `DATABASE_URL` | For `drizzle-kit` only | Runtime uses PGlite; this is for migration tooling. |

The admin dashboard is at `/admin`; paste the key there to unlock it. The key is kept in `sessionStorage` only.

---

# 📁 Project structure

```text
src/
├── app/                    # Next.js App Router (page, admin, API routes)
├── lib/
│   ├── aid-engine.ts       # deterministic eligibility rules
│   ├── pasarapi.ts         # OpenDOSM client + provenance tracking
│   └── admin-auth.ts       # admin key gate
└── db/                     # Drizzle schema, PGlite bootstrap, seed catalogue
```

---

# 🏆 Built for the KRACKED DEVS × PASARAPI Mini Bounty

Created for a community challenge encouraging Malaysian developers to build practical, AI-assisted applications using real-world open data.

- 🌐 KRACKED DEVS Bounty: <https://krackeddevs.com/code/bounty/pasarapi-bounty>
- 🔌 PasarAPI: <https://pasarapi.xyz/>

Thanks to both teams for running the initiative.

---

# 📄 License

MIT — see [LICENSE](./LICENSE).

---

# 🌐 Live preview

**<https://bantu-rakyat-ai.vercel.app>**

<div align="center">

Made with ❤️ using Next.js + TypeScript

</div>
