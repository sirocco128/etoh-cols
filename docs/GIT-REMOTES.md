# Git remotes — backup & CI

This project can use **two remotes**:

| Remote | Host | Purpose |
| --- | --- | --- |
| `origin` | [Cursor origin](https://origin.cursor.com) | Personal/team backup (private) |
| `gitlab` | GitLab.com (or self-hosted) | CI/CD, MR workflow, team review |

---

## Cursor origin (configured)

```
https://origin.cursor.com/tong128/premium-giftset-web.git
```

View: https://cursor.com/codebase/tong128/premium-giftset-web

```bash
git push origin main
```

Install CLI if needed:

```bash
curl -fsSL https://downloads.cursor.com/origin/install.sh -o /tmp/origin-install.sh
bash /tmp/origin-install.sh
origin auth login
```

---

## GitLab remote (add once)

### 1. Authenticate

```bash
glab auth login --hostname gitlab.com
# or: export GITLAB_TOKEN=<personal-access-token with api, write_repository>
```

### 2. Create project & push

```bash
cd "/Users/gungun/Library/Mobile Documents/com~apple~CloudDocs/web_chaina"

glab repo create premium-giftset-web \
  --private \
  --description "Premium Gift Set B2B — Next.js 15 + Strapi v1.1" \
  --remote-name gitlab

git push -u gitlab main
```

If the project already exists:

```bash
git remote add gitlab git@gitlab.com:<your-namespace>/premium-giftset-web.git
git push -u gitlab main
```

### 3. CI

Pipeline: `.gitlab-ci.yml` — lint, test, build, Lighthouse, manual `staging-deploy`.

Set CI/CD variables in GitLab → Settings → CI/CD → Variables:

| Variable | Notes |
| --- | --- |
| `STRAPI_BUILD_API_TOKEN` | Optional build-time Strapi read |
| `CI_REGISTRY_*` | For Kaniko container push |

---

## Push to both remotes

```bash
git push origin main
git push gitlab main
```

---

## What not to commit

- `.env.local`, `.env.cms.local`, `.env.staging` (generated)
- `intake/sprint2-intake.json` (may contain secrets)
- `.data/` lead SQLite

See `.gitignore`.
