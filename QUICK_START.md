# UTAS SNA System - Quick Start Guide

## ✅ Backend Setup Complete!

Your backend system is fully structured and ready. All 29 component tests passed.

---

## 🚀 Getting Started (3 Steps)

### Step 1: Install Dependencies

```bash
cd UTAS_SNA_System
python -m pip install -r requirements.txt
```

**Note**: If you get network errors, try:
```bash
python -m pip install --retries 5 -r requirements.txt
```

### Step 2: Start the Backend Server

```bash
cd backend
python run.py
```

You should see:
```
 * Running on http://0.0.0.0:5000
 * Debug mode: on
```

### Step 3: Test the API

In a **new terminal window**, test that the server is running:

```bash
# Health check
curl http://localhost:5000/health

# Response should be:
# {"status":"OK"}
```

---

## 📊 Using the System

### 1️⃣ Import CSV Data

Place your CSV file in `data/raw/` folder, then:

```bash
curl -X POST http://localhost:5000/api/analysis/import-csv \
  -F "file=@data/raw/your_data.csv"
```

Response:
```json
{
  "success": true,
  "total_rows": 20,
  "valid_rows": 20,
  "students_created": 14,
  "connections_created": 20
}
```

### 2️⃣ Run SNA Analysis

```bash
curl -X POST http://localhost:5000/api/analysis/run-analysis
```

Response:
```json
{
  "success": true,
  "message": "Analysis completed successfully",
  "metrics": {
    "nodes": 14,
    "edges": 20,
    "metrics_calculated": ["degree_centrality", "betweenness_centrality", ...]
  }
}
```

### 3️⃣ Get Results

**Top Influencers:**
```bash
curl http://localhost:5000/api/analysis/top-influencers?limit=10
```

**Network Statistics:**
```bash
curl http://localhost:5000/api/analysis/network-stats
```

**Communities:**
```bash
curl http://localhost:5000/api/analysis/communities
```

**Bridge Nodes (connectors between groups):**
```bash
curl http://localhost:5000/api/analysis/bridge-nodes
```

**Centrality Scores:**
```bash
curl http://localhost:5000/api/analysis/centrality/degree
curl http://localhost:5000/api/analysis/centrality/betweenness
curl http://localhost:5000/api/analysis/centrality/closeness
curl http://localhost:5000/api/analysis/centrality/pagerank
```

---

## 📁 CSV Data Format

Your CSV file should have these columns:

```
from_student_id, from_name, from_tribe, from_party, from_college, from_department, from_year,
to_student_id, to_name, to_tribe, to_party, to_college, to_department, to_year,
strength, relationship_type
```

**Example:**
```csv
S001,Ahmed,Kusasi,TESCON,Engineering,IT,3,S002,Fatima,Mamprusi,TEIN,Business,Finance,2,4,Close Friend
S002,Fatima,Mamprusi,TEIN,Business,Finance,2,S003,Mohammed,Kusasi,TESCON,Engineering,IT,3,3,Friend
```

**Field Definitions:**
- `from_student_id` / `to_student_id`: Student ID (e.g., S001, S002)
- `from_name` / `to_name`: Student's full name
- `from_tribe` / `to_tribe`: Ethnic background (Kusasi, Mamprusi, Dagomba, etc.)
- `from_party` / `to_party`: Political party (TESCON or TEIN)
- `from_college` / `to_college`: College/Faculty name
- `from_department` / `to_department`: Department name
- `from_year` / `to_year`: Year level (1, 2, 3, or 4)
- `strength`: Friendship strength (1-5 scale)
- `relationship_type`: Type of relationship (Close Friend, Best Friend, Acquaintance, etc.)

---

## 🧮 Understanding the Metrics

### Degree Centrality
- **What it means**: Number of connections
- **High score**: Popular student, many friends
- **Use**: Target these for broad reach

### Betweenness Centrality
- **What it means**: How often a student connects other students
- **High score**: Information broker, bridge between groups
- **Use**: Target these to spread messages across communities

### Closeness Centrality
- **What it means**: How quickly they can reach everyone
- **High score**: Can spread messages very fast
- **Use**: Target these for viral spread

### PageRank
- **What it means**: Overall importance based on network position
- **High score**: Most influential overall
- **Use**: General influence ranking

### Community Detection
- **What it means**: Natural student groupings based on friendships
- **Use**: Tailor campaigns to each community differently

### Bridge Nodes
- **What it means**: Students connecting different communities
- **High score**: Sit on the boundary between groups
- **Use**: Target these to reach multiple communities

---

## 📡 API Quick Reference

### Students Endpoints
```
GET    /api/students                         # List all students
GET    /api/students/<id>                    # Get one student
POST   /api/students                         # Create student
PUT    /api/students/<id>                    # Update student
DELETE /api/students/<id>                    # Delete student
GET    /api/students/stats/summary           # Student statistics
```

### Connections Endpoints
```
GET    /api/connections                      # List all connections
GET    /api/connections/<id>                 # Get one connection
POST   /api/connections                      # Create connection
PUT    /api/connections/<id>                 # Update connection
DELETE /api/connections/<id>                 # Delete connection
GET    /api/connections/student/<id>/friends # Get friends of student
GET    /api/connections/stats/summary        # Connection statistics
```

### Analysis Endpoints
```
POST   /api/analysis/import-csv              # Import CSV file
POST   /api/analysis/run-analysis            # Run SNA analysis
GET    /api/analysis/top-influencers         # Top influencers
GET    /api/analysis/communities             # Community breakdown
GET    /api/analysis/centrality/<type>       # Centrality scores
GET    /api/analysis/bridge-nodes            # Bridge nodes
GET    /api/analysis/network-stats           # Network statistics
```

### Campaign Endpoints
```
GET    /api/campaigns                        # List campaigns
GET    /api/campaigns/<id>                   # Get one campaign
POST   /api/campaigns                        # Create campaign
PUT    /api/campaigns/<id>                   # Update campaign
DELETE /api/campaigns/<id>                   # Delete campaign
```

---

## 🐛 Troubleshooting

### Port 5000 Already in Use
Edit `backend/run.py` and change the port:
```python
app.run(host='0.0.0.0', port=5001)
```

### ModuleNotFoundError
Make sure virtual environment is activated:
```bash
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### Database Error
Delete the database and start fresh:
```bash
cd backend
rm sna_system.db
python run.py
```

### CSV Import Fails
Check your CSV format matches the required columns exactly.

---

## 📚 Sample Workflow

```bash
# 1. Start server
cd backend
python run.py

# 2. In new terminal, prepare CSV
# (Put your student data in data/raw/my_students.csv)

# 3. Import data
curl -X POST http://localhost:5000/api/analysis/import-csv \
  -F "file=@../data/raw/my_students.csv"

# 4. Run analysis
curl -X POST http://localhost:5000/api/analysis/run-analysis

# 5. Get top influencers
curl http://localhost:5000/api/analysis/top-influencers

# 6. Get network stats
curl http://localhost:5000/api/analysis/network-stats

# 7. Get communities
curl http://localhost:5000/api/analysis/communities
```

---

## ✨ What's Next?

**Phase 2 - Frontend Development:**
- Data entry web form
- Interactive network visualization (D3.js)
- Dashboard with statistics
- Campaign planning tools
- PDF report generation

---

## 📞 Need Help?

Check the main README.md for:
- Full API documentation
- Database schema details
- Contributing guidelines
- Deployment instructions

---

**Backend Status**: ✅ Ready to Use  
**Created**: 2026-06-10  
**Version**: 1.0
