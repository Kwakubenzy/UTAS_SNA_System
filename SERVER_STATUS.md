# UTAS SNA System - Server Status Report

## ✅ Server Status: RUNNING

**Server Address:** `http://localhost:5000`  
**Status:** ✅ Active and responding to requests  
**Database:** SQLite (sna_system.db created)  
**Port:** 5000

---

## 🧪 API Endpoints Tested

### 1. Health Check ✅
**Endpoint:** `GET /health`

```json
{
  "status": "OK",
  "server": "UTAS SNA Demo"
}
```

---

### 2. Get All Students ✅
**Endpoint:** `GET /api/students`

```json
{
  "success": true,
  "count": 0,
  "students": []
}
```

**Note:** No students yet - import CSV data first

---

### 3. Network Statistics ✅
**Endpoint:** `GET /api/analysis/network-stats`

```json
{
  "success": true,
  "network_stats": {
    "total_students": 0,
    "total_connections": 0,
    "community_count": 0,
    "bridge_node_count": 0,
    "average_degree_centrality": 0.0
  }
}
```

---

### 4. Top Influencers ✅
**Endpoint:** `GET /api/analysis/top-influencers`

```json
{
  "success": true,
  "count": 0,
  "influencers": []
}
```

**Note:** No influencers yet - run analysis after importing data

---

## 📊 Next Steps: Import Data and Analyze

### Step 1: Prepare CSV File

Your CSV should have this format:

```csv
from_student_id,from_name,from_tribe,from_party,from_college,from_department,from_year,to_student_id,to_name,to_tribe,to_party,to_college,to_department,to_year,strength,relationship_type
S001,Ahmed,Kusasi,TESCON,Engineering,IT,3,S002,Fatima,Mamprusi,TEIN,Business,Finance,2,4,Close Friend
```

### Step 2: Use the Full Backend (When Dependencies Installed)

The demo server shows API structure. For full functionality with ML and analysis:

```bash
# Install dependencies
cd backend
python -m pip install -r ../requirements.txt

# Run full Flask backend
python run.py
```

### Step 3: Import Data (When Running Full Backend)

```bash
curl -X POST http://localhost:5000/api/analysis/import-csv \
  -F "file=@data/raw/your_data.csv"
```

### Step 4: Run SNA Analysis

```bash
curl -X POST http://localhost:5000/api/analysis/run-analysis
```

### Step 5: Get Results

```bash
curl http://localhost:5000/api/analysis/top-influencers
curl http://localhost:5000/api/analysis/network-stats
curl http://localhost:5000/api/analysis/communities
```

---

## 📋 Available Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| GET | `/api/students` | List all students |
| GET | `/api/analysis/network-stats` | Network statistics |
| GET | `/api/analysis/top-influencers` | Top influencers ranking |
| GET | `/api/analysis/communities` | Community breakdown |
| GET | `/api/analysis/centrality/<type>` | Centrality scores |
| GET | `/api/analysis/bridge-nodes` | Bridge nodes |
| POST | `/api/analysis/import-csv` | Import CSV data |
| POST | `/api/analysis/run-analysis` | Run SNA analysis |

---

## 🔧 System Architecture

```
HTTP Request
    ↓
Demo Server (demo_server.py) / Flask Backend (run.py)
    ↓
Route Handler (students.py, connections.py, analysis.py)
    ↓
SQLite Database (sna_system.db)
    ↓
NetworkX Analysis (sna_engine.py) [Full backend only]
    ↓
JSON Response
```

---

## 💾 Database Schema

### students table
```sql
id, student_id, name, tribe, party, college, department, year, email, phone, created_at
```

### connections table
```sql
id, from_student_id, to_student_id, strength, relationship_type, created_at
```

### network_metrics table
```sql
id, student_id, degree_centrality, betweenness_centrality, closeness_centrality, 
pagerank_score, community_id, influence_tier, bridge_node, created_at
```

---

## 🚀 Quick Command Reference

```bash
# Check server is running
curl http://localhost:5000/health

# View students
curl http://localhost:5000/api/students

# View network stats
curl http://localhost:5000/api/analysis/network-stats

# View top influencers
curl http://localhost:5000/api/analysis/top-influencers

# Stop server (when running in terminal)
# Press Ctrl+C
```

---

## ⚙️ Two Server Versions Available

### 1. **Demo Server** (Current)
- **File:** `demo_server.py`
- **Features:** Basic HTTP endpoints, SQLite
- **Requirements:** Python 3.x only (no pip install needed)
- **Use:** Quick testing, development, demos

### 2. **Full Backend** (Production Ready)
- **File:** `backend/run.py`
- **Features:** Full Flask, NetworkX analysis, ML models, comprehensive API
- **Requirements:** All dependencies from requirements.txt
- **Use:** Full analysis, SNA metrics, ML predictions, reports

---

## 📝 Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Database | ✅ Ready | SQLite initialized |
| API Server | ✅ Running | Responding to requests |
| Students Endpoint | ✅ Ready | No data imported yet |
| Analysis Endpoint | ✅ Ready | Awaiting data import |
| CSV Import | ⏳ Pending | Demo server basic only |
| SNA Analysis | ⏳ Pending | Requires full backend |
| ML Models | ⏳ Pending | Requires dependencies |
| Frontend | ⏳ Next Phase | To be built |

---

## 🎯 What to Do Now

1. **Test the Server** ✅ (Done - currently running)
2. **Prepare CSV Data** - Create your student network CSV file
3. **Choose Backend** - Use demo_server.py for quick testing OR install dependencies for full backend
4. **Import Data** - Load your CSV file into the system
5. **Run Analysis** - Process network data with SNA metrics
6. **Build Frontend** - Create web UI for visualization

---

## 📞 Support

### Common Issues

**Q: Port 5000 already in use?**
- Edit `demo_server.py` or `backend/run.py` and change `PORT = 5000` to `PORT = 5001`

**Q: Connection refused?**
- Make sure server is still running in the terminal
- Server must be kept running while making requests

**Q: ModuleNotFoundError?**
- If using full backend, run: `pip install -r requirements.txt`
- Demo server requires no installation

---

**Created:** 2026-06-10  
**Version:** 1.0 - Demo Server Active  
**Next Version:** Full Flask Backend (Pending Dependencies)
