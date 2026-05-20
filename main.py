import os
import shutil
import requests
import re
import math
import uvicorn
from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import psycopg2
from google import genai

# ==========================================
# 1. CONFIGURATION & SETUP
# ==========================================
# ⚠️ Security Note: Pulling API key from Render Environment Variables!
import os
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)
# Connected directly to Render Cloud Database with SSL!
DATABASE_URL = "postgresql://forestconnect_db_user:b6uaz0jAo7TsUSuOdTEN6WVYhw80gdoE@dpg-d85thc0jo89c7380gd3g-a.singapore-postgres.render.com/forestconnect_db?sslmode=require"
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# Folder setup for photo uploads
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

class UserQuery(BaseModel):
    question: str

def get_db_connection():
    try:
        # psycopg2 can read the URL string directly!
        return psycopg2.connect(DATABASE_URL)
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return None

# ==========================================
# 1.5. HOME PAGE ROUTE (FIXES "NOT FOUND")
# ==========================================
@app.get("/")
def read_root():
    return {"message": "🌳 Welcome to the ForestConnect API Backend! The cloud server is running perfectly."}

# ==========================================
# 2. OPENALEX RESEARCH ENGINE
# ==========================================
def reconstruct_abstract(inverted_index):
    if not inverted_index: return "No abstract available."
    try:
        max_idx = max([idx for positions in inverted_index.values() for idx in positions])
        words = [""] * (max_idx + 1)
        for word, positions in inverted_index.items():
            for pos in positions: words[pos] = word
        return " ".join(words)
    except Exception: return "Error reconstructing abstract."

def fetch_research_papers(query: str):
    stop_words = {"what", "is", "the", "tell", "me", "about", "how", "why", "where", "can", "you", "explain", "describe", "a", "an", "of", "in", "on", "and", "to", "for", "give", "some"}
    words = re.findall(r'\b\w+\b', query.lower())
    keywords = [w for w in words if w not in stop_words]
    clean_query = " ".join(keywords)

    url = "https://api.openalex.org/works"
    
    def do_search(search_str):
        params = {
            'search': search_str, 
            'per_page': 5,
            'mailto': '2024279544@student.uitm.edu.my',
            'filter': 'has_abstract:true', 
            'sort': 'cited_by_count:desc' 
        }
        try:
            resp = requests.get(url, params=params, timeout=10)
            if resp.status_code == 200: return resp.json().get('results', [])
            return []
        except: return []

    results = do_search(f"{clean_query} Malaysia")
    if not results and keywords: results = do_search(f"{max(keywords, key=len)} Malaysia forest")
    if not results: results = do_search("Malaysia forest conservation biodiversity")
        
    context_block = ""
    citations_list = [] 
    
    for i, paper in enumerate(results, 1):
        title = paper.get('display_name', 'Unknown Title')
        year = paper.get('publication_year', 'N/A')
        authorships = paper.get('authorships', [])
        author_names = [a.get('author', {}).get('display_name') for a in authorships if a.get('author', {}).get('display_name')]
        
        if len(author_names) == 0: author_str = "Unknown Author"
        elif len(author_names) == 1: author_str = author_names[0]
        elif len(author_names) == 2: author_str = f"{author_names[0]} & {author_names[1]}"
        else: author_str = f"{author_names[0]} et al."
            
        loc = paper.get('primary_location') or {}
        publisher = (loc.get('source') or {}).get('display_name', 'Academic Database')
        paper_url = paper.get('doi') or paper.get('id') or '#'
        
        citations_list.append({"id": i, "title": title, "year": year, "url": paper_url})
        full_citation = f"{author_str} ({year}). \"{title}.\" {publisher}."
        raw_abstract = paper.get('abstract_inverted_index', {})
        context_block += f"Paper [{i}]: {full_citation}\nResearch Abstract: {reconstruct_abstract(raw_abstract)}\n\n"
        
    return context_block, citations_list

# ==========================================
# 3. CORE API ENDPOINTS
# ==========================================
@app.post("/api/forest-ai")
def ask_forest_ai(query: UserQuery):
    print(f"\n🤖 Forest AI asked: {query.question}")
    try:
        research_context, citations_list = fetch_research_papers(query.question)
        system_prompt = f"You are the ForestConnect Academic Assistant. Synthesize the provided RESEARCH CONTEXT:\n{research_context}\nRULES: 1. Base answer on context. 2. Use inline citations [1]."
        
        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=f"{system_prompt}\n\nUser Question: {query.question}"
        )
        print("✅ Forest AI successfully generated a response.")
        return {"answer": response.text, "sources": citations_list}
    except Exception as e:
        print(f"❌ Forest AI Error: {e}")
        raise HTTPException(status_code=500, detail="AI Service Interruption")

