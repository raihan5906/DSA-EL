import http.server
import socketserver
import requests
import os
import json
import subprocess
import time
from urllib.parse import urlparse, parse_qs

PORT = 8080
MODEL = "gemini-3-flash-preview" 

class GeminiHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query = parse_qs(parsed_url.query).get('q', [''])[0]

        if path == '/suggest':
            try:
                result = subprocess.run(['./dsa_logic', query], 
                                     capture_output=True, text=True, timeout=2)
                suggestions = [s.strip() for s in result.stdout.split(',') if s.strip()]
                self._send_json(suggestions)
            except:
                self._send_json([])
            return

        # NEW: Endpoint to load history for the sidebar
        elif path == '/history':
            try:
                if os.path.exists("history.txt"):
                    with open("history.txt", "r") as f:
                        lines = list(dict.fromkeys([line.strip() for line in f.readlines() if line.strip()]))
                        self._send_json(lines[::-1][:10]) # Return last 10 unique
                else:
                    self._send_json([])
            except:
                self._send_json([])
            return

        elif path == '/search':
            subprocess.Popen(['./dsa_logic', '--learn', query])
            api_key = os.environ.get('GEMINI_API_KEY')
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={api_key}"
            payload = {"contents": [{"parts": [{"text": query}]}]}
            
            answer = ""
            for attempt in range(3):
                try:
                    response = requests.post(url, json=payload, timeout=20)
                    data = response.json()
                    if response.status_code == 200:
                        answer = data['candidates'][0]['content']['parts'][0]['text']
                        break
                    elif response.status_code == 429:
                        time.sleep((2 ** attempt) + 15)
                    else:
                        answer = f"API Error: {data.get('error', {}).get('message', 'Unknown')}"
                        break
                except Exception as e:
                    answer = f"Connection Failed: {str(e)}"
                    break
            
            self._send_json({"query": query, "answer": answer})
            return
        
        else:
            return super().do_GET()

    def _send_json(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), GeminiHandler) as httpd:
    print(f"Server live at: http://localhost:{PORT}")
    httpd.serve_forever()