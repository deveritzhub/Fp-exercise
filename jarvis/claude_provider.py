"""Claude (Anthropic) als brein van Jarvis."""

from __future__ import annotations

from collections.abc import Iterator

import anthropic


class ClaudeProvider:
    label = "Claude"

    def __init__(self, model: str = "claude-opus-5-5", effort: str = "medium"):
        self.client = anthropic.Anthropic()
        self.model = model
        self.effort = effort

    def stream(self, system_stable: str, system_context: str,
               history: list[dict]) -> Iterator[str]:
        """Streamt het antwoord als tekststukjes.

        Het vaste deel van de systeemprompt wordt gecachet; de wisselende context
        (notities, geheugen, datum) komt erna zodat de cache geldig blijft.
        """
        with self.client.beta.messages.stream(
            model=self.model,
            max_tokens=64000,
            system=[
                {"type": "text", "text": system_stable, "cache_control": {"type": "ephemeral"}},
                {"type": "text", "text": system_context},
            ],
            messages=history,
            thinking={"type": "adaptive"},
            output_config={"effort": self.effort},
            # Als een verzoek geweigerd wordt, probeert de API automatisch een ander model.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        ) as stream:
            yield from stream.text_stream
            final = stream.get_final_message()
        if final.stop_reason == "refusal":
            yield "\n\n_(Claude heeft dit verzoek geweigerd.)_"
        elif final.stop_reason == "max_tokens":
            yield "\n\n_(Antwoord afgekapt: maximale lengte bereikt.)_"

    def complete(self, system: str, prompt: str) -> str:
        """Eenmalige vraag zonder streaming-UI (voor samenvattingen en sorteren)."""
        return "".join(self.stream(system, "", [{"role": "user", "content": prompt}]))
