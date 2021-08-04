import aiohttp
from aiohttp import web

routes = web.RouteTableDef()

class CWMSG:
  Joining = 0

class SWMSG:
  InitGame = 0


game_state = {
    players: {},
    whos_turn: -1,
    particle: None,
    user_input: "",
}

@routes.get('/words/')
async def words_game(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    async for msg in ws:
        print(msg)
        if msg.type == aiohttp.WSMsgType.TEXT:
            parsed = json.loads(msg.data)
            print(parsed)
            _type = parsed["type"]
            if _type == CWMSG.Joining:
                print("{} is joining".format(parsed.nickname))
                await ws.send_str({ "type": SWMSG.InitGame, "state": game_state })
            # await ws.send_str("hello")
        elif msg.type == aiohttp.WSMsgType.ERROR:
            print('ws connection closed with exception %s' %
                  ws.exception())
    print('websocket connection closed')
    return ws

app = web.Application()
app.add_routes(routes)

if __name__ == '__main__':
    web.run_app(app, host="127.0.0.1")
