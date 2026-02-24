# Admin Setup & Login Instructions

To log in as an admin, you need to configure the local environment variables and ensure the admin user is bootstrapped in the database.

Last synced: February 24, 2026.

## 1. Configure Environment Variables

Create or edit `.env.local` in the project root:

```bash
# .env.local
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-this-password-to-something-secure-and-long
LLM_API_KEY=your-api-key-here # OpenAI-compatible API key for AI Coach

# Optional but recommended
SESSION_TTL_DAYS=30
PBKDF2_ITERATIONS=100000
# LLM_BASE_URL=https://api.openai.com/v1
# LLM_MODEL=gpt-4o-mini
```

Notes:
- `ADMIN_PASSWORD` must be at least 12 characters.
- `PBKDF2_ITERATIONS` defaults to `100000` if not set (Cloudflare maximum).
- `SESSION_TTL_DAYS` defaults to `30` if not set.
- `LLM_API_KEY` is required for the AI Coach import recaps to work.

## 2. Apply Local Migrations

Run the D1 migrations so the `users` table includes auth columns:

```bash
npm run db:migrate:local
```

## 3. Start the Development Server

Run the app locally:

```bash
npm run dev
```

## 4. Trigger Admin Bootstrap

The system is designed to automatically create the admin user if no users exist in the database.

1.  Navigate to the **Login Page** (e.g., `http://localhost:3000/login`).
2.  Attempt to log in with the credentials you set in `.env.local`.
    *   **Mechanism**: The login route (`/api/auth/login`) calls `ensureAdminBootstrap` before processing the login.
    *   If the database is empty, it creates the initial admin user with your credentials.
    *   If users already exist, bootstrap is skipped and your `.env.local` admin values will not overwrite existing accounts.

## 5. Verify Admin Access

1.  Upon successful login, you should be redirected to the dashboard.
2.  Navigate to `http://localhost:3000/admin`.
3.  You should see the Admin Dashboard with "Create Invite" options.

## 6. Invite a User

1.  Use the **Create Invite** form on `/admin` to generate an invite link.
2.  Share the link with the user.
3.  The user visits `/accept-invite?code=...`, sets a password (12+ chars), and gets logged in.
