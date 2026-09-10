#!/usr/bin/env python3
"""Serve this folder so the drill can run as a PWA.

Opening index.html straight from disk does not work: file:// pages cannot load ES modules and
cannot register a service worker. http://localhost can do both - browsers treat localhost as a
secure context - so run this and it opens for you:

    python3 serve.py            # uses port 8123
    python3 serve.py 8080       # or pick your own port

Press Ctrl+C to stop.
"""

import functools
import http.server
import mimetypes
import os
import sys
import webbrowser

PAGE = "index.html"
DEFAULT_PORT = 8123

# Older Pythons do not know this one, and a manifest served as text/plain is ignored by the browser.
mimetypes.add_type("application/manifest+json", ".webmanifest")


class Handler(http.server.SimpleHTTPRequestHandler):
    """Adds no-store, so the browser's HTTP cache does not hide an edit during development.

    The service worker still serves its own precached copy - bump CACHE in sw.js to get past that.
    """

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
folder = os.path.dirname(os.path.abspath(__file__))
url = f"http://localhost:{port}/{PAGE}"

handler = functools.partial(Handler, directory=folder)

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
