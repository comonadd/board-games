import logging
import json
import aiohttp
import asyncio
import random
from enum import Enum
from aiohttp import web
from aiohttp.http_websocket import WSCloseCode, WSMessage
from dataclasses import dataclass, field, asdict
from typing import Dict, Set, List, Optional
from datetime import datetime, timedelta

# Environment
from aiohttp.web_ws import WebSocketResponse

DEV = True

# Logging
logger = logging.getLogger("server")


def configure_loggers():
    f_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    if DEV:
        logger.setLevel(logging.DEBUG)
        f_handler = logging.FileHandler('server.dev.log')
        f_handler.setLevel(logging.DEBUG)
        f_handler.setFormatter(f_format)
        logger.addHandler(f_handler)
    else:
        logger.setLevel(logging.INFO)
        f_handler = logging.FileHandler('server.prod.log')
        f_handler.setLevel(logging.INFO)
        f_handler.setFormatter(f_format)
        logger.addHandler(f_handler)


# Settings
TIME_UNTIL_START = 15
LIVES_INITIAL = 5
MIN_PLAYERS_TO_START_GAME = 2
TICK_DURATION = 0.05
TIME_TO_ANSWER = 5
WORDS_DICT_PATH = "./russian-words/words.txt"
PARTICLES_PATH = "./russian-words/particles.json"
MIN_PARTICLE_LENGTH = 3


class Difficulty(Enum):
    MIN_500 = 500
    MIN_300 = 300
    MIN_100 = 100


@dataclass
class WordGameDict:
    words: Set[str] = field(default_factory=lambda: set())
    particles: Dict[str, int] = field(default_factory=lambda: {})
    particle_keys: List[str] = field(default_factory=lambda: [])
    by_difficulty: Dict[Difficulty, List[str]] = field(default_factory=lambda: {})


def load_dictionary(words_dict_path: str, particles_path: str) -> WordGameDict:
    ww = WordGameDict()
    logger.info("Loading dictionary...")
    with open(words_dict_path, "r", encoding="windows-1251") as f:
        for word in f.readlines():
            ww.words.add(word[:-2])
    with open(particles_path, "r", encoding="utf-8") as f:
        ww.particles = json.load(f)
    ww.particle_keys = list(ww.particles.keys())
    for diff in Difficulty:
        particles = list(filter(lambda p: ww.particles[p] >= diff.value, ww.particle_keys))
        ww.by_difficulty[diff] = particles
        logger.info("Loaded {} difficulty={} words.".format(len(particles), diff))
    logger.info("Done. Loaded {} words and {} particles".format(len(ww.words), len(ww.particles)))
    return ww


class CWMSG:
    """ Client messages. """
    Joining = 0
    UpdateInput = 1
    SubmitGuess = 2


class SWMSG:
    """ Server messages. """
    InitGame = 0
    UpdateGameState = 1
    EndGame = 2
    GameInProgress = 3


class GameStateDesc:
    """ Description of the current game state. """
    WaitingForPlayers = 0
    Playing = 1
    Starting = 2

Message = Dict
PlayerId = int

@dataclass
class PlayerInfo:
    """ Information on the current player state. """
    id: int = -1
    lives_left: int = LIVES_INITIAL
    nickname: str = None
    input: str = ""


@dataclass
class GameState:
    """ Current game state. Shared between client and server. """
    players: Dict[PlayerId, PlayerInfo] = field(default_factory=lambda: {})
    whos_turn: int = -1
    particle: str = None
    desc: GameStateDesc = GameStateDesc.WaitingForPlayers
    start_timer: int = -1
    guess: str = ""  # User guess (after pressing enter)
    last_player_to_answer: PlayerId = None


def initial_game_state() -> GameState:
    return GameState()


@dataclass
class ClientInfo:
    id: PlayerId
    socket: WebSocketResponse


@dataclass
class ServerState:
    game_state: GameState = initial_game_state()
    clients: Dict[PlayerId, ClientInfo] = field(default_factory=lambda: {})
    ww: WordGameDict = WordGameDict()
    game_handle = None


async def ws_send_to_all(W: ServerState, msg: Message):
    for _, sock in W.clients.items():
        await sock.send_json(msg)


def current_user_id(si: ClientInfo):
    return si.id


async def ws_send_to_others(W: ServerState, si: ClientInfo, msg: Message):
    cuid = current_user_id(si)
    for _id, sock in W.clients.items():
        if _id != cuid:
            await sock.send_json(msg)


def state_update_msg(W: ServerState, *keys):
    gs = W.game_state
    gsd = asdict(gs)
    msg = {
        "type": SWMSG.UpdateGameState,
        "state": {key: gsd[key] for key in keys}
    }
    return msg


