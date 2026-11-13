# Putting FP Flow online (permanent version)

This puts FP Flow permanently on the internet: always on, data and uploaded videos are kept.
Currently configured for Render's **free** plan (€0). The Neon database plan is free and does not expire.
Upgrade later to always-on (~$7.25/month): see "Upgrading" below.
It currently runs as a **demo with made-up data**.
Do **not** enter real patient information in the demo.

You need two accounts. Both run in the EU (Frankfurt).

## Step 1 — Database (Neon), about 3 minutes

1. Go to https://neon.tech and sign up (you can use your GitHub account).
2. Create a project. Name: `fp-exercise-demo`. Region: **AWS Europe Central 1 (Frankfurt)**.
3. On the project dashboard click **Connect** and copy the connection string.
   It looks like `postgresql://neondb_owner:...@ep-....eu-central-1.aws.neon.tech/neondb?sslmode=require`.
   Keep it private — it is a password.

## Step 2 — App (Render), about 5 minutes

1. Go to https://render.com and sign up with your GitHub account. Allow Render to see the
   `Fp-exercise` repository.
2. Click **New +** → **Blueprint**.
3. Choose the `Fp-exercise` repository and branch **`claude/fp-exercise-platform-bcak8k`**.
4. Render shows one service, `fp-exercise` (plan *Free*), and asks for `DATABASE_ADMIN_URL`:
   paste the Neon connection string from step 1.
5. Click **Apply**.
   The first build takes a few minutes.
6. When it says **Live**, open the address Render shows (something like
   `https://fp-exercise.onrender.com`). This address stays the same.

## Optional — your own web address

In Render open the service → **Settings → Custom Domains** → add e.g. `app.functionalperformance.nl`.
Render shows one DNS record; add it where your domain is managed (your website/domain provider).
HTTPS is set up automatically.

## Using the demo

- Log in with a demo account (therapist, patient, owner, admin); the hosted login page no longer lists them.
- Open the patient account on your phone to see the patient app.
- When you invite a new patient, the invite link is shown on screen (no e-mails are sent in the demo).

## Good to know

- New versions: when new work is pushed to the branch, Render updates the site automatically. Data is kept.
- The free plan sleeps after 15 minutes without visitors (first visit then takes ~1 minute) and does not keep
  uploaded videos after a restart. Patients, programmes and other data (in Neon) are kept.
- Push reminders are sent by the server itself, so while it sleeps none go out (a reminder that is due
  is still sent up to 3 hours late once someone opens the site). Reliable reminders need the paid plan.

## Always on, with a disk for uploads

The service runs on the Starter plan, so it does not sleep. Uploaded videos and photos survive a restart
only with a disk: uncomment the `disk:` block and `STORAGE_DIR` in `render.yaml`, or add it by hand: service → **Disks** → mount path `/var/data`, 1 GB, and set
`STORAGE_DIR=/var/data/storage` under **Environment**.

## Closing the demo accounts

The hosted site does not list the demo accounts, but they and their password are in the source code,
so hiding them closes nothing. Under **Environment** set one of:

- `DEMO_PASSWORD` = an own password of 12 characters or more: the demo accounts keep working with that
  password only;
- `DEMO_ACCOUNTS` = `off`: no demo account can log in.

## Real e-mail (invitations, password reset, address check)

Until this is set, no mail leaves the server and invite links are shown on screen instead.

1. Take a mail provider that offers SMTP, is hosted in the EU and signs a processor agreement.
2. At that provider, verify the sending domain (it gives the SPF, DKIM and DMARC records to add where
   the domain is managed) and create SMTP login details.
3. In Render under **Environment** set `SMTP_HOST`, `SMTP_PORT` (587, or 465), `SMTP_USER`, `SMTP_PASS`,
   `MAIL_FROM` (e.g. `FP Flow <no-reply@your-domain.nl>`) and, last, `MAIL_TRANSPORT` = `smtp`.

With `MAIL_TRANSPORT=smtp` the server refuses to start while a setting is missing, and says which.
A mail that cannot be delivered shows "De e-mail kon niet worden verstuurd" to the person inviting.

## Before real patient data

- Rotate the Neon owner password: Neon console → project → **Roles** → reset the owner's password →
  copy the new connection string into Render's `DATABASE_ADMIN_URL`.
- Check the Neon plan's history retention (point-in-time restore) and do one restore to a branch as a drill.
- Switch on "Verplicht maken voor iedereen" (MFA) under Praktijk → Instellingen for each real practice.
- Everything else under A in RELEASE_CHECKLIST.md.
