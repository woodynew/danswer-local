import abc
from collections.abc import Generator
from typing import Any

from pydantic import BaseModel

from danswer.llm.answering.models import PreviousMessage
from danswer.llm.interfaces import LLM


class ToolResponse(BaseModel):
    id: str | None = None
    response: Any


class Tool(abc.ABC):
    @classmethod
    @abc.abstractmethod
    def name(self) -> str:
        raise NotImplementedError

    """For LLMs which support explicit tool calling"""

    @classmethod
    @abc.abstractmethod
    def tool_definition(self) -> dict:
        raise NotImplementedError

    @abc.abstractmethod
    def build_tool_message_content(
        self, *args: ToolResponse
    ) -> str | list[str | dict[str, Any]]:
        raise NotImplementedError

    """For LLMs which do NOT support explicit tool calling"""

    @abc.abstractmethod
    def get_args_for_non_tool_calling_llm(
        self,
        query: str,
        history: list[PreviousMessage],
        llm: LLM,
        force_run: bool = False,
    ) -> dict[str, Any] | None:
        raise NotImplementedError

    """Actual execution of the tool"""

    @abc.abstractmethod
    def run(self, **kwargs: Any) -> Generator[ToolResponse, None, None]:
        raise NotImplementedError
