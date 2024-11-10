import os

from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()


async def llm(system_prompt: str, user_prompt: str) -> str:
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_KEY"))

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    chat_completion = await client.chat.completions.create(
        messages=messages,
        stop=None,
        model="gpt-4o-mini",
        temperature=0.9,
        stream=False,
    )
    response = chat_completion.choices[0].message.content
    return response


async def openai_moderate(text: str) -> str:
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_KEY"))
    response = await client.moderations.create(
        model="omni-moderation-latest",
        input=text,
    )
    response = response.to_dict()
    response = response["results"][0]["flagged"]
    # response.pop("category_applied_input_types")
    return response
