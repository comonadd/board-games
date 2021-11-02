import enum
from dataclasses import asdict, dataclass
from typing import Dict
import aiohttp

from bs4 import BeautifulSoup
from aiohttp.web_request import Request
from aiohttp.web_ws import WebSocketResponse
from server.logger import logger
from server.routes import routes
from server.words_game_common import PlayerId
from server.ws_game import ClientInfo, Message, MessageHandler, WSGame
from typing import Optional


import aiohttp


class CWMSG(enum.IntEnum):
    Joining = 0
    NavigateTo = 1


class SWMSG(enum.IntEnum):
    InitGame = 0
    NavigateTo = 1
    Finished = 2


@dataclass
class PlayerInfo:
    id: PlayerId
    nickname: str
    points: int = 0
    time_started: Optional[None] = None
    time_ended: Optional[None] = None
    place: int = 0

    @property
    def total_time(self):
        if self.time_ended is None:
            return None
        return self.time_ended - self.time_started

    def to_json(self):
        return asdict(self)


@dataclass
class Article:
    path: str
    content: str

    def to_json(self):
        return {"path": self.path, "content": self.content}


class WikiGame(WSGame):
    ws_handlers_mapping: Dict[CWMSG, MessageHandler]
    players: Dict[PlayerId, PlayerInfo] = {}
    initial_article: Optional[Article] = None
    target_article: Optional[Article] = None
    # Article cache
    article_store: Dict[str, Article] = {}

    def __init__(self) -> None:
        super().__init__()
        self.ws_handlers_mapping = {
            CWMSG.Joining: self.on_player_joined,  # type: ignore
            CWMSG.NavigateTo: self.on_player_navigate,  # type: ignore
        }
        # loop = asyncio.get_event_loop()
        # loop.create_task(self.start_game())

    async def get_initial_article(self):
        self.initial_article = await self.load_wiki_article("/wiki/Apple")
        return self.initial_article

    async def load_wiki_article(self, path: str):
        article = self.article_store.get(path, None)
        if article is not None:
            return article
        url = f"https://en.wikipedia.org{path}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as resp:
                content = await resp.text()
                html = BeautifulSoup(content, "html.parser")
                article_content_div = html.find("div", {"class": "mw-parser-output"})
                article_content = str(article_content_div)
                return Article(path=path, content=article_content)

    async def on_player_joined(self, si: ClientInfo, parsed: Message) -> None:
        # if self.is_game_in_progress():
        #     await self.send_to_user(si, {"type": SWMSG.GameInProgress})
        #     return
        nickname = parsed["nickname"]
        logger.debug("{} is joining".format(nickname))
        ws_id = si.id
        new_player = PlayerInfo(
            # self.config,
            id=ws_id,
            nickname=nickname,
        )
        self.players[ws_id] = new_player
        await self.send_to_user(
            si,
            {
                "type": SWMSG.InitGame,
                "player": new_player.to_json(),
            },
        )
        initial_article = await self.get_initial_article()
        await self.send_to_user(
            si, {"type": SWMSG.NavigateTo, "article": initial_article.to_json()}
        )

        # await self.send_to_others(
        #     si, {"type": SWMSG.PlayerJoined, "player": new_player.to_json()}
        # )

        # # If we're waiting for players and we have enough players, start the game
        # if self.waiting_for_players() and len(gs.players) >= MIN_PLAYERS_TO_START_GAME:
        #     self.game_handle = asyncio.create_task(self.start_game())
        # elif self.starting_the_game():
        #     # Stop the starting sequence and restart it
        #     assert self.game_handle is not None
        #     self.game_handle.cancel()
        #     self.game_handle = asyncio.create_task(self.start_game())

    async def on_player_navigate(self, si: ClientInfo, parsed: Message) -> None:
        player = self.players.get(si.id, None)
        assert player is not None
        nickname = player.nickname
        to = parsed.get("path")
        logger.debug(f"{nickname} is navigating to {to}")
        player.place = len(self.players_finished)
        self.players_finished.append(player)
        if to == self.target_article:
            await self.send_to_user(
                si,
                {
                    "type": SWMSG.Finished,
                    "player": player.to_json(),
                },
            )
        article = await self.load_wiki_article(to)
        await self.send_to_user(
            si, {"type": SWMSG.NavigateTo, "article": article.to_json()}
        )

    async def handle_msg(self, si: ClientInfo, _type: CWMSG, msg: Message) -> None:
        f = self.ws_handlers_mapping.get(_type, None)
        if f is None:
            logger.warning("Unknown message type received from client: {}".format(msg))
        else:
            await f(si, msg)


wiki_game = WikiGame()


@routes.get("/wiki/")
async def on_req(request: Request) -> WebSocketResponse:
    return await wiki_game.handle_req(request)
