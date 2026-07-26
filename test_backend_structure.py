#!/usr/bin/env python
"""
UTAS SNA System - Backend Structure Test
Tests if all modules are properly created and can be imported
"""

import sys
import os

def test_imports():
    """Test if all backend modules can be imported"""
    print("🧪 Testing Backend Module Structure...\n")
    
    tests_passed = 0
    tests_failed = 0
    
    # Test 1: Import Flask
    try:
        import flask
        print("✅ Flask imported successfully")
        tests_passed += 1
    except ImportError as e:
        print(f"❌ Flask import failed: {e}")
        tests_failed += 1
    
    # Test 2: Import SQLAlchemy
    try:
        from flask_sqlalchemy import SQLAlchemy
        print("✅ Flask-SQLAlchemy imported successfully")
        tests_passed += 1
    except ImportError as e:
        print(f"❌ Flask-SQLAlchemy import failed: {e}")
        tests_failed += 1
    
    # Test 3: Import NetworkX
    try:
        import networkx as nx
        print("✅ NetworkX imported successfully")
        tests_passed += 1
    except ImportError as e:
        print(f"⚠️  NetworkX not yet installed (needed for SNA): {e}")
        tests_failed += 1
    
    # Test 4: Check project structure
    print("\n📁 Checking project structure...\n")
    
    required_dirs = [
        'backend',
        'backend/app',
        'backend/app/api',
        'backend/app/models',
        'backend/app/services',
        'backend/app/utils',
        'data',
        'data/raw',
        'data/processed',
        'notebooks',
        'frontend',
        'docs'
    ]
    
    for directory in required_dirs:
        dir_path = os.path.join(os.path.dirname(__file__), directory)
        if os.path.exists(dir_path):
            print(f"✅ {directory}")
            tests_passed += 1
        else:
            print(f"❌ {directory} NOT FOUND")
            tests_failed += 1
    
    # Test 5: Check required files
    print("\n📄 Checking core files...\n")
    
    required_files = [
        'backend/app/__init__.py',
        'backend/app/models/__init__.py',
        'backend/app/api/__init__.py',
        'backend/app/api/students.py',
        'backend/app/api/connections.py',
        'backend/app/api/analysis.py',
        'backend/app/api/campaigns.py',
        'backend/app/services/__init__.py',
        'backend/app/services/data_importer.py',
        'backend/app/services/sna_engine.py',
        'backend/run.py',
        'data/raw/sample_data.csv',
        'requirements.txt',
        'README.md'
    ]
    
    for file_path in required_files:
        full_path = os.path.join(os.path.dirname(__file__), file_path)
        if os.path.exists(full_path):
            file_size = os.path.getsize(full_path)
            print(f"✅ {file_path} ({file_size} bytes)")
            tests_passed += 1
        else:
            print(f"❌ {file_path} NOT FOUND")
            tests_failed += 1
    
    # Summary
    print("\n" + "="*60)
    print(f"RESULTS: {tests_passed} passed, {tests_failed} failed")
    print("="*60)
    
    if tests_failed == 0:
        print("\n✅ All tests passed! Backend structure is ready.")
        return 0
    else:
        print(f"\n⚠️  {tests_failed} issues found. Please review above.")
        return 1

def main():
    """Main test runner"""
    print("="*60)
    print("UTAS SNA System - Backend Validation")
    print("="*60 + "\n")
    
    exit_code = test_imports()
    
    print("\n" + "="*60)
    print("NEXT STEPS:")
    print("="*60)
    print("""
1. Install dependencies:
   cd backend
   python -m pip install -r ../requirements.txt

2. Run the backend server:
   python run.py

3. Test API endpoints:
   curl http://localhost:5000/health
   
4. Import CSV data:
   curl -X POST http://localhost:5000/api/analysis/import-csv \\
     -F "file=@../data/raw/sample_data.csv"

5. Run SNA analysis:
   curl -X POST http://localhost:5000/api/analysis/run-analysis

6. Get results:
   curl http://localhost:5000/api/analysis/top-influencers
   curl http://localhost:5000/api/analysis/network-stats
""")
    
    return exit_code

if __name__ == '__main__':
    sys.exit(main())
