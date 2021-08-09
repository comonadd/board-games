import logging
import json
import aiohttp
import asyncio
from aiohttp import web
from aiohttp.http_websocket import WSCloseCode, WSMessage
from itertools import cycle

logger = logging.getLogger(__name__)
routes = web.RouteTableDef()

TIME_UNTIL_START = 4
LIVES_INITIAL = 3
MIN_PLAYERS_TO_START_GAME = 2

class CWMSG:
  Joining = 0

class SWMSG:
  InitGame = 0
  UpdateGameState = 1

class GameStateDesc:
  WaitingForPlayers = 0
  Playing = 1
  Starting = 2
  Ended = 3

def initial_game_state():
  return {
    "players": {},
    "whos_turn": -1,
    "particle": None,
    "desc": GameStateDesc.WaitingForPlayers,
    "start_timer": -1,
    "user_input": "", # Current user input preview
    "guess": "",      # User guess (after pressing enter)
    "last_player_to_answer": None,
  }

words_server_state = {
  "game_state": initial_game_state(),
  "clients": {},
}

async def ws_send_to_all(W, msg):
  print("ws_send_To_all")
  for _, sock in W["clients"].items():
    await sock.send_json(msg)

def current_user_id(si):
  return si["id"]

async def ws_send_to_others(W, si, msg):
  print("ws_send_to_others")
  print(W["clients"], si)
  cuid = current_user_id(si)
  for _id, sock in W["clients"].items():
    if _id != cuid:
      print(_id)
      await sock.send_json(msg)

def ws_game_state(W):
  return W["game_state"]

def state_update_msg(W, *keys):
  gs = W["game_state"]
  msg = {
    "type": SWMSG.UpdateGameState,
    "state": { key: gs[key] for key in keys }
  }
  return msg

async def notify_of_su(W, *keys):
  msg = state_update_msg(W, *keys)
  return await ws_send_to_all(W, msg)

async def notify_others_of_su(W, si, *keys):
  msg = state_update_msg(W, *keys)
  return await ws_send_to_others(W, si, msg)

TIME_TO_ANSWER = 1

async def wrong_guess(W, player):
  if player["lives_left"] > 0:
    player["lives_left"] -= 1
  await notify_of_su(W, "players")

def cycle_alive_players(players):
  while True:
    player_dead_counted = 0
    for p in players:
      player = players[p]
      if player["lives_left"] == 0:
        player_dead_counted += 1
        if player_dead_counted >= len(players):
          # Everyone is dead so stop the iteration
          return
        continue
      else:
        yield p, player
        player_dead_counted = 0

async def end_game(W):
  gs = W["game_state"]
  gs["desc"] = GameStateDesc.Ended
  await notify_of_su(W, "desc", "last_player_to_answer")

async def start_game(W):
  gs = W["game_state"]
  gs["desc"] = GameStateDesc.Starting
  gs["start_timer"] = TIME_UNTIL_START
  await notify_of_su(W, "desc", "start_timer")
  for i in range(TIME_UNTIL_START, 0, -1):
    gs["start_timer"] -= 1
    await notify_of_su(W, "start_timer")
    await asyncio.sleep(1)
  gs["desc"] = GameStateDesc.Playing
  pit = cycle_alive_players(gs["players"])
  gs["last_player_to_answer"] = None
  try:
    while True:
      # Process current turn
      player_id, player = next(pit)
      gs["last_player_to_answer"] = player_id
      print("Processing player {}".format(player["nickname"]))
      correct_guess = "tre"
      print("Guessing {}".format(correct_guess))
      time_left = TIME_TO_ANSWER
      gs["whos_turn"] = player_id
      gs["particle"] = correct_guess
      gs["user_input"] = ""
      await notify_of_su(W, "whos_turn", "particle", "user_input", "last_player_to_answer")
      while True:
        if gs["guess"] == correct_guess:
          logger.debug("Correct guess!!")
          break
        if time_left <= 0:
          logger.debug("Failed")
          await wrong_guess(W, player)
          break
        await asyncio.sleep(1)
        time_left -= 1
  except StopIteration:
    # Game ended
    await end_game(W)

