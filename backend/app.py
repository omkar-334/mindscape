import datetime
import json
import os
import random
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

import openai
import uvicorn
from db import DBclient
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from llm import llm, openai_moderate
from models import Analyzer
from prompts import reflect_prompt, user_prompt
from pydub import AudioSegment
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


async def process_image(userid, content, q):
    try:
        emotions, remarks = await analyzer.analyze_image(content)

        results = dict(
            uid=userid,
            type="image",
            createdAt=datetime.datetime.now() - timedelta(days=random.randint(-7, 7)),
            content=remarks,
            emotions=emotions,
            score=0,
        )

        db.add_sentiment(userid, results, q)
        print(results)
        return success
    except openai.BadRequestError:
        print("image processed")
        return fail


async def process_audio(userid, audio_data, q):
    results = analyzer.analyze_audio(audio_data)
    emotions = results["emotion_scores"]
    emotions["sadness"] = emotions.pop("sad")
    emotions["surprise"] = emotions.pop("surprised")
    emotions["joy"] = emotions.pop("happy")
    emotions["anger"] = emotions.pop("angry")
    emotions["fear"] = emotions.pop("fearful")

    outdict = dict(
        uid=userid,
        type="audio",
        createdAt=datetime.datetime.now() - timedelta(days=random.randint(-7, 7)),
        content=f"Predicted emotion: {results['predicted_emotion']}",
        emotions=results["emotion_scores"],
        score=0,
    )
    print(outdict)
    db.add_sentiment(userid, outdict, q)
    return success


def save_file(file, extension):
    image_filename = f"{uuid4()}.{extension}"
    image_path = os.path.join(SAVE_DIR, image_filename)

    with open(image_path, "wb") as img_file:
        img_file.write(file)
    return image_path


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
    q=False,
):
    q = bool(q)
    image_bytes = await file.read()
    # image_filename = f"{uuid4()}.jpeg"
    # image_path = os.path.join(SAVE_DIR, image_filename)

    # with open(image_path, "wb") as img_file:
    #     img_file.write(image_bytes)
    background_tasks.add_task(process_image, user_id, image_bytes, q)
    return running


@app.post("/analyze_audio")
async def analyze_audio(
    user_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    q=False,
):
    q = bool(q)
    audio_bytes = await file.read()

    original_file_path = Path(SAVE_DIR) / f"{user_id}_input.{file.filename.split('.')[-1]}"
    converted_file_path = Path(SAVE_DIR) / f"{uuid4()}_converted.wav"

    with open(original_file_path, "wb") as f:
        f.write(audio_bytes)

    try:
        audio = AudioSegment.from_file(original_file_path)
        audio.export(converted_file_path, format="wav")
    except Exception as e:
        return {"error": f"Failed to process audio: {str(e)}"}

    background_tasks.add_task(process_audio, user_id, converted_file_path, q)

    return {"status": "running", "wav_path": str(converted_file_path)}


if __name__ == "__main__":
    # public_url = ngrok.connect(8000)
    # print(f" * ngrok tunnel available at {public_url}")
    uvicorn.run(
        app,
        port=8000,
        timeout_keep_alive=60,
    )
