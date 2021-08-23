import pytest

from .server import *

def test_player_cycle():
    hello_player = PlayerInfo(id=2, nickname="Hello", lives_left=8)
    john = PlayerInfo(id=8, nickname="John", lives_left=2)
    someone = PlayerInfo(id=9, nickname="Someone", lives_left=0)
    whatever = PlayerInfo(id=12, nickname="Whatever", lives_left=1)
    players = {
        2: hello_player,
        8: john,
        9: someone,
        12: whatever,
    }
    a = init_alive_players_list(players)
    i = players_list_iter(a)
    assert next(i) == hello_player
    john.lives_left -= 1
    assert next(i) == john
    assert next(i) == whatever
    assert next(i) == hello_player
    assert next(i) == john
    assert next(i) == whatever
    assert next(i) == hello_player
    john.lives_left -= 1
    assert next(i) == whatever
    whatever.lives_left -= 1
    assert next(i) == hello_player
    with pytest.raises(StopIteration):
        assert next(i)
    with pytest.raises(StopIteration):
        assert next(i)
