# UTAS Social Network Analysis System

A comprehensive social network analysis system for student political campaign planning at the University of Technology and Applied Science (UTAS) Navrongo Campus.

## Project Overview

This system collects friendship network data from undergraduate students, analyzes the resulting graph using centrality metrics and community detection algorithms, and delivers an interactive visualization dashboard alongside automated campaign strategy recommendations.

### Key Features

- **Data Collection**: Import student connection data via unified CSV format
- **Network Analysis**: Calculate degree, betweenness, closeness centrality, PageRank, and clustering coefficients
- **Community Detection**: Identify student groups using Louvain algorithm
- **Influence Scoring**: ML-based influence tier classification (High/Medium/Low)
- **Bridge Node Identification**: Find students connecting different communities
- **Campaign Planning**: Get recommendations for targeted outreach strategies
- **RESTful API**: Complete backend API for all operations
- **Data Support**: Track party affiliation (TESCON/TEIN), tribe, college, department, and year level

## Technology Stack

### Backend
- **Framework**: Flask 2.3.0
- **Database**: SQLAlchemy + SQLite (default, PostgreSQL ready)
- **SNA Analysis**: NetworkX 3.1
- **Community Detection**: python-louvain
- **ML**: scikit-learn
- **Data Processing**: Pandas, NumPy

### Frontend (Coming Soon)
- **Framework**: React/Vue.js (planned)
- **Visualization**: D3.js / Cytoscape.js
- **Charts**: Plotly

## Project Structure

```
UTAS_SNA_System/
├── backend/
│   ├── app/
│   │   ├── __init__.py           # Flask app factory
│   │   ├── models/               # SQLAlchemy models
│   │   │   └── __init__.py       # Student, Connection, Campaign models
│   │   ├── api/                  # RESTful API endpoints
│   │   │   ├── students.py       # Student CRUD + stats
│   │   │   ├── connections.py    # Connection CRUD + relationships
│   │   │   ├── analysis.py       # SNA analysis & metrics
│   │   │   └── campaigns.py      # Campaign management
│   │   ├── services/             # Business logic
│   │   │   ├── data_importer.py  # CSV import & validation
│   │   │   └── sna_engine.py     # NetworkX SNA calculations
│   │   └── utils/                # Helper utilities
│   ├── run.py                    # Flask development server
│   └── config.py                 # Configuration (future)
├── data/
│   ├── raw/                      # Raw CSV imports
│   │   └── sample_data.csv       # Sample student network data
│   └── processed/                # Processed/cleaned data
├── notebooks/                    # Jupyter analysis notebooks
├── frontend/                     # Frontend code (future)
├── docs/                         # Documentation
├── requirements.txt              # Python dependencies
└── README.md                     # This file
```

## Installation & Setup

### Prerequisites
- Python 3.8+
- pip (Python package manager)
- Git (for version control)

### Step 1: Clone Repository
```bash
cd UTAS_SNA_System
```

### Step 2: Create Virtual Environment
```bash
# On Windows
python -m venv venv
venv\Scripts\activate

# On macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Run the Backend Server
```bash
cd backend
python run.py
```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check
```
GET /health
```

### Students API
```
GET    /api/students                    # List all students
GET    /api/students/<id>               # Get single student
POST   /api/students                    # Create student
PUT    /api/students/<id>               # Update student
DELETE /api/students/<id>               # Delete student
GET    /api/students/stats/summary      # Get student statistics
```

### Connections API
```
GET    /api/connections                 # List all connections
GET    /api/connections/<id>            # Get single connection
POST   /api/connections                 # Create connection
PUT    /api/connections/<id>            # Update connection
DELETE /api/connections/<id>            # Delete connection
GET    /api/connections/student/<id>/friends  # Get friends of student
GET    /api/connections/stats/summary   # Get connection statistics
```

### Analysis API
```
POST   /api/analysis/import-csv         # Import CSV data file
POST   /api/analysis/run-analysis       # Run full SNA analysis
GET    /api/analysis/top-influencers    # Get top influencers
GET    /api/analysis/communities        # Get community information
GET    /api/analysis/centrality/<type>  # Get centrality scores (degree/betweenness/closeness/pagerank)
GET    /api/analysis/bridge-nodes       # Get bridge nodes
GET    /api/analysis/network-stats      # Get network statistics
```

### Campaigns API
```
GET    /api/campaigns                   # List all campaigns
GET    /api/campaigns/<id>              # Get single campaign
POST   /api/campaigns                   # Create campaign
PUT    /api/campaigns/<id>              # Update campaign
DELETE /api/campaigns/<id>              # Delete campaign
```

## CSV Data Format

The system uses a unified CSV file format containing both student information and their connections.

### CSV Structure
```
from_student_id, from_name, from_tribe, from_party, from_college, from_department, from_year,
to_student_id, to_name, to_tribe, to_party, to_college, to_department, to_year,
strength, relationship_type
```

### Fields
- **from_student_id**: Source student identifier (e.g., S001)
- **from_name**: Source student name
- **from_tribe**: Source student's ethnic/cultural background
- **from_party**: Political party (TESCON for NPP, TEIN for NDC)
- **from_college**: Source student's college
- **from_department**: Source student's department
- **from_year**: Source student's year level (1-4)
- **to_student_id**: Target student identifier
- **to_name**: Target student name
- **to_tribe**: Target student's tribe
- **to_party**: Target student's political party
- **to_college**: Target student's college
- **to_department**: Target student's department
- **to_year**: Target student's year level
- **strength**: Friendship strength (1-5 scale)
- **relationship_type**: Type of relationship (e.g., "Close Friend", "Best Friend", "Acquaintance")

### Example CSV Entry
```csv
S001,Ahmed,Kusasi,TESCON,Engineering,IT,3,S002,Fatima,Mamprusi,TEIN,Business,Finance,2,4,Close Friend
```

## Database Schema

### Students Table
- `id`: Primary key
- `student_id`: Unique student identifier
- `name`: Student name
- `tribe`: Ethnic/cultural background
- `party`: TESCON or TEIN
- `college`: College/Faculty
- `department`: Department
- `year`: Year level (1-4)
- `email`: Email address (optional)
- `phone`: Phone number (optional)

### Connections Table
- `id`: Primary key
- `from_student_id`: Source student (FK)
- `to_student_id`: Target student (FK)
- `strength`: Friendship strength (1-5)
- `relationship_type`: Type of relationship

### Network Metrics Table
- `student_id`: Student reference (FK)
- `degree_centrality`: Degree centrality score
- `betweenness_centrality`: Betweenness centrality score
- `closeness_centrality`: Closeness centrality score
- `pagerank_score`: PageRank score
- `clustering_coefficient`: Clustering coefficient
- `community_id`: Detected community ID
- `influence_tier`: High/Medium/Low classification
- `bridge_node`: Boolean flag for bridge nodes

### Campaigns Table
- `campaign_id`: Unique campaign identifier
- `campaign_name`: Campaign name
- `manager_id`: Campaign manager (FK to Students)
- `target_party`: Target party (TESCON/TEIN)
- `start_date`: Campaign start date
- `end_date`: Campaign end date
- `status`: planning/active/completed

## Usage Examples

### 1. Import CSV Data
```bash
curl -X POST http://localhost:5000/api/analysis/import-csv \
  -F "file=@data/raw/sample_data.csv"
