# Demo Repo Bootstrap (GitHub + Vercel)

GitHub and Vercel do not provide a single-click "duplicate and sanitize" flow for custom apps. This playbook gives a reliable process to clone this repo into a marketing/demo version.

## 1) Create a new GitHub repository

Create an empty repo (example: `stellar-dental-spa-demo`) in GitHub UI.

## 2) Copy the codebase into a new local folder

```bash
cd /path/where/you/store/projects
git clone --origin source git@github.com:<your-org>/<current-repo>.git stellar-dental-spa-demo
cd stellar-dental-spa-demo
```

## 3) Re-point git remote to the new demo repo

```bash
git remote remove source
git remote add origin git@github.com:<your-org>/stellar-dental-spa-demo.git
```

## 4) Prepare demo mode and run sanitizer checks

```bash
cp .env.demo.example .env.local
bash scripts/bootstrap-demo.sh
```

The script checks:
- Demo env mode configured
- Demo logo asset exists
- Known real-practice strings are removed from `src/`

## 5) Commit and push

```bash
git add .
git commit -m "chore: initialize demo repo branding and static mode"
git push -u origin main
```

## 6) Deploy on Vercel

1. Import the **new demo repository** into Vercel.
2. Set environment variable: `VITE_APP_MODE=demo`.
3. If using static demo only, omit production Supabase credentials.
4. Deploy.

## 7) Demo preflight checklist

- [ ] Logo is demo/fake only
- [ ] Practice name appears as demo brand only
- [ ] No production emails, patient names, or office identifiers in source
- [ ] App launches in static mode and does not require live DB
- [ ] Public Vercel URL points to demo repo (not production)

## Optional: one-command clone (if you're already in source repo)

```bash
cd ..
git clone /workspace/vite-react1 stellar-dental-spa-demo
cd stellar-dental-spa-demo
rm -rf .git
git init
git remote add origin git@github.com:<your-org>/stellar-dental-spa-demo.git
cp .env.demo.example .env.local
bash scripts/bootstrap-demo.sh
```

