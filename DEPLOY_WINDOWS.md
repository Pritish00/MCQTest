# Windows Server Deployment Guide

## Prerequisites on the Windows Server

1. **Python 3.10+** — Download from https://www.python.org/downloads/
2. **Node.js 18+** — Download from https://nodejs.org/
3. **ODBC Driver 17 for SQL Server** — Download from https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server
4. **Git** (optional) — to clone the repo, or just copy the folder

---

## Step-by-Step Deployment

### 1. Copy the project to the server

Copy the entire `MCQTest` folder to the server, e.g. `C:\MCQTest`

### 2. Build the frontend

Open **Command Prompt** or **PowerShell** as Administrator:

```cmd
cd C:\MCQTest\frontend
npm install
npm run build
```

This creates `C:\MCQTest\frontend\dist\` with the static files.

### 3. Set up the backend

```cmd
cd C:\MCQTest\backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
pip install groq
pip install bcrypt==4.0.1
```

### 4. Configure environment variables

Edit `C:\MCQTest\backend\.env`:

```
DATABASE_URL=mssql+pyodbc://vidya:Vidya%4041@103.20.214.144:12433/vidyaos?driver=ODBC+Driver+17+for+SQL+Server
SECRET_KEY=mcq-platform-super-secret-key-2024
GROQ_API_KEY=your-groq-api-key-here
```

If the MSSQL is on the same server, change the IP to `localhost` or `127.0.0.1`.

### 5. Test run

```cmd
cd C:\MCQTest\backend
venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 5000
```

Now open a browser and go to: `http://YOUR_SERVER_IP:5000/`

### 6. Open Windows Firewall

Allow inbound traffic on the port you chose:

```cmd
netsh advfirewall firewall add rule name="MCQ Platform" dir=in action=allow protocol=tcp localport=5000
```

---

## Run as a Windows Service (so it stays running after logout)

### Option A: Using NSSM (recommended)

1. Download NSSM from https://nssm.cc/download
2. Extract and copy `nssm.exe` to `C:\MCQTest\`

Install the service:
```cmd
C:\MCQTest\nssm.exe install MCQPlatform
```

In the NSSM dialog:
- **Path:** `C:\MCQTest\backend\venv\Scripts\python.exe`
- **Startup directory:** `C:\MCQTest\backend`
- **Arguments:** `-m uvicorn app.main:app --host 0.0.0.0 --port 5000`

Click "Install Service", then start it:
```cmd
nssm start MCQPlatform
```

### Option B: Using Task Scheduler

1. Open **Task Scheduler**
2. Create a new task: "MCQ Platform"
3. Trigger: At system startup
4. Action: Start a program
   - Program: `C:\MCQTest\backend\venv\Scripts\python.exe`
   - Arguments: `-m uvicorn app.main:app --host 0.0.0.0 --port 5000`
   - Start in: `C:\MCQTest\backend`
5. Check "Run whether user is logged on or not"

---

## Access the Application

- **From the server itself:** `http://localhost:5000/`
- **From other machines:** `http://YOUR_SERVER_IP:5000/`
- **Admin panel:** `http://YOUR_SERVER_IP:5000/login`
- **Candidate test link:** `http://YOUR_SERVER_IP:5000/test/{test-id}`

---

## Updating the Application

```cmd
cd C:\MCQTest\frontend
npm run build

nssm restart MCQPlatform
```

---

## Troubleshooting

- **Port 5000 in use?** Check with `netstat -ano | findstr :5000`
- **ODBC errors?** Ensure "ODBC Driver 17 for SQL Server" is installed
- **Can't connect from other machines?** Check Windows Firewall rule
- **Check logs:** `nssm status MCQPlatform` and look in Event Viewer
