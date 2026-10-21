# DryLah!

Plant can drink. Mozzie cannot.

Product website for DryLah!, a Singapore student concept: a covered base for existing plant pots.
Next.js static export, Three.js scene built procedurally in `components/three/`.

```bash
npm install
npm run dev        # http://localhost:3222
npm run build      # static site in ./out
npm run test:e2e   # 17 browser tests against ./out (system Chrome); see GLITCH_AUDIT.md
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/pages.yml`.

The order form runs in demo mode. Set `NEXT_PUBLIC_INTEREST_ENDPOINT` to a form backend URL
to store responses.