```

### 2. Run Full SNA Analysis
```bash
curl -X POST http://localhost:5000/api/analysis/run-analysis
```

### 3. Get Top Influencers
```bash
curl http://localhost:5000/api/analysis/top-influencers?limit=10
```

### 4. Get Network Statistics
```bash
curl http://localhost:5000/api/analysis/network-stats
```

### 5. Get Community Information
```bash
curl http://localhost:5000/api/analysis/communities
```

### 6. Get Students by Party
```bash
curl "http://localhost:5000/api/students?party=TESCON"
```

## Analysis Metrics Explained

### Degree Centrality
- **Definition**: Number of direct connections a student has
- **Interpretation**: Students with high degree are popular and have broad networks
- **Use Case**: Identify immediately influential students

### Betweenness Centrality
- **Definition**: How often a student lies on the shortest path between other pairs
- **Interpretation**: Students with high betweenness are information brokers and bridges between groups
- **Use Case**: Find students who can spread messages across communities

### Closeness Centrality
- **Definition**: How quickly a student can reach all others in the network
- **Interpretation**: Students with high closeness can spread information fast
- **Use Case**: Identify early adopters and fast message spreaders

### PageRank
- **Definition**: Importance score based on quality and quantity of connections
- **Interpretation**: Like Google's PageRank for networks
- **Use Case**: Overall influence ranking

### Clustering Coefficient
- **Definition**: How tightly clustered a student's friends are
- **Interpretation**: High clustering = tight-knit friend group
- **Use Case**: Identify cohesive friend groups

### Community Detection (Louvain)
- **Definition**: Partitions students into groups with high internal connectivity
- **Interpretation**: Natural social clusters based on friendship patterns
- **Use Case**: Identify distinct student communities/factions

## Next Steps (Frontend Development)

The backend is now complete. Next phases:

1. **Data Entry Interface**: Web form for manual student/connection entry
2. **Network Visualization**: Interactive D3.js/Cytoscape graph display
3. **Dashboard**: Summary statistics and analytics panels
4. **Campaign Planning Tools**: Reach simulator and strategy recommendations
5. **Report Generation**: Automated PDF campaign reports

## Development Notes

### Database Reset
To clear the database and start fresh:
```python
from app import create_app
from app.models import db

app = create_app()
with app.app_context():
    db.drop_all()
    db.create_all()
```

### Enable Debug Mode
Set `debug=True` in `run.py` (already enabled for development)

### View Database
Use SQLite client to inspect the database:
```bash
sqlite3 sna_system.db
sqlite> .tables
sqlite> SELECT COUNT(*) FROM students;
```

## Troubleshooting

### Port 5000 Already in Use
Change port in `run.py`:
```python
app.run(host='0.0.0.0', port=5001)
```

### Import Errors
Ensure virtual environment is activated and dependencies are installed:
```bash
pip install -r requirements.txt
```

### Database Errors
Delete `sna_system.db` and let the app recreate it:
```bash
rm sna_system.db
python run.py
```

## Testing

Run the Flask development server and test endpoints using:
- **cURL**: Command line HTTP client
- **Postman**: GUI API testing tool
- **Python requests**: `import requests; requests.get('http://localhost:5000/api/students')`

## Contributing

For development contributions:
1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Submit for review

## License

University of Technology and Applied Science (UTAS) Capstone Project

## Contact & Support

For issues or questions, contact the development team.

---

**Status**: Phase 1 - Backend Foundation ✅ Complete  
**Next**: Phase 2 - Frontend Development  
**Last Updated**: 2026-06-10
