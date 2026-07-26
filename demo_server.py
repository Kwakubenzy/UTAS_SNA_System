#!/usr/bin/env python
"""
UTAS SNA System - Lightweight Demo Server (No External Dependencies)
Tests core functionality without needing pip install
"""

import json
import sqlite3
import os
from datetime import datetime

# Simple HTTP server
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

class Database:
    """Simple SQLite database handler"""
    
    def __init__(self, db_file='sna_system.db'):
        self.db_file = db_file
        self.init_db()
    
    def init_db(self):
        """Initialize database tables"""
        conn = sqlite3.connect(self.db_file)
        c = conn.cursor()
        
        # Students table
        c.execute('''CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY,
            student_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            tribe TEXT,
            party TEXT NOT NULL,
            college TEXT NOT NULL,
            department TEXT NOT NULL,
            year INTEGER NOT NULL,
            email TEXT,
            phone TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )''')
        
        # Connections table
        c.execute('''CREATE TABLE IF NOT EXISTS connections (
            id INTEGER PRIMARY KEY,
            from_student_id INTEGER NOT NULL,
            to_student_id INTEGER NOT NULL,
            strength INTEGER DEFAULT 1,
            relationship_type TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(from_student_id) REFERENCES students(id),
            FOREIGN KEY(to_student_id) REFERENCES students(id)
        )''')
        
        # Network metrics
        c.execute('''CREATE TABLE IF NOT EXISTS network_metrics (
            id INTEGER PRIMARY KEY,
            student_id INTEGER UNIQUE NOT NULL,
            degree_centrality REAL DEFAULT 0.0,
            betweenness_centrality REAL DEFAULT 0.0,
            closeness_centrality REAL DEFAULT 0.0,
            pagerank_score REAL DEFAULT 0.0,
            community_id INTEGER DEFAULT -1,
            influence_tier TEXT DEFAULT 'Low',
            bridge_node BOOLEAN DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(student_id) REFERENCES students(id)
        )''')
        
        conn.commit()
        conn.close()
    
    def get_connection(self):
        return sqlite3.connect(self.db_file)

class SNAHandler(BaseHTTPRequestHandler):
    """HTTP request handler for SNA API"""
    
    db = Database()
    
    def do_GET(self):
        """Handle GET requests"""
        try:
            if self.path == '/health':
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = json.dumps({'status': 'OK', 'server': 'UTAS SNA Demo'})
                self.wfile.write(response.encode())
            
            elif self.path.startswith('/api/students'):
                self.handle_students_get()
            
            elif self.path.startswith('/api/analysis/network-stats'):
                self.handle_network_stats()
            
            elif self.path.startswith('/api/analysis/top-influencers'):
                self.handle_top_influencers()
            
            else:
                self.send_response(404)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = json.dumps({'error': 'Endpoint not found'})
                self.wfile.write(response.encode())
        
        except Exception as e:
            self.send_error(500, str(e))
    
    def handle_students_get(self):
        """Get all students"""
        conn = self.db.get_connection()
        c = conn.cursor()
        c.execute('SELECT * FROM students')
        rows = c.fetchall()
        conn.close()
        
        students = []
        for row in rows:
            students.append({
                'id': row[0],
                'student_id': row[1],
                'name': row[2],
                'tribe': row[3],
                'party': row[4],
                'college': row[5],
                'department': row[6],
                'year': row[7]
            })
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = json.dumps({
            'success': True,
            'count': len(students),
            'students': students
        })
        self.wfile.write(response.encode())
    
    def handle_network_stats(self):
        """Get network statistics"""
        conn = self.db.get_connection()
        c = conn.cursor()
        
        # Get stats
        c.execute('SELECT COUNT(*) FROM students')
        total_students = c.fetchone()[0]
        
        c.execute('SELECT COUNT(*) FROM connections')
        total_connections = c.fetchone()[0]
        
        c.execute('SELECT COUNT(DISTINCT community_id) FROM network_metrics')
        communities = c.fetchone()[0]
        
        c.execute('SELECT COUNT(*) FROM network_metrics WHERE bridge_node = 1')
        bridge_nodes = c.fetchone()[0]
        
        c.execute('SELECT AVG(degree_centrality) FROM network_metrics')
        avg_degree = c.fetchone()[0] or 0
        
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = json.dumps({
            'success': True,
            'network_stats': {
                'total_students': total_students,
                'total_connections': total_connections,
                'community_count': communities,
                'bridge_node_count': bridge_nodes,
                'average_degree_centrality': float(avg_degree)
            }
        })
        self.wfile.write(response.encode())
    
    def handle_top_influencers(self):
        """Get top influencers"""
        conn = self.db.get_connection()
        c = conn.cursor()
        
        query = '''
            SELECT s.*, m.degree_centrality, m.betweenness_centrality, 
                   m.closeness_centrality, m.influence_tier
            FROM students s
            LEFT JOIN network_metrics m ON s.id = m.student_id
            ORDER BY m.influence_tier DESC, m.degree_centrality DESC
            LIMIT 10
        '''
        
        c.execute(query)
        rows = c.fetchall()
        conn.close()
        
        influencers = []
        for row in rows:
            influencers.append({
                'student_id': row[1],
                'name': row[2],
                'party': row[4],
                'college': row[5],
                'degree_centrality': row[11] or 0,
                'influence_tier': row[14] or 'Low'
            })
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = json.dumps({
            'success': True,
            'count': len(influencers),
            'influencers': influencers
        })
        self.wfile.write(response.encode())
    
    def log_message(self, format, *args):
        """Suppress default logging"""
        pass

def main():
    """Start the demo server"""
    PORT = 5000
    
    print("\n" + "="*60)
    print("🚀 UTAS SNA System - Lightweight Demo Server")
    print("="*60)
    print(f"\n📡 Server starting on http://localhost:{PORT}\n")
    
    server = HTTPServer(('localhost', PORT), SNAHandler)
    
    print("✅ Server running! Test endpoints:\n")
    print("  Health check:")
    print("    curl http://localhost:5000/health\n")
    
    print("  Get all students:")
    print("    curl http://localhost:5000/api/students\n")
    
    print("  Get network stats:")
    print("    curl http://localhost:5000/api/analysis/network-stats\n")
    
    print("  Get top influencers:")
    print("    curl http://localhost:5000/api/analysis/top-influencers\n")
    
    print("🛑 Press Ctrl+C to stop server\n")
    print("="*60 + "\n")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped")
        server.server_close()

if __name__ == '__main__':
    main()
