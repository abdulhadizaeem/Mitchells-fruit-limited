import logging
import json
from fastapi import FastAPI, Request

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

@app.post("/trade-inquiry")
async def webhook(request: Request):
    data = await request.json()

    logger.info("Trade inquiry received")
    logger.info("Payload: %s", data)
    print(json.dumps(data, indent=4))

    return {"success": True}
    