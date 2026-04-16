# FixStack Backup Version 🛠️

This is the standalone backup implementation of FixStack. It is designed to be isolated from the main frontend and uses the deployed backend.

## 🚀 Quick Start

1. **Navigate to this folder:**
   ```bash
   cd backup-fixstack
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the backup UI:**
   ```bash
   npm run dev
   ```
   The backup will be available at `http://localhost:3002`.

## 🛠️ Features Included
- **One-click Scan:** Triggers a real backend workflow.
- **Live Timeline:** Real-time event polling from the multi-agent system.
- **Results Dashboard:** Shows vulnerabilities and remediation status.
- **Auto-polling:** Automatically stops when the run completes or fails.
- **Error Handling:** Graceful recovery for API failures.

## 📡 Backend
- **Target:** `https://fixstack-backend.onrender.com`
- **Contract:** Shared with the main project via `src/types.ts`.
