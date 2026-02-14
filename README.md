# Vishwakarma V1 Event Attendance System

State-of-the-Art QR Attendance System with Hybrid Vision Stack (ZXing-CPP + HTML5-WASM).

## 🚀 Key Features
- **Hybrid Vision Engine**: Combines C++ speed (local) with WebAssembly portability (web).
- **Strict Attendance Logic**: Enforces 75% duration, anti-abuse cooldowns, and exact string matching.
- **Admin Dashboard**: Real-time stats, CSV export, and event configuration.
- **Multi-Device**: Supports Webcams, Mobile Cameras, and USB Hardware Scanners.
- **Robustness**: Includes Error Boundaries and stable scan processing.

## 🌟 Recent Fixes (Feb 2026)
- **Resolved Blank Screen**: Fixed a `ReferenceError` in the QR component that caused the app to crash on load.
- **Enabled Event Deletion**: Added the missing backend `DELETE` endpoint and a custom UI confirmation to prevent accidental deletions.
- **Scanner Stability**: Optimized the scanner to prevent camera re-initialization during processing, ensuring a smooth scanning loop.
- **Error Boundaries**: Added React Error Boundaries to catch sub-component failures and maintain application uptime.
- **Rebranding**: Successfully migrated the system to the **Vishwakarma V1** suite.

## 🛠 Tech Stack
- **Frontend**: React, Vite, `html5-qrcode`
- **Backend**: Python (FastAPI), SQLAlchemy, SQLite
- **Vision**: `zxing-cpp`, `opencv-python`, `pyzbar`

## 🏁 Quick Start

### 1. Prerequisites
- Python 3.9+
- Node.js 16+

### 2. Setup
```bash
# Backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd client
npm install
```

### 3. Running the System
For convenience, use the startup script:
```bash
./start.sh
```

Or run manually:
```bash
# Terminal 1 (Backend)
uvicorn server_python.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 (Frontend)
cd client && npm run dev

# Terminal 3 (Local Scanner - Optional)
python vishwakarma_v1_scanner.py --camera 0 --event 1
```

## 📂 Project Structure
- `server_python/`: FastAPI Backend
  - `routes/`: API endpoints (Auth, Events, Scan, Students, Attendance)
  - `models.py`: Database schema
  - `schemas.py`: Pydantic validation models
- `client/`: React + Vite Frontend
  - `src/components/`: Reusable UI elements (ErrorBoundary, QrScanner, Layout)
  - `src/pages/`: Main views (Dashboard, Scanner, Login, Students)
  - `src/api.js`: Axios configuration with interceptors
- `vishwakarma_v1_scanner.py`: High-Performance Python OpenCV Scanner
- `seed.py`: Initial data population script
- `start.sh`: Universal startup script for both stacks

## 📜 Documentation
Full documentation on system flows and OCR integration can be found in the `docs/` folder (coming soon).
