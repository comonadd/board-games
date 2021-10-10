from aiohttp import web
from server.env import DEV, HOST
from server.logger import configure_loggers, logger
from server.routes import routes
import server.words_game
import server.wiki_game


def create_app() -> web.Application:
    configure_loggers()
    logger.info("Running in {} mode".format("DEV" if DEV else "PROD"))
    app = web.Application()
    app.add_routes(routes)
    return app


if __name__ == "__main__":
    app_ = create_app()
    web.run_app(app_, host=HOST)