async def notify_of_su(W: ServerState, *keys):
    msg = state_update_msg(W, *keys)
    return await ws_send_to_all(W, msg)


async def notify_others_of_su(W: ServerState, si: ClientInfo, *keys):
    msg = state_update_msg(W, *keys)
    return await ws_send_to_others(W, si, msg)


words_server_state = ServerState()


async def wrong_guess(W: ServerState, player: PlayerInfo):
    if player.lives_left > 0:
        player.lives_left -= 1
    await notify_of_su(W, "players")


async def correct_guess(W: ServerState, player: PlayerInfo):
    gs = W.game_state
    gs.guess = ""
    for _, player in gs.players.items():
        player.input = ""
    await notify_of_su(W, "guess", "players")


def cycle_alive_players(players):
    while True:
        for pid in players.keys():
            player = players[pid]
            if player.lives_left <= 0:
                continue
            else:
                yield pid, player


async def end_game(W: ServerState):
    gs = W.game_state
    gs.desc = GameStateDesc.WaitingForPlayers
    # Reset players
    gs.players = {}
    gs.particle = None
    gs.whos_turn = -1
    gs.start_timer = -1
    await ws_send_to_all(W, { "type": SWMSG.EndGame, "winner": gs.last_player_to_answer })


def particles_dict_for(W: ServerState, diff: Difficulty):
    return W.ww.by_difficulty[diff]


def is_guess_correct(W: ServerState, guess: str) -> bool:
    return len(guess) >= MIN_PARTICLE_LENGTH and guess in W.ww.words and W.game_state.particle in guess


async def start_game(W: ServerState):
    gs = W.game_state
    gs.desc = GameStateDesc.Starting
    gs.start_timer = TIME_UNTIL_START
    pdict = particles_dict_for(W, Difficulty.MIN_500)
    await notify_of_su(W, "desc", "start_timer")
    while gs.start_timer > 0:
        await notify_of_su(W, "start_timer")
        await asyncio.sleep(1)
        gs.start_timer -= 1
    gs.desc = GameStateDesc.Playing
    await notify_of_su(W, "desc")
    pit = cycle_alive_players(gs.players)
    gs.last_player_to_answer = None
    try:
        while True:
            # Process current turn
            player_id, player = next(pit)
            gs.last_player_to_answer = player_id
            # If there is only one person left, end the game
            players_alive = len(list(filter(lambda p: p.lives_left != 0, gs.players.values())))
            if players_alive <= 1:
                raise StopIteration()
            logger.debug("Processing player {}".format(player.nickname))
            particle = random.choice(pdict)
            # logger.debug("Guessing {}".format(correct_guess))
            time_end = datetime.now() + timedelta(seconds=TIME_TO_ANSWER)
            gs.whos_turn = player_id
            gs.particle = particle
            player.input = ""
            await notify_of_su(W, "whos_turn", "particle", "players", "last_player_to_answer")
            while True:
                is_correct = is_guess_correct(W, gs.guess)
                # logger.debug(f"Guess: {gs.guess}, correct: {is_correct}")
                if is_correct:
                    logger.debug("Correct guess!!")
                    await correct_guess(W, player)
                    break
                curr_time = datetime.now()
                out_of_time = curr_time >= time_end
                if out_of_time:
                    logger.debug("Time ran out")
                    await wrong_guess(W, player)
                    break
                await asyncio.sleep(TICK_DURATION)
    except StopIteration:
        # Game ended
        await end_game(W)


async def reset_game(W: ServerState):
    gs = W.game_state
    gs.desc = GameStateDesc.WaitingForPlayers
    gs.start_timer = -1
    gs.players = {}
    gs.particle = None
    gs.whos_turn = -1
    await notify_of_su(W, "desc", "start_timer", "players", "particle", "whos_turn")


async def send_to_user(si: ClientInfo, msg: Message):
    return await si.socket.send_json(msg)


def waiting_for_players(gs: GameState):
    return gs.desc == GameStateDesc.WaitingForPlayers


def starting_the_game(gs: GameState):
    return gs.desc == GameStateDesc.Starting

def is_game_in_progress(gs: GameState):
    return gs.desc == GameStateDesc.Playing

