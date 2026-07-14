import json
import os
from http.server import BaseHTTPRequestHandler
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def valid_games(value):
    if not isinstance(value, list) or not 1 <= len(value) <= 5:
        return False
    return all(
        isinstance(game, list)
        and len(game) == 6
        and len(set(game)) == 6
        and all(isinstance(number, int) and 1 <= number <= 45 for number in game)
        for game in value
    )


class handler(BaseHTTPRequestHandler):
    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def supabase_request(self, method="GET", payload=None):
        url = os.environ.get("SUPABASE_URL", "").rstrip("/")
        secret = os.environ.get("SUPABASE_SECRET_KEY", "")
        if not url or not secret:
            raise RuntimeError("Supabase 환경변수가 설정되지 않았습니다.")

        query = urlencode({
            "select": "id,games,locked_numbers,created_at",
            "order": "id.desc",
            "limit": "10",
        }) if method == "GET" else ""
        endpoint = f"{url}/rest/v1/draws" + (f"?{query}" if query else "")
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = Request(endpoint, data=body, method=method)
        request.add_header("apikey", secret)
        request.add_header("Content-Type", "application/json")
        if method == "POST":
            request.add_header("Prefer", "return=representation")
        with urlopen(request, timeout=8) as response:
            return json.loads(response.read() or b"[]")

    def do_GET(self):
        try:
            rows = self.supabase_request()
            self.send_json([
                {
                    "id": row["id"],
                    "games": row["games"],
                    "lockedNumbers": row["locked_numbers"],
                    "createdAt": row["created_at"],
                }
                for row in rows
            ])
        except RuntimeError as error:
            self.send_json({"error": str(error)}, 503)
        except (HTTPError, URLError, TimeoutError) as error:
            self.send_json({"error": "Supabase에 연결하지 못했습니다."}, 502)

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length))
            games = payload.get("games")
            locked = payload.get("lockedNumbers", [])
            if not valid_games(games):
                raise ValueError("게임별로 중복 없는 1~45 번호 6개가 필요합니다.")
            if not isinstance(locked, list) or not all(
                isinstance(number, int) and 1 <= number <= 45 for number in locked
            ):
                raise ValueError("고정 번호가 올바르지 않습니다.")
            rows = self.supabase_request("POST", {
                "games": games,
                "locked_numbers": locked,
            })
            row = rows[0]
            self.send_json({"id": row["id"], "createdAt": row["created_at"]}, 201)
        except (json.JSONDecodeError, ValueError, TypeError) as error:
            self.send_json({"error": str(error)}, 400)
        except RuntimeError as error:
            self.send_json({"error": str(error)}, 503)
        except (HTTPError, URLError, TimeoutError):
            self.send_json({"error": "Supabase에 저장하지 못했습니다."}, 502)