@app.post("/api/reports")
async def submit_report(
    type: str = Form(...), description: str = Form(...),
    lat: float = Form(...), lng: float = Form(...), file: UploadFile = File(None)
):
    print(f"\n📥 NEW REPORT INCOMING: {type} at Lat: {lat}, Lng: {lng}")
    conn = get_db_connection()
    if not conn: 
        raise HTTPException(status_code=500, detail="DB Connection Failed")
        
    try:
        cursor = conn.cursor()
        severity = "NORMAL"
        image_url = None

        if file:
            print(f"📸 Processing image upload: {file.filename}")
            file_path = f"uploads/{file.filename}"
            with open(file_path, "wb") as buffer: 
                shutil.copyfileobj(file.file, buffer)
            image_url = f"/uploads/{file.filename}"

        critical_keywords = ["chainsaw", "fire", "smoke", "poaching", "illegal", "logging", "gun", "truck"]
        if any(word in description.lower() for word in critical_keywords): 
            severity = "CRITICAL"
            print("🚨 NLP matched critical keywords! Setting severity to CRITICAL.")
            
        print("🌍 Running Spatial Buffer check...")
        try:
            cursor.execute("SELECT EXISTS(SELECT 1 FROM forest_reserves WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, 2000));", (lng, lat))
            if cursor.fetchone()[0]: 
                severity = "CRITICAL"
                print("🚨 Incident inside Forest Reserve buffer! Setting to CRITICAL.")
        except Exception as geo_error:
            print(f"⚠️ Spatial Check Skipped (Is the 'forest_reserves' table missing?): {geo_error}")
            conn.rollback()

        print("💾 Saving report to PostgreSQL database...")
        cursor.execute("""
            INSERT INTO reports (threat_type, description, lat, lng, location, severity, image_url) 
            VALUES (%s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s)
        """, (type, description, lat, lng, lng, lat, severity, image_url))
        
        conn.commit()
        cursor.close()
        conn.close()
        print("✅ SUCCESS! Report completely saved.")
        return {"status": "success", "severity": severity}
        
    except Exception as e:
        if conn: conn.rollback()
        print(f"❌ FATAL POST DATABASE ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reports")
def get_all_reports():
    print("\n📡 Website requested all map pins...")
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT threat_type, description, lat, lng, severity, image_url FROM reports")
        reports = [{"type": r[0], "desc": r[1], "lat": r[2], "lng": r[3], "severity": r[4], "image_url": r[5]} for r in cursor.fetchall()]
        cursor.close()
        conn.close()
        print(f"✅ Successfully sent {len(reports)} pins to the map.")
        return reports
    except Exception as e: 
        print(f"❌ GET REPORTS ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
def get_stats():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT threat_type, COUNT(*) FROM reports GROUP BY threat_type")
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"labels": [r[0] for r in rows], "counts": [r[1] for r in rows]}
    except Exception as e: 
        print(f"❌ STATS ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 4. SPATIAL INTELLIGENCE (GETIS-ORD Gi*)
# ==========================================
def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculates distance in kilometers between two GPS points"""
    R = 6371.0 
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon / 2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

@app.get("/api/hotspots")
def get_getis_ord_hotspots():
    print("\n🔥 Running Getis-Ord Gi* Spatial Analysis...")
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT threat_type, description, lat, lng FROM reports")
        reports = [{"type": r[0], "desc": r[1], "lat": r[2], "lng": r[3]} for r in cursor.fetchall()]
        cursor.close()
        conn.close()

        if len(reports) < 3:
            return {"status": "error", "message": "Not enough data for statistical analysis (minimum 3 required)."}

        # Step 1: Calculate Local Density (Neighbors within 15km threshold)
        threshold_km = 15.0 
        local_counts = []
        
        for p1 in reports:
            neighbors = sum(1 for p2 in reports if haversine_distance(p1["lat"], p1["lng"], p2["lat"], p2["lng"]) <= threshold_km)
            local_counts.append(neighbors)

        # Step 2: Calculate Global Mean and Standard Deviation
        n = len(reports)
        global_mean = sum(local_counts) / n
        variance = sum((x - global_mean) ** 2 for x in local_counts) / n
        std_dev = math.sqrt(variance)

        # Step 3: Calculate Z-Scores and Assign Pinpoint Categories
        for i, report in enumerate(reports):
            if std_dev == 0:
                z_score = 0 
            else:
                z_score = (local_counts[i] - global_mean) / std_dev
            
            report["z_score"] = round(z_score, 3)
            
            # 95% Confidence Interval Classification
            if z_score >= 1.96:
                report["cluster_type"] = "HOTSPOT"
            elif z_score <= -1.96:
                report["cluster_type"] = "COLDSPOT"
            else:
                report["cluster_type"] = "NOT_SIGNIFICANT"

        print("✅ Analysis Complete! Sending clustered pinpoints to map.")
        return {"status": "success", "data": reports}

    except Exception as e:
        print(f"❌ HOTSPOT ANALYSIS ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 5. SERVER ENTRY POINT (CRITICAL FOR CLOUD)
# ==========================================
if __name__ == "__main__":
    # Render assigns a dynamic port. If testing locally, it defaults to 8000.
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)