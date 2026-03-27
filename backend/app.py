from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import requests
from bs4 import BeautifulSoup
import os

app = Flask(__name__)
# Enable CORS so our frontend can access this backend.
CORS(app)

# --- CONFIGURATION ---
# Database Setup: We'll use SQLite for simplicity.
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///rapidtags.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# JWT Setup: Secret key for signing tokens.
app.config['JWT_SECRET_KEY'] = 'your-super-secret-key-change-this-later' 

db = SQLAlchemy(app)
jwt = JWTManager(app)

# --- MODELS ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)

# Initialize the database within the application context.
with app.app_context():
    db.create_all()

# --- AUTH ROUTES ---

@app.route('/api/register', methods=['POST'])
def register():
    """Create a new user."""
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "User already exists"}), 409

    # Use pbkdf2:sha256 which is a secure hashing algorithm.
    hashed_pw = generate_password_hash(password)
    new_user = User(username=username, password=hashed_pw)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully!"}), 201

@app.route('/api/login', methods=['POST'])
def login():
    """Verify credentials and return a token."""
    data = request.json
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if user and check_password_hash(user.password, password):
        # Create a JWT token for the session.
        access_token = create_access_token(identity=str(user.id))
        return jsonify({"access_token": access_token, "username": username}), 200

    return jsonify({"error": "Invalid credentials"}), 401

# --- BUSINESS LOGIC ---

def extract_youtube_tags(url):
    """Fetcher logic remains robust."""
    try:
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        keywords = soup.find('meta', attrs={'name': 'keywords'})
        if keywords:
            tags_list = keywords['content'].split(',')
            return [tag.strip() for tag in tags_list]
        return []
    except Exception as e:
        print(f"Extraction Error: {e}")
        return []

# --- PROTECTED ROUTES ---

@app.route('/api/status', methods=['GET'])
def check_status():
    """Public route for checking backend health."""
    return jsonify({"status": "online", "message": "RapidTags Backend is ready!"})

@app.route('/api/generate-tags', methods=['POST'])
@jwt_required()
def generate_tags():
    """
    PROTECTED: Requires a valid JWT token in the header:
    Authorization: Bearer <token>
    """
    current_user_id = get_jwt_identity() # Can be used to track usage per user.
    data = request.json
    video_url = data.get('url')

    if not video_url:
        return jsonify({"error": "No URL provided!"}), 400

    tags = extract_youtube_tags(video_url)
    return jsonify({
        "url": video_url,
        "count": len(tags),
        "tags": tags
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
