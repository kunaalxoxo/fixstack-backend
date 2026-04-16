# FixStack Backend 🛠️

Autonomous dependency remediation system for hackathon demos.

## 🚀 How to Run

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:3001`.

## 📂 File Structure

- `src/types/`: TypeScript interfaces for the entire system.
- `src/services/`: Multi-agent system logic (Scanner, Lookup, Planner, Validator, Orchestrator).
- `src/db/`: In-memory storage abstraction (pluggable for Supabase).
- `src/app.ts`: Express API endpoints.

## 🎭 Demo Flow

1. Call `POST /api/run-scan`.
2. The **Repo Scanner** identifies `lodash@4.17.15`.
3. The **CVE Lookup Agent** finds a vulnerability.
4. The **Patch Planner** suggests `4.17.19`.
5. The **Validator** fails `4.17.19` (deterministic demo failure).
6. The **Retry Controller** triggers a second attempt.
7. The **Patch Planner** suggests `4.17.21`.
8. The **Validator** passes `4.17.21`.
9. Final remediation results are emitted.

## 📡 API Endpoints

- `POST /api/run-scan`: Start a new remediation run.
- `GET /api/runs/:id`: Get the status and final results of a run.
- `GET /api/runs/:id/events`: Get the full execution trace (events) for the frontend dashboard.
- `GET /api/runs`: List all runs.
