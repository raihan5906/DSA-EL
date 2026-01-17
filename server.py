import http.server
import socketserver
import requests
import os
import json
import subprocess
import time
from urllib.parse import urlparse, parse_qs

# Configuration
PORT = 8080
# Use the stable 2026 identifier to avoid 404 errors
MODEL = "gemini-3-flash-preview" 

class GeminiHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query = parse_qs(parsed_url.query).get('q', [''])[0]

        # 1. Autocomplete / Suggestions via C Logic
        if path == '/suggest':
            try:
                # Synchronous run to get quick results
                result = subprocess.run(['./dsa_logic', query], 
                                     capture_output=True, text=True, timeout=2)
                suggestions = [s.strip() for s in result.stdout.split(',') if s.strip()]
                self._send_json(suggestions)
            except:
                self._send_json([])
            return

        # 2. Main Search via Gemini API
        elif path == '/search':
            # Background 'learn' process
            subprocess.Popen(['./dsa_logic', '--learn', query])
            
            api_key = os.environ.get('GEMINI_API_KEY')
            # Using v1beta for newest 2026 models
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={api_key}"
            payload = {"contents": [{"parts": [{"text": query}]}]}
            
            answer = ""
            # Exponential Backoff for 429 "Limit 0" errors
            for attempt in range(3):
                try:
                    response = requests.post(url, json=payload, timeout=20)
                    data = response.json()
                    
                    if response.status_code == 200:
                        answer = data['candidates'][0]['content']['parts'][0]['text']
                        break
                    elif response.status_code == 429:
                        wait = (2 ** attempt) + 15 # Wait at least 15s
                        print(f"Quota Limit 0. Retrying in {wait}s...")
                        time.sleep(wait)
                    else:
                        error_msg = data.get('error', {}).get('message', 'Unknown Error')
                        answer = f"API Error {response.status_code}: {error_msg}"
                        break
                except Exception as e:
                    answer = f"Connection Failed: {str(e)}"
                    break
            
            self._send_json({"query": query, "answer": answer})
            return
        
        else:
            # Serves local files (index.html, style.css, app.js)
            return super().do_GET()

    def _send_json(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

# Port recovery
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), GeminiHandler) as httpd:
    print(f"Server live at: http://localhost:{PORT}")
    httpd.serve_forever()