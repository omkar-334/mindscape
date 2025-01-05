from google.cloud import language_v1, texttospeech
from google.oauth2 import service_account
from transformers import (
    pipeline,
    AutoModelForAudioClassification,
    AutoFeatureExtractor
)
import librosa
import torch
import numpy as np

def load_language_client():
    credentials = service_account.Credentials.from_service_account_file(
        "creds.json",
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )
    client = language_v1.LanguageServiceClient(credentials=credentials)
    return client


def load_tts_client():
    credentials = service_account.Credentials.from_service_account_file(
        "creds.json",
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )
    client = texttospeech.TextToSpeechClient(credentials=credentials)
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


class TextToSpeech:
    def __init__(self):
        self.client = load_tts_client()
        
    def synthesize(self, text, language_code='en-US', voice_name='en-US-Neural2-F'):
        synthesis_input = texttospeech.SynthesisInput(text=text)
        
        voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            name=voice_name
        )
        
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=1.0,
            pitch=0
        )
        
        try:
            response = self.client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config
            )
            
            # Convert to base64 for easy transmission
            audio_base64 = base64.b64encode(response.audio_content).decode('utf-8')
            
            return {
                "audio": audio_base64,
                "format": "mp3",
                "success": True
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


def load_language_client():
    credentials = service_account.Credentials.from_service_account_file(
        "creds.json",
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )
    client = language_v1.LanguageServiceClient(credentials=credentials)
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


class Analyzer:
    def __init__(self):
        self.client = load_language_client()
        self.text_model = load_text_model()
        self.emotion_model, self.feature_extractor = load_emotion_model()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.emotion_model = self.emotion_model.to(self.device)
        
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
        
        # Convert logits to probabilities
        probabilities = torch.softmax(logits, dim=-1)[0]
        emotion_scores = {
            self.emotion_model.config.id2label[i]: prob.item()
            for i, prob in enumerate(probabilities)
        }
        
        return {
            "predicted_emotion": predicted_emotion,
            "emotion_scores": emotion_scores
        }

    def analyze_text(self, text: str) -> dict:
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
    
    def analyze(self, content, content_type="text"):
        if content_type == "audio":
            return self.analyze_audio(content)
        return self.analyze_text(content)