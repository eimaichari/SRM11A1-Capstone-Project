import sqlite3
from flask import Flask, jsonify, request, g
from flask_cors import CORS # To allow frontend to talk to backend
import os

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

DATABASE = 'water_status.db' # SQLite database file

# --- Database Functions ---
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row # Return rows as dicts
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS areas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                status TEXT NOT NULL, -- e.g., 'Normal', 'Outage', 'Low Pressure'
                details TEXT,         -- e.g., 'Planned Maintenance', 'Burst Pipe'
                eta TEXT              -- e.g., '6 PM today', 'Unknown'
            )
        ''')
        db.commit()
        # Optionally add some initial data if the table is empty
        cursor.execute("INSERT OR IGNORE INTO areas (name, status, details, eta) VALUES (?, ?, ?, ?)", ('randburg', 'Outage', 'Planned Maintenance', '6 PM today'))
        cursor.execute("INSERT OR IGNORE INTO areas (name, status, details, eta) VALUES (?, ?, ?, ?)", ('rosebank', 'Normal', 'All clear', 'N/A'))
        cursor.execute("INSERT OR IGNORE INTO areas (name, status, details, eta) VALUES (?, ?, ?, ?)", ('soweto', 'Low Pressure', 'High demand', 'Expected to improve by 10 PM'))
        db.commit()


# --- API Endpoints ---

# GET all areas (or search)
@app.route('/api/areas', methods=['GET'])
def get_areas():
    search_query = request.args.get('search', '').lower()
    db = get_db()
    cursor = db.cursor()
    if search_query:
        cursor.execute("SELECT * FROM areas WHERE LOWER(name) LIKE ?", ('%' + search_query + '%',))
    else:
        cursor.execute("SELECT * FROM areas")
    areas = [dict(row) for row in cursor.fetchall()]
    return jsonify(areas)

# GET single area by name (or ID)
@app.route('/api/areas/<string:area_name>', methods=['GET'])
def get_area_status(area_name):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM areas WHERE LOWER(name) = ?", (area_name.lower(),))
    area = cursor.fetchone()
    if area:
        return jsonify(dict(area))
    return jsonify({"error": "Area not found"}), 404

# ADMIN: Update status of an area (Simple Auth for PoC)
@app.route('/api/admin/areas/<string:area_name>', methods=['PUT'])
def update_area_status(area_name):
    # VERY basic PoC authentication - DO NOT USE IN PRODUCTION
    if request.headers.get('X-Admin-Key') != 'YOUR_SECRET_ADMIN_KEY':
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    if not data or not all(k in data for k in ['status', 'details', 'eta']):
        return jsonify({"error": "Missing data"}), 400

    db = get_db()
    cursor = db.cursor()
    cursor.execute("UPDATE areas SET status = ?, details = ?, eta = ? WHERE LOWER(name) = ?",
                   (data['status'], data['details'], data['eta'], area_name.lower()))
    db.commit()
    if cursor.rowcount == 0:
        return jsonify({"error": "Area not found"}), 404
    return jsonify({"message": "Status updated successfully", "area_name": area_name}), 200


if __name__ == '__main__':
    # Initialize the database when the app starts (or manually for first run)
    init_db()
    app.run(debug=True, port=5000) # Run in debug mode for development
