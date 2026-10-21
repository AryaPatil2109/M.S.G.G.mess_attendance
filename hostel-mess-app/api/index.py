import os
import sys

# Ensure backend root is on Python's path so imports like "from db import connect" succeed
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from app import app

# Vercel Serverless Function entry point
app = app
