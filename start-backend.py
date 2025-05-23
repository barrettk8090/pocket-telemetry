#!/usr/bin/env python3
"""
Simple script to start the DIMO Telemetry Backend server
"""

import subprocess
import sys
import os

def main():
    # Check if we're in the right directory
    if not os.path.exists('backend/main.py'):
        print("❌ Error: backend/main.py not found. Please run this script from the project root.")
        sys.exit(1)
    
    print("🚀 Starting DIMO Telemetry Backend Server...")
    print("📍 Server will run at: http://localhost:8000")
    print("📖 API docs will be available at: http://localhost:8000/docs")
    print("\n🔧 To stop the server, press Ctrl+C")
    print("-" * 50)
    
    try:
        # Start the FastAPI server with uvicorn
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "backend.main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload"
        ], check=True)
    except KeyboardInterrupt:
        print("\n\n✅ Backend server stopped.")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error starting server: {e}")
        print("\n💡 Make sure you have installed the requirements:")
        print("   pip install -r requirements.txt")
        sys.exit(1)

if __name__ == "__main__":
    main() 