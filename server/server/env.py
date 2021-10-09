import os
import pathlib

_FILE_DIR = pathlib.Path(__file__).parent.resolve()

DEV = os.environ.get("DEV", True)
HOST = os.environ.get("HOST", "127.0.0.1")
LOGS_DIR = os.environ.get("LOGS_DIR", os.path.join(_FILE_DIR, "../logs"))
