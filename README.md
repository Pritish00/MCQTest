# MCQ Test Platform

AI-powered MCQ assessment platform for HR/Recruiters with automatic question generation via Google Gemini.

## Tech Stack
- **Backend:** Python FastAPI + SQLAlchemy
- **Frontend:** React + Vite + TailwindCSS
- **Database:** Microsoft SQL Server
- **AI:** Google Gemini API

## Features
- Admin login/register
- AI-generated MCQ tests (any topic, configurable question count & time limit)
- Unique link + PIN per test
- Candidate test-taking with timer, navigation (forward/back)
- Auto-submit on timeout
- Dashboard with all tests, results, scores
- PDF export of questions, answers, and results
- Toggle test active/inactive, delete tests

---

## Setup

### 1. Database (MSSQL)
Create a database named `MCQTestDB` in your SQL Server instance.

### 2. Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

Edit `backend/.env`:
```
DATABASE_URL=mssql+pyodbc://sa:YourPassword@localhost:1433/MCQTestDB?driver=ODBC+Driver+17+for+SQL+Server
SECRET_KEY=your-secret-key
GEMINI_API_KEY=your-google-gemini-api-key
```

Run the server:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Windows Server Deployment

### Prerequisites
- Python 3.10+
- Node.js 18+
- SQL Server with ODBC Driver 17
- IIS (Internet Information Services)

### Steps

1. **Build Frontend:**
```bash
cd frontend
npm run build
```
This produces a `dist/` folder.

2. **Deploy Backend with IIS + FastCGI or as a Windows Service:**

Option A — Run as a background process:
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Option B — Use NSSM to register as a Windows Service:
```bash
nssm install MCQTestBackend "C:\path\to\backend\venv\Scripts\uvicorn.exe" "app.main:app --host 0.0.0.0 --port 8000"
nssm set MCQTestBackend AppDirectory "C:\path\to\backend"
nssm start MCQTestBackend
```

3. **Serve Frontend via IIS:**
- Point IIS site root to `frontend/dist/`
- Add URL Rewrite rule to proxy `/api/*` requests to `http://localhost:8000/api/*`
- Add a fallback rule to serve `index.html` for all non-file routes (SPA support)

### IIS URL Rewrite `web.config` (place in `frontend/dist/`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:8000/api/{R:1}" />
        </rule>
        <rule name="SPA Fallback" stopProcessing="true">
          <match url=".*" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```
