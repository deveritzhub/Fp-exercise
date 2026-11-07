"""FastAPI-app: WhatsApp-agent (/whatsapp) en bel-agent (/voice)."""

import logging

from fastapi import FastAPI

from . import voice, whatsapp
from .business import get_business

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(title="Business Agent", description="WhatsApp- en telefoonassistent met Claude")
app.include_router(whatsapp.router)
app.include_router(voice.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "business": get_business().name}
