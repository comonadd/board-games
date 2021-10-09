import os
import logging
from server.env import DEV, LOGS_DIR

logger = logging.getLogger("server")


def configure_loggers():
    f_format = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    if DEV:
        logger.setLevel(logging.DEBUG)
        f_handler = logging.FileHandler(os.path.join(LOGS_DIR, "server.dev.log"))
        f_handler.setLevel(logging.DEBUG)
        f_handler.setFormatter(f_format)
        logger.addHandler(f_handler)
    else:
        logger.setLevel(logging.INFO)
        f_handler = logging.FileHandler(os.path.join(LOGS_DIR, "server.prod.log"))
        f_handler.setLevel(logging.INFO)
        f_handler.setFormatter(f_format)
        logger.addHandler(f_handler)
