import asyncio
import json
import random
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from typing import Callable, Dict, List, Optional, Set, Any, Coroutine

from aiohttp.web_request import Request
from aiohttp.web_ws import WebSocketResponse

from server.alive_players_list import init_alive_players_list, players_list_iter
from server.lang import Language
from server.logger import logger
from server.routes import routes
from server.words_game_common import (
    PlayerInfo,
    Letter,
    PlayersById,
    PlayerId,
    GameStateDesc,
    WordGameDict,
    Difficulty,
    CWMSG,
    SWMSG,
    WordsGameConfig,
)
from server.ws_game import ClientInfo, WSGame, Message, MessageHandler

# Settings
TIME_UNTIL_START = 10
LIVES_INITIAL = 3
MIN_PLAYERS_TO_START_GAME = 2
TICK_DURATION = 0.05
TIME_TO_ANSWER = 15
WORDS_DICT_PATH = "./assets/words.txt"
PARTICLES_PATH = "./assets/particles.json"
MIN_PARTICLE_LENGTH = 3
reward_random_letters = True


# TODO: Make this lobby-local
@dataclass
class GameState:
    """Current game state. Shared between client and server."""

    config: WordsGameConfig

    # Players currently in-game
    players: PlayersById = field(default_factory=lambda: {})
    # Id of player currently taking a turn
    whos_turn: Optional[PlayerId] = None
    # Current particle
    particle: Optional[str] = None
    # Current game state
    desc: GameStateDesc = GameStateDesc.WaitingForPlayers
    # Starting timer
    start_timer: int = -1
    # The last user guess
    guess: str = ""  # User guess (after pressing enter)
    last_player_to_answer: Optional[PlayerInfo] = None
    # Words used already in the game
    used_words: Set[str] = field(default_factory=lambda: set())
    guess_correct: bool = False

    def to_json(self) -> Dict[str, Any]:
        players_json = {pid: p.to_json() for pid, p in self.players.items()}
        return {
            **asdict(self),
            "all_letters": list(self.config.all_letters),
            "players": players_json,
            "used_words": list(self.used_words),
        }


def initial_game_state(config: WordsGameConfig) -> GameState:
    return GameState(config)


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
        particles = list(
            filter(lambda p: ww.particles[p] >= diff.value, ww.particle_keys)
        )
        ww.by_difficulty[diff] = particles
        logger.info("Loaded {} difficulty={} words.".format(len(particles), diff))
    logger.info(
        "Done. Loaded {} words and {} particles".format(
            len(ww.words), len(ww.particles)
        )
    )
    return ww


