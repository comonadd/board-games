from dataclasses import asdict, dataclass, field
from enum import Enum, IntEnum
from typing import Dict, List, Set, Any

from server.lang import Language
from server.ws_game import ClientId

PlayerId = ClientId
Letter = int
Letters = Set[Letter]


class WordsGameConfig:
    """Current lobby config."""

    lives_initial: int
    min_players_to_start_game: int
    lang: Language
    all_letters: Letters

    def __init__(
        self, lang: Language, lives_initial: int, min_players_to_start_game: int
    ) -> None:
        self.lang = lang
        self.lives_initial = lives_initial
        self.min_players_to_start_game = min_players_to_start_game
        self.all_letters = letters_for_lang(lang)


class PlayerInfo:
    """Information on the current player state."""

    id: PlayerId
    nickname: str
    input: str
    lives_left: int
    # Letters left for user to get an additional life
    letters_left: Letters

    def __init__(self, config: WordsGameConfig, id: PlayerId, nickname: str) -> None:
        self.id = id
        self.nickname = nickname
        self.lives_left = config.lives_initial
        self.letters_left = config.all_letters
        self.input = ""

    def to_json(self) -> Dict[str, Any]:
        return {
            **asdict(self),
            "letters_left": list(self.letters_left),
        }


PlayersById = Dict[PlayerId, PlayerInfo]


def letters_in_range(lstart: str, lend: str) -> Letters:
    letters = set()
    for i in range(ord(lstart), ord(lend) + 1):
        letters.add(i)
    return letters


lang_to_letters = {
    Language.Russian: letters_in_range("а", "я"),
    Language.English: letters_in_range("a", "z"),
}


def letters_for_lang(lang: Language) -> Letters:
    letters = lang_to_letters.get(lang, None)
    if letters is None:
        raise Exception(f"Language {lang} is not available")
    return letters


class Difficulty(Enum):
    """Game difficulty."""

    MIN_500 = 500
    MIN_300 = 300
    MIN_100 = 100


ParticleDict = Dict[str, int]


@dataclass
class WordGameDict:
    """Loaded game dictionary."""

    words: Set[str] = field(default_factory=lambda: set())
    particles: ParticleDict = field(default_factory=lambda: {})
    particle_keys: List[str] = field(default_factory=lambda: [])
    by_difficulty: Dict[Difficulty, List[str]] = field(default_factory=lambda: {})


class CWMSG:
    """Client messages."""

    Joining = 0
    UpdateInput = 1
    SubmitGuess = 2


class SWMSG:
    """Server messages."""

    InitGame = 0
    UpdateGameState = 1
    EndGame = 2
    GameInProgress = 3
    UserInput = 4
    PlayerJoined = 5
    RemovePlayer = 6
    WrongGuess = 7


class GameStateDesc(IntEnum):
    """Description of the current game state."""

    WaitingForPlayers = 0
    Playing = 1
    Starting = 2
