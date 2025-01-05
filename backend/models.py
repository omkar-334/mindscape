import base64
import json
import os
import random

import librosa
import numpy as np
import torch
from google.cloud import language_v1, speech
from google.oauth2 import service_account
from llm import llm
from openai import AsyncOpenAI
from strictjson import strict_json_async
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification, pipeline


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


def load_emotion_model():
    model_id = "firdhokk/speech-emotion-recognition-with-openai-whisper-large-v3"
    model = AutoModelForAudioClassification.from_pretrained(model_id)
    feature_extractor = AutoFeatureExtractor.from_pretrained(model_id, do_normalize=True)
    return model, feature_extractor


def load_text_model():
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
        self.text_model = load_text_model()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.emotion_model, self.feature_extractor = load_emotion_model()
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
        emotion_results = self.text_model(text)[0]
        return {
            "score": sentiment.document_sentiment.score,
            "emotions": {emotion["label"]: emotion["score"] for emotion in emotion_results},
        }

    async def analyze_image(self, image):
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
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}", "detail": "low"}},
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

    def preprocess_audio(self, audio_path, max_duration=30.0):
        audio_array, sampling_rate = librosa.load(audio_path, sr=self.feature_extractor.sampling_rate)

        max_length = int(self.feature_extractor.sampling_rate * max_duration)
        if len(audio_array) > max_length:
            audio_array = audio_array[:max_length]
        else:
            audio_array = np.pad(audio_array, (0, max_length - len(audio_array)))
        inputs = self.feature_extractor(
            audio_array,
            sampling_rate=self.feature_extractor.sampling_rate,
            max_length=max_length,
            truncation=True,
            return_tensors="pt",
        )
        return {key: value.to(self.device) for key, value in inputs.items()}

    def analyze_audio(self, audio_path):
        inputs = self.preprocess_audio(audio_path)

        with torch.no_grad():
            outputs = self.emotion_model(**inputs)
        logits = outputs.logits
        predicted_id = torch.argmax(logits, dim=-1).item()
        predicted_emotion = self.emotion_model.config.id2label[predicted_id]

        probabilities = torch.softmax(logits, dim=-1)[0]
        emotion_scores = {self.emotion_model.config.id2label[i]: prob.item() for i, prob in enumerate(probabilities)}

        return {"predicted_emotion": predicted_emotion, "emotion_scores": emotion_scores}