class WikiGame(WSGame):
    game_state: GameState
    # Handle to asyncio.Task that executes the game loop
    game_handle = None
    ws_handlers_mapping: Dict[CWMSG, MessageHandler]
    ww: WordGameDict
    config: WordsGameConfig

    def __init__(self) -> None:
        super().__init__()
        self.config = WordsGameConfig(
            lives_initial=3, lang=Language.Russian, min_players_to_start_game=2
        )
        self.game_state = initial_game_state(self.config)
        self.ws_handlers_mapping = {
            CWMSG.Joining: self.on_player_joined,  # type: ignore
            CWMSG.UpdateInput: self.on_player_input,  # type: ignore
            CWMSG.SubmitGuess: self.on_player_submit,  # type: ignore
        }
        self.ww = load_dictionary(WORDS_DICT_PATH, PARTICLES_PATH)

    def get_player(self, pid: PlayerId) -> Optional[PlayerInfo]:
        """Get player state by his ID"""
        return self.game_state.players.get(pid, None)

    def player_name(self, pid: PlayerId) -> Optional[str]:
        p = self.get_player(pid)
        if p is None:
            return None
        return p.nickname

    def state_update_msg(self, *keys: str) -> Message:
        gs = self.game_state
        gsd = gs.to_json()
        msg = {"type": SWMSG.UpdateGameState, "state": {key: gsd[key] for key in keys}}
        return msg

    async def notify_of_su(self, *keys: str) -> None:
        msg = self.state_update_msg(*keys)
        return await self.send_to_all(msg)

    async def notify_others_of_su(self, si: ClientInfo, *keys: str) -> None:
        msg = self.state_update_msg(*keys)
        return await self.send_to_others(si, msg)

    async def wrong_guess(self, player: PlayerInfo) -> None:
        await self.send_to_all({"type": SWMSG.WrongGuess, "id": player.id})

    async def correct_guess(self, player: PlayerInfo, guess: str) -> None:
        gs = self.game_state
        gs.used_words.add(guess)
        player.input = ""
        # use all letters in the word
        for letter in guess:
            k = ord(letter.lower())
            if k in player.letters_left:
                player.letters_left.remove(k)
        # Reward random letter
        if reward_random_letters:
            letter_to_remove: Letter = random.choice(list(player.letters_left))
            player.letters_left.remove(letter_to_remove)
            logger.debug(f"Random letter rewarded: {letter}")
        logger.debug(
            f"player={player.nickname}, letters_left={' '.join(list(map(lambda x: chr(x), player.letters_left)))}"
        )
        if len(player.letters_left) == 0:
            player.lives_left += 1
            player.letters_left = self.config.all_letters

    async def end_game(self) -> None:
        gs = self.game_state
        gs.desc = GameStateDesc.WaitingForPlayers
        # Reset players
        gs.particle = None
        gs.whos_turn = None
        gs.start_timer = -1
        winner = gs.last_player_to_answer
        gs.players = {}
        gs.last_player_to_answer = None
        if winner is not None:
            await self.send_to_all({"type": SWMSG.EndGame, "winner": winner.to_json()})

    def particles_dict_for(self, diff: Difficulty) -> List[str]:
        return self.ww.by_difficulty[diff]

    def is_guess_correct(self, guess: str) -> bool:
        return (
            len(guess) >= MIN_PARTICLE_LENGTH
            and guess in self.ww.words
            and guess not in self.game_state.used_words
            and self.game_state.particle is not None
            and self.game_state.particle in guess
        )

    def waiting_for_players(self) -> bool:
        return self.game_state.desc == GameStateDesc.WaitingForPlayers

    def starting_the_game(self) -> bool:
        return self.game_state.desc == GameStateDesc.Starting

    def is_game_in_progress(self) -> bool:
        return self.game_state.desc == GameStateDesc.Playing

    async def start_game(self) -> None:
        gs = self.game_state
        gs.desc = GameStateDesc.Starting
        gs.start_timer = TIME_UNTIL_START
        pdict = self.particles_dict_for(Difficulty.MIN_500)

        # Starting timer
        await self.notify_of_su("desc", "start_timer")
        while gs.start_timer > 0:
            await self.notify_of_su("start_timer")
            await asyncio.sleep(1)
            gs.start_timer -= 1

        gs.desc = GameStateDesc.Playing
        await self.notify_of_su("desc")
        gs.last_player_to_answer = None

        alive_players = init_alive_players_list(gs.players)
        pit = players_list_iter(self.config, alive_players)

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
                await self.notify_of_su("whos_turn", "particle", "players")
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
            await self.end_game()
        except Exception as e:
            logger.error(f"Error during start_game() loop: {e.__repr__()}")

    async def on_player_joined(self, si: ClientInfo, parsed: Message) -> None:
        if self.is_game_in_progress():
            await self.send_to_user(si, {"type": SWMSG.GameInProgress})
            return
        nickname = parsed["nickname"]
        logger.debug("{} is joining".format(nickname))
        ws_id = si.id
        new_player = PlayerInfo(
            self.config,
            id=ws_id,
            nickname=nickname,
        )
        gs = self.game_state
        gs.players[ws_id] = new_player
        await self.send_to_user(
            si,
            {
                "type": SWMSG.InitGame,
                "state": gs.to_json(),
                "player": new_player.to_json(),
            },
        )
        await self.send_to_others(
            si, {"type": SWMSG.PlayerJoined, "player": new_player.to_json()}
        )

        # If we're waiting for players and we have enough players, start the game
        if self.waiting_for_players() and len(gs.players) >= MIN_PLAYERS_TO_START_GAME:
            self.game_handle = asyncio.create_task(self.start_game())
        elif self.starting_the_game():
            # Stop the starting sequence and restart it
            assert self.game_handle is not None
            self.game_handle.cancel()
            self.game_handle = asyncio.create_task(self.start_game())

    async def on_player_input(self, si: ClientInfo, parsed: Message) -> None:
        # Can't update input if not your turn
        gs = self.game_state
        if si.id != gs.whos_turn:
            logger.warning(
                f"Player #{si.id} tried to update input during #{gs.whos_turn} player's turn"
            )
            return
        player = gs.players[si.id]
        player.input = parsed["input"]
        await self.send_to_all(
            {"type": SWMSG.UserInput, "id": player.id, "input": player.input}
        )

    async def on_player_submit(self, si: ClientInfo, parsed: Message) -> None:
        # Can't submit guess if not your turn
        gs = self.game_state
        if si.id != gs.whos_turn:
            logger.warning(
                f"Player #{si.id} tried to submit guess during #{gs.whos_turn} player's turn"
            )
            return
        player = gs.players[si.id]
        guess = parsed["guess"]
        gs.guess_correct = self.is_guess_correct(guess)
        if gs.guess_correct:
            logger.debug(f"Correct guess: {guess}")
            await self.correct_guess(player, guess)
        else:
            await self.wrong_guess(player)

    async def handle_msg(self, si: ClientInfo, _type: CWMSG, msg: Message) -> None:
        f = self.ws_handlers_mapping.get(_type, None)
        if f is None:
            logger.warning("Unknown message type received from client: {}".format(msg))
        else:
            await f(si, msg)

    async def remove_player(self, pid: PlayerId, si: ClientInfo) -> None:
        gs = self.game_state
        if pid in gs.players:
            del gs.players[pid]
            await self.send_to_others(si, {"type": SWMSG.RemovePlayer, "id": pid})
            if len(gs.players) < MIN_PLAYERS_TO_START_GAME:
                await self.end_game()
                if self.game_handle is not None:
                    self.game_handle.cancel()


wiki_game = WikiGame()


@routes.get("/words/")
async def words_game(request: Request) -> WebSocketResponse:
    """This route handles the words WebSocket API."""
    return await wiki_game.handle_req(request)
