import logging
import json
import aiohttp
from aiohttp import web
import asyncio

logger = logging.getLogger(__name__)
routes = web.RouteTableDef()

TIME_UNTIL_START = 4
LIVES_INITIAL = 3
MIN_PLAYERS_TO_START_GAME = 1

class CWMSG:
  Joining = 0

class SWMSG:
  InitGame = 0
  UpdateGameState = 1

class GameStateDesc:
  WaitingForPlayers = 0
  Playing = 1
  Starting = 2

def initial_game_state():
  return {
    "players": {},
    "whos_turn": -1,
    "particle": None,
    "user_input": "",
    "desc": GameStateDesc.WaitingForPlayers,
    "start_timer": -1
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

async def notify_all_others_of_su(W, si, *keys):
  msg = state_update_msg(W, *keys)
  return await ws_send_to_others(W, si, msg)

async def start_game(W):
  gs = W["game_state"]
  gs["desc"] = GameStateDesc.Starting
  gs["start_timer"] = TIME_UNTIL_START
  await notify_of_su(W, "desc", "start_timer")
  for i in range(TIME_UNTIL_START, 0, -1):
    gs["start_timer"] -= 1
    await notify_of_su(W, "start_timer")
    await asyncio.sleep(1000)

async def send_to_user(si, msg):
  return await si["socket"].send_json(msg)

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
  await notify_of_su(W, "players")
  if len(gs["players"]) >= MIN_PLAYERS_TO_START_GAME:
    await start_game(W)
  await send_to_user(si, { "type": SWMSG.InitGame, "state": gs })

ws_handlers_mapping = {
  CWMSG.Joining: on_player_joined,
}

__player_id = 0

def next_player_id():
  global __player_id
  __player_id += 1
  return __player_id

async def remove_player(W, gs, si):
  pid = si["id"]
  if W["clients"].get(pid, None) is not None:
    del W["clients"][pid]
  if pid in gs["players"]:
    del gs["players"][pid]
  await notify_all_others_of_su(W, si, "players")

@routes.get('/words/')
async def words_game(request):
  ws = web.WebSocketResponse()
  await ws.prepare(request)
  W = words_server_state
  gs = ws_game_state(W)
  pid = next_player_id()
  si = { "id": pid, "socket": ws }
  W["clients"][pid] = ws
  async for msg in ws:
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
  await remove_player(W, gs, si)
  return ws

app = web.Application()
app.add_routes(routes)

if __name__ == '__main__':
  web.run_app(app, host="127.0.0.1")
