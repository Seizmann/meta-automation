# meta-auto-byrexio Dashboard (React + Vite Client)

<p align="center">
  <img src="public/meta-auto-rexio.svg" alt="meta-auto-byrexio Logo" width="80" height="80" />
</p>

A glassmorphic administration dashboard to configure and monitor comments routing rules for the `meta-auto-byrexio` auto-responder.

---

## 🔒 Security & Environment Variables

When deploying to Vercel or running locally, you can secure and auto-configure the dashboard using environment variables. Create a `.env` file in the `frontend` folder or configure them in the Vercel Dashboard:

| Variable | Description | Requirement |
| :--- | :--- | :--- |
| `VITE_DASHBOARD_PASSWORD` | Sets a secure passphrase to unlock the dashboard. | **Highly Recommended** (Enables password lock) |
| `VITE_DEFAULT_BACKEND_URL` | Pre-fills the VPS URL (e.g. `https://meta-aut.rexio.pro`). | Optional (Hides VPS URL on login) |
| `VITE_DEFAULT_API_KEY` | Pre-fills the VPS `ADMIN_API_KEY` token. | Optional (Prevents typing the API Key) |

> [!NOTE]
> * If `VITE_DASHBOARD_PASSWORD` is defined, the app will show a **Password Lock Screen** on load. Once the correct password is entered, the app automatically establishes a secure connection to the backend VPS using the pre-filled URL and Key.
> * The VPS backend URL is automatically masked in the UI sidebar settings panel (e.g., `https://met***.rexio.pro/webhook`) to keep your production endpoint hidden.

---

## ⚡ Local Development

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the dashboard at `http://localhost:5173`.
