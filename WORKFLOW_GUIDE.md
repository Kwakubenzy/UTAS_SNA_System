# UTAS SNA System - Complete Workflow Guide

## 🎯 End-to-End Usage Example

This guide shows how to use the UTAS SNA system from data collection to campaign insights.

---

## Phase 1: Prepare Your Data

### Step 1.1: Collect Student Information

Go to campus and collect the following from each student:

```
Student: Ahmed (S001)
Tribe: Kusasi
Party: TESCON (NPP supporter)
College: Engineering
Department: IT
Year: 3

Friends they interact with:
- S002 (Fatima) - Very close - strength 5
- S003 (Mohammed) - Close - strength 4
- S005 (Khalid) - Friend - strength 2
```

### Step 1.2: Create CSV File

Organize all collected data in a CSV file with this structure:

**File: `data/raw/my_students.csv`**

```csv
from_student_id,from_name,from_tribe,from_party,from_college,from_department,from_year,to_student_id,to_name,to_tribe,to_party,to_college,to_department,to_year,strength,relationship_type
S001,Ahmed,Kusasi,TESCON,Engineering,IT,3,S002,Fatima,Mamprusi,TEIN,Business,Finance,2,4,Close Friend
S001,Ahmed,Kusasi,TESCON,Engineering,IT,3,S003,Mohammed,Kusasi,TESCON,Engineering,IT,3,5,Best Friend
S002,Fatima,Mamprusi,TEIN,Business,Finance,2,S004,Sara,Dagomba,TESCON,Education,English,1,3,Friend
S003,Mohammed,Kusasi,TESCON,Engineering,IT,3,S005,Khalid,Mamprusi,TESCON,Business,Marketing,4,2,Acquaintance
```

---

## Phase 2: Start the System

### Step 2.1: Start Demo Server

```bash
cd UTAS_SNA_System
python demo_server.py
```

Output:
```
🚀 UTAS SNA System - Lightweight Demo Server
============================================================
📡 Server starting on http://localhost:5000
✅ Server running!
```

### Step 2.2: Verify Server is Running

In a **new terminal window**, test:

```bash
curl http://localhost:5000/health
```

Response:
```json
{"status": "OK", "server": "UTAS SNA Demo"}
```

---

## Phase 3: Import Data

### Step 3.1: Load Your CSV File

```bash
curl -X POST http://localhost:5000/api/analysis/import-csv \
  -F "file=@data/raw/my_students.csv"
```

Expected Response:
```json
{
  "success": true,
  "total_rows": 4,
  "valid_rows": 4,
  "students_created": 5,
  "connections_created": 4
}
```

**What happened:**
- ✅ 4 rows processed from CSV
- ✅ 5 unique students added to database (S001-S005)
- ✅ 4 connections (friendships) recorded

### Step 3.2: Verify Data Imported

```bash
curl http://localhost:5000/api/students
```

Response:
```json
{
  "success": true,
  "count": 5,
  "students": [
    {
      "id": 1,
      "student_id": "S001",
      "name": "Ahmed",
      "tribe": "Kusasi",
      "party": "TESCON",
      "college": "Engineering",
      "department": "IT",
      "year": 3
    },
    ...
  ]
}
```

---

## Phase 4: Run Analysis

### Step 4.1: Execute SNA Analysis

```bash
curl -X POST http://localhost:5000/api/analysis/run-analysis
```

Expected Response:
```json
{
  "success": true,
  "message": "Analysis completed successfully",
  "metrics": {
    "nodes": 5,
    "edges": 4,
    "metrics_calculated": [
      "degree_centrality",
      "betweenness_centrality",
      "closeness_centrality",
      "pagerank",
      "clustering_coefficient",
      "communities",
      "bridge_nodes",
      "influence_tiers"
    ]
  }
}
```

**What happened:**
- ✅ NetworkX built graph from 5 students and 4 connections
- ✅ Calculated all centrality measures
- ✅ Detected communities/groups
- ✅ Identified bridge nodes
- ✅ Computed influence tiers
- ✅ Saved results to database

---

## Phase 5: Get Campaign Insights

### 5.1: View Network Statistics

```bash
curl http://localhost:5000/api/analysis/network-stats
```

Response:
```json
{
  "success": true,
  "network_stats": {
    "total_students": 5,
    "total_connections": 4,
    "network_density": 0.2,
    "average_degree_centrality": 0.8,
    "community_count": 2,
    "bridge_node_count": 1,
    "influence_distribution": {
      "High": 1,
      "Medium": 2,
      "Low": 2
    }
  }
}
```

**Interpretation:**
- 5 students in the network
- Network is relatively sparse (density 0.2)
- Average person knows 0.8 others
- 2 distinct communities/groups
- 1 student bridges between communities

### 5.2: Get Top Influencers

```bash
curl http://localhost:5000/api/analysis/top-influencers
```

Response:
```json
{
  "success": true,
  "count": 5,
  "influencers": [
    {
      "student_id": "S001",
      "name": "Ahmed",
      "party": "TESCON",
      "college": "Engineering",
      "degree_centrality": 0.8,
      "influence_tier": "High"
    },
    {
      "student_id": "S003",
      "name": "Mohammed",
      "party": "TESCON",
      "college": "Engineering",
      "degree_centrality": 0.6,
      "influence_tier": "High"
    },
    ...
  ]
}
```

**Campaign Insight:**
- 🎯 **Target Ahmed First** - He has the most connections (0.8)
- 🎯 **Target Mohammed Second** - Also well-connected
- 🔗 Together, they can reach most of Engineering college

