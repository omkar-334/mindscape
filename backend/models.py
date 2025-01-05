import base64
import json
import os
import random

from google.cloud import language_v1, speech
from google.oauth2 import service_account
from openai import AsyncOpenAI
from strictjson import strict_json_async
from transformers import pipeline

from llm import llm


def load_language_client():
    credentials = service_account.Credentials.from_service_account_file(
        "creds.json",
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )
    client = language_v1.LanguageServiceClient(credentials=credentials)
    return client


def load_speech_client():
    credentials = service_account.Credentials.from_service_account_file(
        "creds.json",
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )
    client = speech.SpeechClient(credentials=credentials)
    return client


def load_model():
    model = pipeline(
        "text-classification",
        model="j-hartmann/emotion-english-distilroberta-base",
        top_k=None,
    )
    return model


emotion_dict = {
    "sadness": "The percentage of sadness emotion in the described image, type: int",
    "surprise": "The percentage of surprise emotion in the described image, type: int",
    "joy": "The percentage of joy emotion in the described image, type: int",
    "neutral": "The percentage of neutral emotion in the described image, type: int",
    "anger": "The percentage of anger emotion in the described image, type: int",
    "fear": "The percentage of fear emotion in the described image, type: int",
    "disgust": "The percentage of disgust emotion in the described image, type: int",
}


class Analyzer:
    def __init__(self):
        self.client = load_language_client()
        self.openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_KEY"))
        self.model = load_model()
        self.emotions = {
            "joy": ["happy", "delighted", "cheerful", "pleased"],
            "trust": ["trustful", "accepting", "confident"],
            "fear": ["scared", "anxious", "terrified", "worried"],
            "surprise": ["amazed", "astonished", "unexpected"],
            "sadness": ["sad", "depressed", "heartbroken", "grief"],
            "disgust": ["disgusted", "repulsed", "revolted"],
            "anger": ["angry", "furious", "outraged", "irritated"],
            "anticipation": ["expectant", "interested", "alert"],
            "serenity": ["peaceful", "calm", "tranquil"],
            "interest": ["curious", "attentive", "focused"],
        }

        self.combinations = {
            ("joy", "trust"): "love",
            ("trust", "fear"): "submission",
            ("fear", "surprise"): "awe",
            ("surprise", "sadness"): "disapproval",
            ("sadness", "disgust"): "remorse",
            ("disgust", "anger"): "contempt",
            ("anticipation", "anger"): "aggressiveness",
            ("serenity", "interest"): "optimism",
        }

    def analyze(self, text: str) -> dict:
        document = language_v1.Document(
            content=text,
            type_=language_v1.Document.Type.PLAIN_TEXT,
        )
        sentiment = self.client.analyze_sentiment(document=document)
        emotion_results = self.model(text)[0]
        return {
            "score": sentiment.document_sentiment.score,
            "emotions": {emotion["label"]: emotion["score"] for emotion in emotion_results},
        }

    async def analyze_image(self, image, path=False):
        if path:
            image = open(image, "rb").read()
        base64_image = base64.b64encode(image).decode("utf-8")

        response = await self.openai_client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"Classify the emotion of the human and evaluate percentages for each of the 7 emotions - {','.join(list(emotion_dict.keys()))}.All the percentages should add up to 100. Also describe the image and the person. Return a json object with the following keys - {','.join(list(emotion_dict.keys()))}, remarks",
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                                "detail": "low",
                            },
                        },
                    ],
                }
            ],
        )

        d1 = dict(json.loads(response.choices[0].message.content))
        remarks = d1.pop("remarks")

        system_prompt = f"Evaluate the emotional state of the person described by the following situation and Classify the emotion percentages for each of the 7 emotions - {','.join(list(emotion_dict.keys()))}"
        d2 = await strict_json_async(system_prompt=system_prompt, user_prompt=remarks, output_format=emotion_dict, llm=llm)
        response = {key: random.uniform(d1[key], d2[key]) / 100 for key in d1}
        return response, remarks


class Transcriber:
    def __init__(self):
        self.client = load_speech_client()

    def transcribe(self, audio_file):
        with open(audio_file, "rb") as file:
            audio_content = file.read()

        audio = speech.RecognitionAudio(content=audio_content)

        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=44100,
            language_code="en-US",
            audio_channel_count=2,
            enable_separate_recognition_per_channel=False,
            enable_automatic_punctuation=True,
            use_enhanced=True,
        )

        try:
            response = self.client.recognize(config=config, audio=audio)
            if not response.results:
                return ""

            full_transcript = ""
            for result in response.results:
                if result.alternatives:
                    transcript = result.alternatives[0].transcript
                    full_transcript += transcript + " "

            return full_transcript.strip()

        except Exception as e:
            print(f"An error occurred during transcription: {str(e)}")
            raise
