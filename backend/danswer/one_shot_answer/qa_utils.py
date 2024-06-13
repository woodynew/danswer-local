from collections.abc import Callable
from collections.abc import Generator

from danswer.configs.constants import MessageType
from danswer.llm.utils import get_default_llm_token_encode
from danswer.one_shot_answer.models import ThreadMessage
from danswer.utils.logger import setup_logger

logger = setup_logger()


def simulate_streaming_response(model_out: str) -> Generator[str, None, None]:
    """Mock streaming by generating the passed in model output, character by character"""
    for token in model_out:
        yield token


def combine_message_thread(
    messages: list[ThreadMessage],
    max_tokens: int | None,
    llm_tokenizer: Callable | None = None,
) -> str:
    """Used to create a single combined message context from threads"""
    if not messages:
        return ""

    message_strs: list[str] = []
    total_token_count = 0
    if llm_tokenizer is None:
        llm_tokenizer = get_default_llm_token_encode()

    for message in reversed(messages):
        if message.role == MessageType.USER:
            role_str = message.role.value.upper()
            if message.sender:
                role_str += " " + message.sender
            else:
                # Since other messages might have the user identifying information
                # better to use Unknown for symmetry
                role_str += " Unknown"
        else:
            role_str = message.role.value.upper()

        msg_str = f"{role_str}:\n{message.message}"
        message_token_count = len(llm_tokenizer(msg_str))

        if (
            max_tokens is not None
            and total_token_count + message_token_count > max_tokens
        ):
            break

        message_strs.insert(0, msg_str)
        total_token_count += message_token_count

    return "\n\n".join(message_strs)
