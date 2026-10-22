# Putting the demo online

This puts a **demo** of FP Exercise on the internet with made-up data. It is free.
Do **not** enter real patient information in the demo.

You need two free accounts. Both are in the EU (Frankfurt).

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
4. Render shows one service, `fp-exercise-demo`, and asks for `DATABASE_ADMIN_URL`:
   paste the Neon connection string from step 1.
5. Click **Apply**. The first build takes a few minutes.
6. When it says **Live**, open the address Render shows (something like
   `https://fp-exercise-demo.onrender.com`).

## Using the demo

- On the login page, click one of the demo accounts (therapist, patient, owner, admin).
- Open the patient account on your phone to see the patient app.
- When you invite a new patient, the invite link is shown on screen (no e-mails are sent in the demo).

## Good to know

- The free plan "sleeps" after 15 minutes without visitors; the first visit then takes ~1 minute.
- Uploaded videos are not kept when the free service restarts.
- Anyone with the link can log in with the demo accounts — fine for fake data, not for real data.
- Real patient data requires the steps in RELEASE_CHECKLIST.md first.
