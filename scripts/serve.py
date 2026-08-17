#!/usr/bin/env python3
"""Serve this folder so timed_messages.html can play YouTube video.

YouTube refuses to play embeds on pages opened straight from disk (file://), so the page has to be reached over http://. Run this and it opens for you:

    python3 serve.py            # uses port 8000
    python3 serve.py 8080       # or pick your own port

Press Ctrl+C to stop.
"""

import functools
import http.server
import os
import sys
import webbrowser

PAGE = "timed_messages.html"

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
folder = os.path.dirname(os.path.abspath(__file__))
url = f"http://localhost:{port}/{PAGE}"

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=folder)

try:
    with http.server.ThreadingHTTPServer(("", port), handler) as httpd:
        print(f"Serving {folder}\n{url}\nPress Ctrl+C to stop.")
        webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")
except OSError as e:
    sys.exit(f"Could not start on port {port}: {e}\nTry another port: python3 serve.py {port + 1}")
