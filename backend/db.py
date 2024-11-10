import firebase_admin
from firebase_admin import credentials, firestore


def load_db_client():
    cred = credentials.Certificate("firebase.json")
    firebase_admin.initialize_app(cred)
    client = firestore.client()
    return client


class DBclient:
    def __init__(self):
        self.client = load_db_client()

    def get_post(self, room_id, reply_id):
        """
        {'content': 'hi', 'authorName': 'Mohammed Imaduddin', 'uid': 'AKr3t8BEhwW2OhgzzBn1dbMscLa2', 'createdAt': DatetimeWithNanoseconds(2024, 11, 10, 2, 27, 22, 207000, tzinfo=datetime.timezone.utc), 'authorPhotoURL': 'https://lh3.googleusercontent.com/a/ACg8ocKe8x4GPoMleD4HpyLlbenaGbbfhur8VDsh8B45Nfc7H08_G98=s96-c'}
        """
        forum = self.client.collection("forum")
        room = forum.document(room_id)
        messages = room.collection("messages")
        message = messages.document(reply_id)
        return message.get().to_dict()

    def get_note(self, user_id, note_id):
        """
        {'content': 'hello world', 'createdAt': DatetimeWithNanoseconds(2024, 11, 10, 2, 39, 48, 763000, tzinfo=datetime.timezone.utc), 'userId': 'UxJBl8VCx2W08uu0VZJAlatkkvm2'}
        """
        users = self.client.collection("users")
        user = users.document(user_id)
        journal = user.collection("journal")
        note = journal.document(note_id)
        return note.get().to_dict()

    def add_sentiment(self, user_id, sentiment_dict):
        users = self.client.collection("users")
        user = users.document(user_id)
        sentiments = user.collection("sentiments")
        sentiments.add(sentiment_dict)
        return sentiment_dict

    def get_chat_history(self, user_id: str):
        users = self.client.collection("users")
        user = users.document(user_id).get().to_dict()
        messages = user.get("messages", [])
        return self.format_messages(messages)

    def format_messages(self, messages):
        formatted = []
        for message in messages:
            sender = message["sender"].strip()
            if sender == "bot":
                sender = "Therapist"
            else:
                sender = "Patient"
            content = message["content"].strip().strip("\"'")

            formatted_message = f"{sender}: {content}"
            formatted.append(formatted_message)
        return "\n".join(formatted)