async def reset_game(W):
  gs = W["game_state"]
  gs["desc"] = GameStateDesc.WaitingForPlayers
  gs["start_timer"] = -1
  gs["user_input"] = ""
  gs["particle"] = None
  gs["whos_turn"] = -1
  await notify_of_su(W, "desc", "start_timer", "user_input", "particle", "whos_turn")

async def send_to_user(si, msg):
  return await si["socket"].send_json(msg)

def waiting_for_players(gs):
  return gs["desc"] == GameStateDesc.WaitingForPlayers

async def on_player_joined(W, gs, si, parsed):
  nickname = parsed["nickname"]
  print("{} is joining".format(nickname))
  # We ahve enough players to start the game
  ws_id = si["id"]
  gs["players"][ws_id] = {
    "nickname": nickname,
    "lives_left": LIVES_INITIAL,
    "id": ws_id,
  }
  await send_to_user(si, { "type": SWMSG.InitGame, "state": gs })
  await notify_others_of_su(W, si, "players")
  if waiting_for_players(gs) and len(gs["players"]) >= MIN_PLAYERS_TO_START_GAME:
    await start_game(W)

ws_handlers_mapping = {
  CWMSG.Joining: on_player_joined,
}

__player_id = 0

def next_player_id():
  global __player_id
  __player_id += 1
  return __player_id

async def remove_player(W, si):
  pid = si["id"]
  gs = W["game_state"]
  if W["clients"].get(pid, None) is not None:
    del W["clients"][pid]
  if pid in gs["players"]:
    del gs["players"][pid]
  if len(gs["players"]) < MIN_PLAYERS_TO_START_GAME:
    await reset_game(W)
  await notify_others_of_su(W, si, "players")

def is_user_connected(W, pid):
  return W["clients"].get(pid, None) is not None

@routes.get('/words/')
async def words_game(request):
  ws = web.WebSocketResponse()
  ready = ws.can_prepare(request=request)
  if not ready:
    await ws.close(code=WSCloseCode.PROTOCOL_ERROR)
  await ws.prepare(request)
  W = words_server_state
  gs = ws_game_state(W)
  pid = next_player_id()
  logger.info("preparing connection for id={}".format(pid));
  # TODO: Maybe also check username?
  if is_user_connected(W, pid):
    logger.warning("User id={} already connected, disconnecting.".format(pid));
    await ws.close(code=WSCloseCode.TRY_AGAIN_LATER, message=b'Already connected')
    return ws
  # Add user to the client list
  si = { "id": pid, "socket": ws }
  W["clients"][pid] = ws
  try:
    async for msg in ws:
      if not isinstance(msg, WSMessage):
        continue
      if msg.type == aiohttp.WSMsgType.TEXT:
        parsed = json.loads(msg.data)
        print(parsed)
        _type = parsed["type"]
        f = ws_handlers_mapping.get(_type, None)
        if f is None:
          logger.warning("Unknown message type received from client: {}".format(parsed))
          continue
        await f(W, gs, si, parsed)
      elif msg.type == aiohttp.WSMsgType.ERROR:
        print('ws connection closed with exception %s' % ws.exception())
  finally:
    # When a connection is stopped, remove the connection
    await remove_player(W, si)
    print("closing connection for id={}".format(pid))
  return ws

app = web.Application()
app.add_routes(routes)

words = {}
particles = {}

def load_dictionary():
  logger.info("Loading dictionary...")
  words_dict_path = "./russian-words/words.txt"
  particles_path = "./russian-words/words.txt"
  with open(words_dict_path, "r", encoding="windows-1251") as f:
    for word in f.readlines():
      words[word[:-2]] = True
  with open(particles_path, "r", encoding="utf-8") as f:
    particles = json.load(f)
  logger.info("Done.")
  print(words)
  print(particles)

if __name__ == '__main__':
  load_dictionary()
  web.run_app(app, host="127.0.0.1")
