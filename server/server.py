import asyncio
import json
import logging
import random
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, Set, List, Optional

import aiohttp
from aiohttp import web
from aiohttp.http_websocket import WSCloseCode, WSMessage
from aiohttp.web_ws import WebSocketResponse

# Environment
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
TIME_UNTIL_START = 3
LIVES_INITIAL = 3
MIN_PLAYERS_TO_START_GAME = 2
TICK_DURATION = 0.05
TIME_TO_ANSWER = 60
WORDS_DICT_PATH = "./assets/words.txt"
PARTICLES_PATH = "./assets/particles.json"
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
    with open(words_dict_path, "r", encoding="utf-8") as f:
        for word in f.readlines():
            # don't include the newline
            w = word[:-1].lower()
            ww.words.add(w)
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
    UserInput = 4
    PlayerJoined = 5
    RemovePlayer = 6
    WrongGuess = 7


class GameStateDesc:
    """ Description of the current game state. """
    WaitingForPlayers = 0
    Playing = 1
    Starting = 2


Message = Dict
PlayerId = str


def player_letters_left_initial() -> Set[int]:
    l = set()
    for i in range(ord("а"), ord("я") + 1):
        l.add(i)
    return l

@dataclass
class PlayerInfo:
    """ Information on the current player state. """
    id: int = -1
    lives_left: int = LIVES_INITIAL
    nickname: str = None
    input: str = ""
    letters_left: Set[int] = field(default_factory=player_letters_left_initial)

    def to_json(self):
        return {
            **asdict(self),
            "letters_left": list(self.letters_left),
        }


@dataclass
class GameState:
    """ Current game state. Shared between client and server. """
    players: Dict[PlayerId, PlayerInfo] = field(default_factory=lambda: {})
    whos_turn: PlayerId = -1
    particle: str = None
    desc: GameStateDesc = GameStateDesc.WaitingForPlayers
    start_timer: int = -1
    guess: str = ""  # User guess (after pressing enter)
    last_player_to_answer: PlayerInfo = None
    used_words: Set[str] = field(default_factory=lambda: set())
    guess_correct: bool = False
    all_letters: List[str] = field(default_factory=player_letters_left_initial)

    def to_json(self):
        players_json = { pid: p.to_json() for pid, p in self.players.items() }
        return {
            **asdict(self),
            "all_letters": list(self.all_letters),
            "players": players_json,
            "used_words": list(self.used_words),
        }


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
    gsd = gs.to_json()
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
    await ws_send_to_all(W, { "type": SWMSG.WrongGuess, "id": player.id })


reward_random_letters = True

async def correct_guess(W: ServerState, player: PlayerInfo, guess: str):
    gs = W.game_state
    gs.used_words.add(guess)
    player.input = ""
    # use all letters in the word
    for letter in guess:
        k = ord(letter.lower())
        if k in player.letters_left:
            player.letters_left.remove(k)
    # Reward random letter
    if reward_random_letters:
        letter = random.choice(list(player.letters_left))
        player.letters_left.remove(letter)
        logger.debug(f"Random letter rewarded: {letter}")
    logger.debug(f"player={player.nickname}, letters_left={' '.join(list(map(lambda x: chr(x), player.letters_left)))}")
    if len(player.letters_left) == 0:
        player.lives_left += 1
        player.letters_left = player_letters_left_initial()


PlayersById = Dict[PlayerId, PlayerInfo]


async def end_game(W: ServerState):
    gs = W.game_state
    gs.desc = GameStateDesc.WaitingForPlayers
    # Reset players
    gs.particle = None
    gs.whos_turn = -1
    gs.start_timer = -1
    winner = gs.last_player_to_answer
    gs.players = {}
    gs.last_player_to_answer = None
    if winner is not None:
        await ws_send_to_all(W, {"type": SWMSG.EndGame, "winner": winner.to_json()})


def particles_dict_for(W: ServerState, diff: Difficulty):
    return W.ww.by_difficulty[diff]


def is_guess_correct(W: ServerState, guess: str) -> bool:
    return len(guess) >= MIN_PARTICLE_LENGTH and \
           guess in W.ww.words and \
           not guess in W.game_state.used_words and \
           W.game_state.particle in guess


@dataclass
class AlivePlayerNode:
    prev_: PlayerInfo = None
    next_: PlayerInfo = None
    player: PlayerInfo = None


def init_alive_players_list(playersById: PlayersById):
    players = list(playersById.values())
    head = AlivePlayerNode(player=players[0])
    curr = head
    i = 1
    while i < len(players):
        node = AlivePlayerNode(player=players[i], next_=None)
        curr.next_ = node
        node.prev_ = curr
        curr = node
        i += 1
    curr.next_ = head
    head.prev_ = curr
    return head


def ll_length(head: AlivePlayerNode):
    curr = head
    size = int(head.player.lives_left != 0)
    while curr.next_ is not None and not curr.next_ is head:
        curr = curr.next_
        if curr.player.lives_left > 0:
            size += 1
    return size


def ll_print(head: AlivePlayerNode):
    curr = head
    print(f"{curr.player.nickname}", end="")
    while curr.next_ is not None and not curr.next_ is head:
        curr = curr.next_
        print(f" -> {curr.player.nickname}", end="")
    print()