async def on_player_joined(W: ServerState, gs: GameState, si: ClientInfo, parsed: Message):
    # TODO: Don't allow new players to join if the game is already in progress
    if is_game_in_progress(gs):
        await send_to_user(si, { "type": SWMSG.GameInProgress })
        return
    nickname = parsed["nickname"]
    logger.debug("{} is joining".format(nickname))
    # We ahve enough players to start the game
    ws_id = si.id
    new_player = PlayerInfo(
        nickname=nickname,
        lives_left=LIVES_INITIAL,
        id=ws_id,
    )
    gs.players[ws_id] = new_player
    await send_to_user(
        si, {"type": SWMSG.InitGame, "state": asdict(gs), "player": asdict(new_player) })
    await notify_others_of_su(W, si, "players")

    # If we're waiting for players, start the game
    if waiting_for_players(gs) and len(gs.players) >= MIN_PLAYERS_TO_START_GAME:
        W.game_handle = asyncio.create_task(start_game(W))
    elif starting_the_game(gs):
        # Stop the starting sequence and restart it
        assert W.game_handle is not None
        W.game_handle.cancel()
        W.game_handle = asyncio.create_task(start_game(W))

async def on_player_input(W: ServerState, gs: GameState, si: ClientInfo, parsed: Message):
    # Can't update input if not your turn
    if si.id != gs.whos_turn:
        logger.warning(f"Player #{si.id} tried to update input during #{gs.whos_turn} player's turn")
        return
    player = gs.players[si.id]
    logger.debug("processing player input:")
    logger.debug(player)
    player.input = parsed["input"]
    await notify_others_of_su(W, si, "players")

async def on_player_submit(W: ServerState, gs: GameState, si: ClientInfo, parsed: Message):
    # Can't submit guess if not your turn
    if si.id != gs.whos_turn:
        logger.warning(f"Player #{si.id} tried to submit guess during #{gs.whos_turn} player's turn")
        return
    gs.guess = parsed["guess"]

ws_handlers_mapping = {
    CWMSG.Joining: on_player_joined,
    CWMSG.UpdateInput: on_player_input,
    CWMSG.SubmitGuess: on_player_submit,
}

# Player id
__player_id = 0


def next_player_id():
    global __player_id
    __player_id += 1
    return __player_id

def get_player(W: ServerState, pid: PlayerId) -> PlayerInfo:
    return W.game_state.players.get(pid, None)

def player_name(W: ServerState, pid: PlayerId) -> Optional[str]:
    p = get_player(W, pid)
    if p is None:
        return None
    return p.nickname

async def remove_player(W: ServerState, si: ClientInfo):
    pid = si.id
    gs = W.game_state
    if W.clients.get(pid, None) is not None:
        del W.clients[pid]
    if pid in gs.players:
        del gs.players[pid]
    if len(gs.players) < MIN_PLAYERS_TO_START_GAME:
        await reset_game(W)
    await notify_others_of_su(W, si, "players")


def is_user_connected(W: ServerState, pid: PlayerId):
    return W.clients.get(pid, None) is not None


###############################
# Routes
###############################

routes = web.RouteTableDef()


@routes.get('/words/')
async def words_game(request):
    """ This route handles the words WebSocket API. """
    ws = web.WebSocketResponse()
    ready = ws.can_prepare(request=request)
    if not ready:
        await ws.close(code=WSCloseCode.PROTOCOL_ERROR)
    await ws.prepare(request)
    W = words_server_state
    gs = W.game_state
    pid = next_player_id()
    logger.info("preparing connection for id={}".format(pid))
    # TODO: Maybe also check username?
    if is_user_connected(W, pid):
        logger.warning("User id={} already connected, disconnecting.".format(pid))
        await ws.close(code=WSCloseCode.TRY_AGAIN_LATER, message=b'Already connected')
        return ws
    # Add user to the client list
    si = ClientInfo(id=pid, socket=ws)
    W.clients[pid] = ws
    try:
        async for msg in ws:
            if not isinstance(msg, WSMessage):
                continue
            if msg.type == aiohttp.WSMsgType.TEXT:
                parsed = json.loads(msg.data)
                logger.debug("GOT MESSAGE FROM CLIENT")
                logger.debug(parsed)
                _type = parsed["type"]
                f = ws_handlers_mapping.get(_type, None)
                if f is None:
                    logger.warning("Unknown message type received from client: {}".format(parsed))
                    continue
                await f(W, gs, si, parsed)
            elif msg.type == aiohttp.WSMsgType.ERROR:
                logger.error('ws connection closed with exception %s' % ws.exception())
    finally:
        # When a connection is stopped, remove the connection
        await remove_player(W, si)
    return ws


def create_app():
    configure_loggers()
    words_server_state.ww = load_dictionary(WORDS_DICT_PATH, PARTICLES_PATH)
    logger.info("Running in {} mode".format("DEV" if DEV else "PROD"))
    app = web.Application()
    app.add_routes(routes)
    logger.debug("new msg")
    return app


if __name__ == '__main__':
    app = create_app()
    web.run_app(app, host="127.0.0.1")