### 5.3: Find Bridge Nodes

```bash
curl http://localhost:5000/api/analysis/bridge-nodes
```

Response:
```json
{
  "success": true,
  "count": 1,
  "bridge_nodes": [
    {
      "student_id": "S002",
      "name": "Fatima",
      "betweenness_centrality": 0.75,
      "community_id": 1
    }
  ]
}
```

**Campaign Insight:**
- 🌉 **Fatima is a Bridge** - She connects different communities
- 🎯 If you reach Fatima, your message crosses between groups

### 5.4: Analyze Communities

```bash
curl http://localhost:5000/api/analysis/communities
```

Response:
```json
{
  "success": true,
  "community_count": 2,
  "communities": [
    {
      "community_id": 1,
      "size": 3,
      "party_breakdown": {
        "TESCON": 2,
        "TEIN": 1
      },
      "college_breakdown": {
        "Engineering": 2,
        "Business": 1
      },
      "students": [...]
    },
    {
      "community_id": 2,
      "size": 2,
      "party_breakdown": {
        "TESCON": 1,
        "TEIN": 1
      },
      "college_breakdown": {
        "Education": 1,
        "Business": 1
      },
      "students": [...]
    }
  ]
}
```

**Campaign Insight:**
- **Community 1** (3 students): Engineering + Business, mostly TESCON
- **Community 2** (2 students): Education + Business, balanced parties
- Different campaigns needed for each community

---

## Phase 6: Campaign Planning Decisions

### Based on Analysis Results:

#### 🎯 Strategy 1: Maximum Reach (All Communities)

1. **Target Ahmed** (Degree: 0.8) → Reaches Engineering + Business
2. **Target Fatima** (Betweenness: 0.75) → Bridges between communities
3. **Result:** Message reaches all 5 students

#### 🎯 Strategy 2: TESCON Voters Only

1. **Target Ahmed** (TESCON, Degree: 0.8)
2. **Target Mohammed** (TESCON, Degree: 0.6)
3. **Skip S002** (TEIN party affiliation)
4. **Result:** Message reaches 3 TESCON supporters in core group

#### 🎯 Strategy 3: Cross-Party Support

1. **Target Fatima** (TEIN, bridge position)
2. **Target Ahmed** (TESCON, high degree)
3. **Result:** Bipartisan coalition, reaches both party supporters

---

## Phase 7: Results Interpretation

### Understanding Centrality Scores:

**Ahmed's Profile:**
```
Degree Centrality: 0.8 (Most connected)
├─ Directly knows: S002, S003, S005
└─ Reach: Can broadcast to 3 people

Betweenness: 0.3 (Some bridging)
├─ Sits on paths between: S003-S005
└─ Information control: Moderate

Closeness: 0.9 (Can reach everyone quickly)
├─ Average distance: ~1.5 steps
└─ Speed of spread: Very fast
```

**Fatima's Profile:**
```
Degree Centrality: 0.4 (Connected)
├─ Directly knows: S001, S004
└─ Reach: Can broadcast to 2 people

Betweenness: 0.75 (MAJOR bridge!)
├─ Sits on paths between: Engineering ↔ Business/Education
└─ Information control: High - connects communities

Closeness: 0.7 (Good reach)
├─ Average distance: ~2 steps
└─ Speed of spread: Fast
```

---

## Phase 8: Action Items Checklist

```
☐ Collect network data from campus
☐ Format data into CSV file
☐ Validate CSV format is correct
☐ Place CSV in data/raw/ folder
☐ Start demo_server.py
☐ Test /health endpoint
☐ Import CSV data via API
☐ Verify students loaded
☐ Run analysis
☐ Get top influencers
☐ Get communities
☐ Get bridge nodes
☐ Get network stats
☐ Plan campaign strategy
☐ Execute targeted outreach
```

---

## 📊 Sample Campaign Report

**Generated From Analysis:**

```
CAMPAIGN STRATEGY REPORT
UTAS Student Political Campaign Planning
================================================================

NETWORK OVERVIEW:
- Total Students: 5
- Connections: 4
- Communities: 2
- Network Reach: 100% (all communities covered)

TOP INFLUENCERS TO TARGET:
1. Ahmed (TESCON) - Degree: 0.8 - HIGH influence
2. Mohammed (TESCON) - Degree: 0.6 - HIGH influence
3. Fatima (TEIN) - Betweenness: 0.75 - KEY BRIDGE

COMMUNITY BREAKDOWN:
- Community A (3 students): Engineering/Business - TESCON majority
- Community B (2 students): Education/Business - Balanced

OUTREACH STRATEGY:
Phase 1: Contact Ahmed → Reaches 3 students in core group
Phase 2: Contact Fatima → Bridges to Education/Business wing
Phase 3: Follow-up through Mohammed → Consolidates Engineering

PROJECTED REACH: 80-90% of target network within 3 days
```

---

## 🚀 Next Steps

1. **Collect More Data** - Expand beyond 5 students
2. **Run Regular Analysis** - Track network changes over time
3. **Build Frontend UI** - Web dashboard for visualization
4. **Generate Reports** - Automated PDF campaign plans
5. **Implement ML Models** - Predict influence, segment voters

---

**Timeline:** ~30 minutes from data entry to campaign insights  
**Accuracy:** Improves with more students (min 50, optimal 150+)  
**Update Frequency:** Weekly or before major campaign events
