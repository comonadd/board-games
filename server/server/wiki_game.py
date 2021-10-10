import asyncio
import json
import random
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Set

import aiohttp
from aiohttp import web
from aiohttp.http_websocket import WSCloseCode, WSMessage
from aiohttp.web_request import Request
from aiohttp.web_ws import WebSocketResponse

from server.logger import logger
from server.routes import routes
from server.ws_game import WSGame


class WikiGame(WSGame):
    pass


wiki_game = WikiGame()


@routes.get("/wiki/")
async def on_req(request: Request) -> WebSocketResponse:
    return await wiki_game.handle_req(request)
