#!/usr/bin/env python
"""
UTAS SNA System - Backend Server
Social Network Analysis for Student Political Campaign Planning
"""

from app import create_app
import logging

if __name__ == '__main__':
    app = create_app('development')
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logger = logging.getLogger(__name__)
    logger.info("Starting UTAS SNA System Backend")
    
    # Run development server
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        use_reloader=True
    )
