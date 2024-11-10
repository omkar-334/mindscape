from google.cloud import language_v1, speech
from google.oauth2 import service_account
from transformers import pipeline


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
        return_all_scores=True,
    )
    return model


class Analyzer:
    def __init__(self):
        self.client = load_language_client()
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