def ll_print_reverse(head: AlivePlayerNode):
    curr = head
    print(f"{curr.player.nickname}", end="")
    while curr.prev_ is not None and not curr.prev_ is head:
        curr = curr.prev_
        print(f" <- {curr.player.nickname}", end="")
    print()


def ll_remove(curr: AlivePlayerNode):
    curr.prev_.next_ = curr.next_
    curr.next_.prev_ = curr.prev_
    return curr.next_


def players_list_iter(ll_head: AlivePlayerNode):
    curr = ll_head
    while True:
        # Stop if not enough players alive
        ll_print(ll_head)
        players_left = ll_length(ll_head)
        print(f"next(): left={players_left}, curr={curr.player.nickname}")
        if players_left < MIN_PLAYERS_TO_START_GAME:
            break
        if curr.player.lives_left <= 0:
            curr = ll_remove(curr)
            continue
        p = curr.player
        curr = curr.next_
        yield p


async def start_game(W: ServerState):
    gs = W.game_state
    gs.desc = GameStateDesc.Starting
    gs.start_timer = TIME_UNTIL_START
    pdict = particles_dict_for(W, Difficulty.MIN_500)

    # Starting timer
    await notify_of_su(W, "desc", "start_timer")
    while gs.start_timer > 0:
        await notify_of_su(W, "start_timer")
        await asyncio.sleep(1)
        gs.start_timer -= 1

    gs.desc = GameStateDesc.Playing
    await notify_of_su(W, "desc")
    gs.last_player_to_answer = None

    alive_players = init_alive_players_list(gs.players)
    pit = players_list_iter(alive_players)

    try:
        while gs.desc == GameStateDesc.Playing:
            # Process current turn
            try:
                player = next(pit)
            except StopIteration:
                break
            player_id = player.id
            gs.last_player_to_answer = player
            player.input = ""
            logger.debug("Processing player {}".format(player.nickname))
            particle = random.choice(pdict)
            # logger.debug("Guessing {}".format(correct_guess))
            time_end = datetime.now() + timedelta(seconds=TIME_TO_ANSWER)
            gs.whos_turn = player_id
            gs.particle = particle
            await notify_of_su(W, "whos_turn", "particle", "players")
            while True:
                if gs.guess_correct:
                    gs.guess_correct = False
                    break
                curr_time = datetime.now()
                out_of_time = curr_time >= time_end
                if out_of_time:
                    if player.lives_left > 0:
                        player.lives_left -= 1
                    break
                await asyncio.sleep(TICK_DURATION)
        # Game ended
        await end_game(W)
    except Exception as e:
        logger.error(f"Error during start_game() loop: {e.__repr__()}")


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
    if is_game_in_progress(gs):
        await send_to_user(si, {"type": SWMSG.GameInProgress})
        return
    nickname = parsed["nickname"]
    logger.debug("{} is joining".format(nickname))
    ws_id = si.id
    new_player = PlayerInfo(
        nickname=nickname,
        lives_left=LIVES_INITIAL,
        id=ws_id,
    )
    gs.players[ws_id] = new_player
    await send_to_user(
        si, {"type": SWMSG.InitGame, "state": gs.to_json(), "player": new_player.to_json()})
    await ws_send_to_others(W, si, {"type": SWMSG.PlayerJoined, "player": new_player.to_json()})

    # If we're waiting for players and we have enough players, start the game
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
    player.input = parsed["input"]
    await ws_send_to_all(W, {"type": SWMSG.UserInput, "id": player.id, "input": player.input})


async def on_player_submit(W: ServerState, gs: GameState, si: ClientInfo, parsed: Message):
    # Can't submit guess if not your turn
    if si.id != gs.whos_turn:
        logger.warning(f"Player #{si.id} tried to submit guess during #{gs.whos_turn} player's turn")
        return
    player = gs.players[si.id]
    guess = parsed["guess"]
    gs.guess_correct = is_guess_correct(W, guess)
    if gs.guess_correct:
        logger.debug(f"Correct guess: {guess}")
        await correct_guess(W, player, guess)
    else:
        await wrong_guess(W, player)


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
    return str(__player_id)


def get_player(W: ServerState, pid: PlayerId) -> PlayerInfo:
    return W.game_state.players.get(pid, None)


def player_name(W: ServerState, pid: PlayerId) -> Optional[str]:
    p = get_player(W, pid)
    if p is None:
        return None
    return p.nickname


async def remove_client(W: ServerState, si: ClientInfo):
    pid = si.id
    if W.clients.get(pid, None) is not None:
        del W.clients[pid]


async def remove_player(W: ServerState, si: ClientInfo):
    pid = si.id
    gs = W.game_state
    if pid in gs.players:
        del gs.players[pid]
        await ws_send_to_others(W, si, {"type": SWMSG.RemovePlayer, "id": pid})
        if len(gs.players) < MIN_PLAYERS_TO_START_GAME:
            await end_game(W)
            if W.game_handle is not None:
                W.game_handle.cancel()


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
                _type = parsed["type"]
                f = ws_handlers_mapping.get(_type, None)
                if f is None:
                    logger.warning("Unknown message type received from client: {}".format(parsed))
                    continue
                await f(W, gs, si, parsed)
            elif msg.type == aiohttp.WSMsgType.ERROR:
                logger.error('ws connection closed with exception %s' % ws.exception())
    finally:
        # When a connection is stopped
        # Get rid of the client socket
        await remove_client(W, si)
        # Remove the player from the game
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
