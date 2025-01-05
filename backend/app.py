import datetime
import os
import random
from datetime import timedelta

import uvicorn
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pyngrok import ngrok

from db import DBclient
from llm import llm, openai_moderate
from models import Analyzer, Transcriber
from prompts import reflect_prompt, user_prompt

load_dotenv()
ngrok.set_auth_token(os.getenv("NGROK_TOKEN"))

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


def process_response(entity, type):
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


@app.post("/reflect")
async def reflect(prompt: str, user_id: str, background_tasks: BackgroundTasks) -> str:
    history = db.get_chat_history(user_id)
    chat_prompt = user_prompt.format(history, prompt)
    response = await llm(reflect_prompt, chat_prompt)
    chat = dict(
        content=prompt,
        uid=user_id,
    )
    background_tasks.add_task(process_response, chat, "chat")
    return response


@app.post("/analyze_post")
async def analyze_post(room_id: str, post_id: str, background_tasks: BackgroundTasks):
    post = db.get_post(room_id, post_id)
    background_tasks.add_task(process_response, post, "post")
    return running


@app.post("/analyze_note")
async def analyze_note(user_id: str, note_id: str, background_tasks: BackgroundTasks):
    note = db.get_note(user_id, note_id)
    background_tasks.add_task(process_response, note, "note")
    return running


@app.post("/moderate")
async def moderate(text: str) -> str:
    flagged = await openai_moderate(text)
    if flagged:
        return fail
    return success


@app.post("/analyze_audio")
async def analyze_audio(request: AudioRequest, background_tasks: BackgroundTasks):
    results = analyzer.analyze(request.audio_data, content_type="audio")
        
    outdict = dict(
        uid=request.user_id,
        type="audio",
        createdAt=datetime.datetime.now() - timedelta(days=random.randint(-7, 7)),
        content=results
    )
    
    background_tasks.add_task(db.add_sentiment, request.user_id, outdict)
        
    return results


@app.get('/')
async def home():
    return {'status':"success"}


if __name__ == "__main__":
#     public_url = ngrok.connect(8000)
#     print(f" * ngrok tunnel available at {public_url}")

    uvicorn.run(app, port=8000)
