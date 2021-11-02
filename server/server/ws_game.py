import json
from dataclasses import dataclass
from typing import Any, Dict
from typing import Callable, Dict, List, Optional, Set, Any, Coroutine

import aiohttp
from aiohttp import web
from aiohttp.http_websocket import WSCloseCode, WSMessage
from aiohttp.web_request import Request
from aiohttp.web_ws import WebSocketResponse

from server.logger import logger

ClientId = str
Message = Dict[str, Any]


@dataclass
class ClientInfo:
    id: ClientId
    socket: WebSocketResponse

    async def send_json(self, msg: Message) -> None:
        await self.socket.send_json(msg)


MessageHandler = Callable[[ClientInfo, Message], Coroutine[Any, Any, Any]]


class WSGame:
    clients: Dict[ClientId, ClientInfo]

    # Auto-incremented client id
    __player_id = 0

    def __init__(self) -> None:
        self.clients = {}

    def next_player_id(self) -> ClientId:
        # TODO: Use uuid?
        self.__player_id += 1
        return str(self.__player_id)

    def is_user_connected(self, pid: ClientId) -> bool:
        return self.clients.get(pid, None) is not None

    async def send_to_all(self, msg: Message) -> None:
        for _, client in self.clients.items():
            await client.send_json(msg)

    async def send_to_others(self, si: ClientInfo, msg: Message) -> None:
        cuid = si.id
        for _id, client in self.clients.items():
            if _id != cuid:
                await client.send_json(msg)

    async def send_to_user(self, si: ClientInfo, msg: Message) -> Any:
        return await si.socket.send_json(msg)

    async def handle_req(self, request: Request) -> WebSocketResponse:
        ws = web.WebSocketResponse()
        ready = ws.can_prepare(request=request)
        if not ready:
            await ws.close(code=WSCloseCode.PROTOCOL_ERROR)
        await ws.prepare(request)
        pid = self.next_player_id()
        logger.info("preparing connection for id={}".format(pid))
        # TODO: Maybe also check username?
        if self.is_user_connected(pid):
            logger.warning("User id={} already connected, disconnecting.".format(pid))
            await ws.close(
                code=WSCloseCode.TRY_AGAIN_LATER, message=b"Already connected"
            )
            return ws
        # Add user to the client list
        si = ClientInfo(id=pid, socket=ws)
        self.clients[pid] = si
        try:
            # Handle client messages until disconnects
            async for msg in ws:
                if not isinstance(msg, WSMessage):
                    continue
                if msg.type == aiohttp.WSMsgType.TEXT:
                    parsed = json.loads(msg.data)
                    _type = parsed["type"]
                    await self.handle_msg(si, _type, parsed)
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    logger.error(
                        "ws connection closed with exception %s" % ws.exception()
                    )
        finally:
            # When a connection is stopped, get rid of the client socket
            await self.remove_client(si)
            # Remove the player from the game
            await self.remove_player(si.id, si)
        return ws

    async def remove_client(self, si: ClientInfo) -> None:
        pid = si.id
        if self.clients.get(pid, None) is not None:
            del self.clients[pid]

    async def handle_msg(self, si: ClientInfo, _type: Any, msg: Message) -> None:
        pass

    async def remove_player(self, pid: ClientId, si: ClientInfo) -> None:
        pass
