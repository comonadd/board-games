import enum
from dataclasses import asdict, dataclass
from typing import Dict
import aiohttp
import random

from bs4 import BeautifulSoup
from aiohttp.web_request import Request
from aiohttp.web_ws import WebSocketResponse
from server.logger import logger
from server.routes import routes
from server.words_game_common import PlayerId
from server.ws_game import ClientInfo, Message, MessageHandler, WSGame
from typing import Optional, List


import aiohttp


import asyncio


import re


class CWMSG(enum.IntEnum):
    Joining = 0
    NavigateTo = 1
    StartGame = 2


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
    title: str
    path: str
    content: str

    def to_json(self):
        return {"title": self.title, "path": self.path, "content": self.content}


async def load_wiki_article(path: str) -> Article:
    url = f"https://en.wikipedia.org{path}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            content = await resp.text()
            path = str(resp.real_url)
            html = BeautifulSoup(content, "html.parser")
            article_title = html.find("h1", {"id": "firstHeading"})
            article_content_div = html.find("div", {"class": "mw-parser-output"})
            article_content = str(article_content_div)
            return Article(title=article_title.text, path=path, content=article_content)


URL_REGEXP = r".*(\/wiki\/.*)"


def get_wiki_path_from_url(url: str):
    m = re.search(URL_REGEXP, url)
    if m is None:
        raise Exception("Invalid Wiki article URL")
    return m.group(1)


MIN_STEPS = 1
MAX_STEPS = 1


async def generate_random_target_for_article(article: Article) -> Article:
    def filter_link(link: str):
        href = link.get("href")
        if href is None:
            return False
        if not href.startswith("/wiki/"):
            return False
        if (
            href.startswith("/wiki/Wikipedia:")
            or href.startswith("/wiki/Template:")
            or href.startswith("/wiki/Template_talk:")
            or href.startswith("/wiki/File:")
        ):
            return False
        return True

    async def iter_(article: Article, steps: int):
        if steps <= 0:
            return article
        content = article.content
        html = BeautifulSoup(content, "html.parser")
        links = html.findAll("a")
        assert len(links) != 0
        if len(links) == 0:
            return None
        links = list(filter(filter_link, links))
        next_link = random.choice(links)
        next_link = next_link.get("href")
        next_path = get_wiki_path_from_url(next_link)
        art = await load_wiki_article(next_path)
        return await iter_(art, steps - 1)

    initial_steps = random.randint(MIN_STEPS, MAX_STEPS)
    target = await iter_(article, initial_steps)

    return target


class WikiGame(WSGame):
    ws_handlers_mapping: Dict[CWMSG, MessageHandler]
    players: Dict[PlayerId, PlayerInfo] = {}
    initial_article: Optional[Article] = None
    target_article: Optional[Article] = None
    # Article cache
    article_store: Dict[str, Article] = {}
    players_finished: List[PlayerId] = []

    def __init__(self) -> None:
        super().__init__()
        self.ws_handlers_mapping = {
            CWMSG.Joining: self.on_player_joined,  # type: ignore
            CWMSG.NavigateTo: self.on_player_navigate,  # type: ignore
        }
        loop = asyncio.get_event_loop()
        loop.run_until_complete(self.init_game())

    async def load_initial_article(self) -> Article:
        return await self.load_random_article()

    async def get_initial_article(self) -> Article:
        return self.initial_article

    async def init_game(self):
        self.initial_article = await self.load_initial_article()
        self.target_article = await generate_random_target_for_article(
            self.initial_article
        )
        self.players_finished = []
        self.players = {}

    async def load_random_article(self) -> Article:
        article = await load_wiki_article("/wiki/Special:Random")
        self.article_store[article.path] = article
        return article

    async def load_wiki_article(self, path: str) -> Article:
        article = self.article_store.get(path, None)
        if article is not None:
            return article
        article = await load_wiki_article(path)
        self.article_store[path] = article
        return article

    async def on_player_joined(self, si: ClientInfo, parsed: Message) -> None:
        # if self.is_game_in_progress():
        #     await self.send_to_user(si, {"type": SWMSG.GameInProgress})
        #     return
        nickname = parsed["nickname"]
        logger.debug("{} is joining".format(nickname))
        await self.init_game()
        ws_id = si.id
        new_player = PlayerInfo(
            # self.config,
            id=ws_id,
            nickname=nickname,
        )
        self.players[ws_id] = new_player
        assert self.target_article is not None
        await self.send_to_user(
            si,
            {
                "type": SWMSG.InitGame,
                "player": new_player.to_json(),
                "target": self.target_article.title,
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
        to = parsed.get("path", None)
        assert to is not None
        logger.debug(f"{nickname} is navigating to {to}")
        self.players_finished.append(player.id)
        player.place = len(self.players_finished)
        if to == get_wiki_path_from_url(self.target_article.path):
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
