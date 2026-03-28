import os
from dotenv import load_dotenv
from anthropic import Anthropic

load_dotenv()

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
model = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5")

response = client.messages.create(
    model=model,
    max_tokens=100,
    messages=[{"role": "user", "content": "Say hello in one sentence"}],
)

print(response.content[0].text)