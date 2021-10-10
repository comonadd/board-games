from dataclasses import dataclass
from typing import Any, Generator, Optional

from server.words_game_common import PlayerInfo, PlayersById, WordsGameConfig


@dataclass
class AlivePlayerNode:
    player: PlayerInfo
    prev_: Any = None
    next_: Any = None


def init_alive_players_list(players_by_id: PlayersById) -> AlivePlayerNode:
    players = list(players_by_id.values())
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


def ll_length(head: AlivePlayerNode) -> int:
    curr = head
    size = int(head.player.lives_left != 0) if head.player is not None else 0
    while curr.next_ is not None and curr.next_ is not head:
        curr = curr.next_
        if curr.player.lives_left > 0:
            size += 1
    return size


def ll_print(head: AlivePlayerNode) -> None:
    curr = head
    print(f"{curr.player.nickname}", end="")
    while curr.next_ is not None and curr.next_ is not head:
        curr = curr.next_
        print(f" -> {curr.player.nickname}", end="")
    print()


def ll_print_reverse(head: AlivePlayerNode) -> None:
    curr = head
    print(f"{curr.player.nickname}", end="")
    while curr.prev_ is not None and curr.prev_ is not head:
        curr = curr.prev_
        print(f" <- {curr.player.nickname}", end="")
    print()


def ll_remove(curr: AlivePlayerNode) -> Any:
    curr.prev_.next_ = curr.next_
    curr.next_.prev_ = curr.prev_
    return curr.next_


def players_list_iter(
    config: WordsGameConfig, ll_head: AlivePlayerNode
) -> Generator[PlayerInfo, None, None]:
    curr = ll_head
    while True:
        # Stop if not enough players alive
        ll_print(ll_head)
        players_left = ll_length(ll_head)
        print(f"next(): left={players_left}, curr={curr.player.nickname}")
        if players_left < config.min_players_to_start_game:
            break
        if curr.player.lives_left <= 0:
            curr = ll_remove(curr)
            continue
        p = curr.player
        curr = curr.next_
        yield p
