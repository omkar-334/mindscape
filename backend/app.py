import datetime
import json
import os
import random
from datetime import timedelta
from typing import Optional
from uuid import uuid4

import uvicorn
from db import DBclient
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, File, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from llm import llm, openai_moderate
from models import Analyzer, Transcriber
from prompts import reflect_prompt, user_prompt
from pydantic import BaseModel
from pyngrok import ngrok

load_dotenv()
ngrok.set_auth_token(token := os.getenv("NGROK_TOKEN"))
SAVE_DIR = "images"
os.makedirs(SAVE_DIR, exist_ok=True)  # Ensure the directory exists

running = {"status": "running"}
success = {"status": "success"}
fail = {"status": "fail"}


analyzer = Analyzer()
transriber = Transcriber()
db = DBclient()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def process_text(entity, type):
    uid = entity.get("uid", entity.get("userId", None))
    if not uid:
        return fail

    results = analyzer.analyze(entity["content"])

    outdict = dict(
        uid=uid,
        type=type,
        createdAt=datetime.datetime.now() - timedelta(days=random.randint(-7, 7)),
        content=entity["content"],
    )
    results = results | outdict
    db.add_sentiment(uid, results)
    print(results)
    return success


async def process_image(userid, content, type):
    try:
        emotions, remarks = await analyzer.analyze_image(content)

        results = dict(
            uid=userid,
            type=type,
            createdAt=datetime.datetime.now() - timedelta(days=random.randint(-7, 7)),
            content=remarks,
            emotions=emotions,
            score=0,
        )
        if userid:
            db.add_sentiment(userid, results)
        print(results)
        return success
    except Exception:
        return fail


@app.get("/")
async def home():
    return {"status": "success"}


@app.get("/therapists")
def therapists():
    with open("data.json", "r", encoding="utf-8") as json_file:
        loaded_data = json.load(json_file)
        return {"therapists": loaded_data}


@app.post("/reflect")
async def reflect(prompt: str, user_id: str, background_tasks: BackgroundTasks) -> str:
    history = db.get_chat_history(user_id)
    chat_prompt = user_prompt.format(history, prompt)
    response = await llm(reflect_prompt, chat_prompt)
    chat = dict(
        content=prompt,
        uid=user_id,
    )
    background_tasks.add_task(process_text, chat, "chat")
    return response


@app.post("/analyze_post")
async def analyze_post(room_id: str, post_id: str, background_tasks: BackgroundTasks):
    post = db.get_post(room_id, post_id)
    background_tasks.add_task(process_text, post, "post")
    return running


@app.post("/analyze_note")
async def analyze_note(user_id: str, note_id: str, background_tasks: BackgroundTasks):
    note = db.get_note(user_id, note_id)
    background_tasks.add_task(process_text, note, "note")
    return running


@app.post("/moderate")
async def moderate(text: str) -> str:
    flagged = await openai_moderate(text)
    if flagged:
        return fail
    return success


class ImageRequest(BaseModel):
    image_bytes: str


@app.post("/analyze_image")
async def analyze_image(
    user_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    image_bytes = await file.read()
    # image_filename = f"{uuid4()}.jpeg"
    # image_path = os.path.join(SAVE_DIR, image_filename)

    # with open(image_path, "wb") as img_file:
    #     img_file.write(image_bytes)

    background_tasks.add_task(process_image, user_id, image_bytes, "image")
    return running


if __name__ == "__main__":
    # public_url = ngrok.connect(8000)
    # print(f" * ngrok tunnel available at {public_url}")
    uvicorn.run(
        app,
        port=8000,
        timeout_keep_alive=60,
    )
