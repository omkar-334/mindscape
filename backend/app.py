import datetime
import io
import json
import os
import random
from datetime import timedelta
from uuid import uuid4

import numpy as np
import soundfile as sf
import uvicorn
from db import DBclient
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from llm import llm, openai_moderate
from models import Analyzer
from prompts import reflect_prompt, user_prompt
from pyngrok import ngrok

load_dotenv()
ngrok.set_auth_token(token := os.getenv("NGROK_TOKEN"))

running = {"status": "running"}
success = {"status": "success"}
fail = {"status": "fail"}

SAVE_DIR = "images"
os.makedirs(SAVE_DIR, exist_ok=True)

analyzer = Analyzer()
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


async def process_image(userid, content):
    # try:
    emotions, remarks = await analyzer.analyze_image(content)

    results = dict(
        uid=userid,
        type="image",
        createdAt=datetime.datetime.now() - timedelta(days=random.randint(-7, 7)),
        content=remarks,
        emotions=emotions,
        score=0,
    )

    db.add_sentiment(userid, results)
    print(results)
    return success
    # except Exception:
    #     return fail


def process_audio(userid, content):
    try:
        # Convert BytesIO to in-memory bytes array for soundfile
        audio_bytes = content.getvalue()

        # Create a new BytesIO object with the audio bytes
        with io.BytesIO(audio_bytes) as audio_buffer:
            # Read audio data using soundfile
            audio_data, samplerate = sf.read(audio_buffer)

            # Convert to mono if stereo
            if len(audio_data.shape) > 1:
                audio_data = np.mean(audio_data, axis=1)

            # Get emotion analysis results
            results = analyzer.analyze_audio(audio_data, samplerate)

            outdict = dict(
                uid=userid,
                type="audio",
                createdAt=datetime.datetime.now() - timedelta(days=random.randint(-7, 7)),
                content=f"Audio emotion analysis - Primary: {results['primary_emotion']} ({results['confidence']:.2%})",
                emotions=results["emotions"],
                primary_emotion=results["primary_emotion"],
                confidence=results["confidence"],
            )

            db.add_sentiment(userid, outdict)
            print(outdict)
            return success

    except Exception as e:
        print(f"Error processing audio: {str(e)}")
        return fail


def save_file(file, extension):
    image_filename = f"{uuid4()}.{extension}"
    image_path = os.path.join(SAVE_DIR, image_filename)

    with open(image_path, "wb") as img_file:
        img_file.write(file)


@app.get("/")
async def home():
    return success


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


@app.post("/analyze_image")
async def analyze_image(
    user_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    image_bytes = await file.read()
    background_tasks.add_task(process_image, user_id, image_bytes)
    return running


@app.post("/analyze_audio")
async def analyze_audio(
    user_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    audio_bytes = await file.read()
    audio_file = io.BytesIO(audio_bytes)
    background_tasks.add_task(process_audio, user_id, audio_file)
    return running


if __name__ == "__main__":
    # public_url = ngrok.connect(8000)
    # print(f" * ngrok tunnel available at {public_url}")
    uvicorn.run(
        app,
        port=8000,
        timeout_keep_alive=60,
    )
