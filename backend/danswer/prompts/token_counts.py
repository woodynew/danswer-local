from danswer.llm.utils import check_number_of_tokens
from danswer.prompts.chat_prompts import ADDITIONAL_INFO
from danswer.prompts.chat_prompts import CHAT_USER_PROMPT
from danswer.prompts.chat_prompts import CITATION_REMINDER
from danswer.prompts.chat_prompts import REQUIRE_CITATION_STATEMENT
from danswer.prompts.constants import DEFAULT_IGNORE_STATEMENT
from danswer.prompts.direct_qa_prompts import LANGUAGE_HINT
from danswer.prompts.prompt_utils import get_current_llm_day_time

# tokens outside of the actual persona's "user_prompt" that make up the end
# user message
CHAT_USER_PROMPT_WITH_CONTEXT_OVERHEAD_TOKEN_CNT = check_number_of_tokens(
    CHAT_USER_PROMPT.format(
        context_docs_str="",
        task_prompt="",
        user_query="",
        optional_ignore_statement=DEFAULT_IGNORE_STATEMENT,
    )
)

CITATION_STATEMENT_TOKEN_CNT = check_number_of_tokens(REQUIRE_CITATION_STATEMENT)

CITATION_REMINDER_TOKEN_CNT = check_number_of_tokens(CITATION_REMINDER)

LANGUAGE_HINT_TOKEN_CNT = check_number_of_tokens(LANGUAGE_HINT)

# If the date/time is inserted directly as a replacement in the prompt, this is a slight over count
ADDITIONAL_INFO_TOKEN_CNT = check_number_of_tokens(
    ADDITIONAL_INFO.format(datetime_info=get_current_llm_day_time())
)
