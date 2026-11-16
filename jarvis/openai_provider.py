"""ChatGPT (OpenAI) als tweede brein van Jarvis."""

from __future__ import annotations

from collections.abc import Iterator

from openai import OpenAI


class OpenAIProvider:
    label = "ChatGPT"

    def __init__(self, model: str = "gpt-5"):
        self.client = OpenAI()
        self.model = model

    def stream(self, system_stable: str, system_context: str,
               history: list[dict]) -> Iterator[str]:
        messages = [{"role": "system", "content": f"{system_stable}\n\n{system_context}"}, *history]
        for chunk in self.client.chat.completions.create(
            model=self.model, messages=messages, stream=True
        ):
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def complete(self, system: str, prompt: str) -> str:
        return "".join(self.stream(system, "", [{"role": "user", "content": prompt}]))
