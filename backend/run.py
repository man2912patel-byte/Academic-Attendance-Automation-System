import os
from dotenv import load_dotenv

# Load environmental variables from .env if present
load_dotenv()

from app import create_app

app = create_app()

if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    
    app.run(host=host, port=port, debug=debug)
