from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from engine import GraphEngine

app = Flask(__name__)
CORS(app)

# Initialize Graph Engine
graph_engine = GraphEngine()

# Pre-load graph on startup (e.g., Manhattan)
print("Initializing map data...")
graph_engine.load_graph(location="Manhattan, New York, USA")

@app.route('/api/health', methods=['GET'])
def health_check():
    """Check if the backend is running."""
    return jsonify({"status": "Backend is running!", "framework": "Flask"})

@app.route('/api/load_city', methods=['POST'])
def load_city():
    """
    Dynamically download and load a new city graph.
    """
    data = request.json
    city_name = data.get('city')
    if not city_name:
        return jsonify({"error": "Missing city name"}), 400
    
    try:
        print(f"Switching to city: {city_name}")
        graph_engine.load_graph(location=city_name)
        return jsonify({"message": f"Successfully loaded {city_name}", "city": city_name})
    except Exception as e:
        print(f"Error loading city: {e}")
        return jsonify({"error": f"Could not load city: {str(e)}"}), 500

@app.route('/api/geocode', methods=['POST'])
def geocode():
    """
    Geocode an address string into lat/lng.
    """
    data = request.json
    address = data.get('address')
    if not address:
        return jsonify({"error": "Missing address"}), 400
    
    result = graph_engine.geocode_address(address)
    if result:
        return jsonify(result)
    else:
        return jsonify({"error": "Could not find location"}), 404

@app.route('/api/graph', methods=['GET'])
def get_graph_data():
    """
    Fetch and return graph nodes and edges for visualization.
    """
    try:
        data = graph_engine.get_graph_json()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/traffic', methods=['POST'])
def update_traffic():
    """
    Simulate traffic congestion on the graph.
    """
    data = request.json
    level = data.get('level', 0) # 0.0 to 1.0
    try:
        graph_engine.update_traffic(level)
        return jsonify({"message": f"Traffic updated to level {level}"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/traffic_state', methods=['GET'])
def get_traffic_state():
    """Returns all edge states and current events."""
    try:
        # Convert tuple keys to strings for JSON serialization
        traffic_serializable = {f"{u},{v}": state for (u, v), state in graph_engine.edge_traffic.items()}
        return jsonify({
            "traffic": traffic_serializable,
            "events": graph_engine.traffic_events
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/simulate_tick', methods=['POST'])
def simulate_tick():
    """Advance simulation one step."""
    try:
        graph_engine.tick()
        return jsonify({
            "message": "Tick successful",
            "events": graph_engine.traffic_events
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/route', methods=['POST'])
def find_route():
    """
    Perform pathfinding between start and end coordinates.
    """
    data = request.json
    start = data.get('start')
    end = data.get('end')
    algorithm = data.get('algorithm', 'dijkstra')
    preference = data.get('preference', 'length') # 'length' or 'travel_time'

    if not start or not end:
        return jsonify({"error": "Missing start or end coordinates"}), 400

    try:
        result = graph_engine.get_route(start, end, algorithm, preference)
        if result:
            return jsonify(result)
        else:
            return jsonify({"error": "No path found between selected locations"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

from google import genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    client = genai.Client(api_key=api_key)
else:
    client = None

@app.route('/api/compare', methods=['POST'])
def compare_algorithms():
    """
    Run all algorithms and return stats + AI analysis.
    """
    data = request.json
    start = data.get('start')
    end = data.get('end')
    preference = data.get('preference', 'length')

    if not start or not end:
        return jsonify({"error": "Missing start or end coordinates"}), 400

    try:
        # 1. Get raw stats from engine
        stats = graph_engine.compare_all_algorithms(start, end, preference)
        
        # 2. Generate AI analysis if possible
        ai_analysis = "AI analysis unavailable (API key missing or error)."
        if client:
            try:
                prompt = f"""
                Act as a Smart Traffic Analyst for an AI Pathfinding System.
                Analyze these pathfinding results for a route in {graph_engine.current_location}:
                
                Results: {stats}
                
                Please provide:
                1. A brief summary of which algorithm performed best and why.
                2. Trade-offs between speed (execution time) and path optimality (distance/time).
                3. A specific recommendation based on current traffic conditions (preference was {preference}).
                4. Insights into search space efficiency (nodes explored).
                
                Keep it professional, insightful, and concise.
                """
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt
                )
                ai_analysis = response.text
            except Exception as ai_err:
                print(f"Gemini API Error: {ai_err}")
                ai_analysis = "AI analysis failed due to an external error."

        return jsonify({
            "stats": stats,
            "ai_analysis": ai_analysis
        })
    except Exception as e:
        print(f"Comparison Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
