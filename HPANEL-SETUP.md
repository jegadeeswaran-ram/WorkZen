# Hostinger hPanel — Node.js App Setup Guide

After running `upload-web.ps1`, configure the Node.js app in hPanel.

---

## Step 1: Open Node.js Manager

1. Log into **Hostinger hPanel**: https://hpanel.hostinger.com
2. Go to **Hosting** → select your hosting plan
3. Click **Advanced** → **Node.js**

---

## Step 2: Create Web App (workzen.redonix.in)

Click **Create application** and fill in:

| Field | Value |
|---|---|
| Node.js version | **20.x** |
| Application mode | Production |
| Application root | `/home/u547357606/workzen/apps/web` |
| Application URL | `workzen.redonix.in` |
| Application startup file | `start.js` |

**Environment variables** (add each one):

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `NEXT_PUBLIC_API_URL` | `https://workzen.redonix.in` |
| `API_INTERNAL_URL` | `http://localhost:3001` |

Click **Create**.

---

## Step 3: Create API App (api.workzen.redonix.in) — Optional

If you want the API accessible via a subdomain too:

1. First, create subdomain `api.workzen.redonix.in` in **Domains** → **Subdomains**
2. Then in **Node.js**, create another application:

| Field | Value |
|---|---|
| Node.js version | **20.x** |
| Application root | `/home/u547357606/workzen/apps/api` |
| Application URL | `api.workzen.redonix.in` |
| Application startup file | `dist/main.js` |

> **Note**: The API is already running via PM2 on port 3001. If you configure it via hPanel too, stop the PM2 process first:
> ```bash
> pm2 delete workzen-api
> ```

---

## After Configuration

Once hPanel sets up the proxy, visit:
- **https://workzen.redonix.in** → Next.js web app
- **https://workzen.redonix.in/api/v1/auth/me** → NestJS API (via Next.js proxy)

---

## Seed the Super Admin

After the app is live, seed the initial super admin:

```bash
ssh -p 65002 u547357606@88.222.211.181
cd ~/workzen/packages/database
export PATH=/opt/alt/alt-nodejs20/root/usr/bin:/home/u547357606/npm-global/bin:/usr/local/bin:/usr/bin
npx prisma db seed
```

Super admin credentials:
- Email: `admin@workzen.redonix.in`
- Password: `Admin@123456`

---

## Troubleshooting

**App not starting**: Check PM2 logs:
```bash
export PATH=/opt/alt/alt-nodejs20/root/usr/bin:/home/u547357606/npm-global/bin:/usr/local/bin:/usr/bin
pm2 logs workzen-web --lines 50
```

**API errors**: Check API logs:
```bash
pm2 logs workzen-api --lines 50
```

**Database connection**: Verify MySQL is running:
```bash
mysql -u u547357606_workzen -p'Jega@2107@1986' u547357606_workzen -e "SHOW TABLES;" | head -20
```
