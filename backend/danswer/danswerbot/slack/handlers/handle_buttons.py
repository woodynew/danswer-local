from typing import Any
from typing import cast

from slack_sdk import WebClient
from slack_sdk.models.blocks import SectionBlock
from slack_sdk.models.views import View
from slack_sdk.socket_mode import SocketModeClient
from slack_sdk.socket_mode.request import SocketModeRequest
from sqlalchemy.orm import Session

from danswer.configs.constants import SearchFeedbackType
from danswer.configs.danswerbot_configs import DANSWER_FOLLOWUP_EMOJI
from danswer.connectors.slack.utils import make_slack_api_rate_limited
from danswer.danswerbot.slack.blocks import build_follow_up_resolved_blocks
from danswer.danswerbot.slack.blocks import get_document_feedback_blocks
from danswer.danswerbot.slack.config import get_slack_bot_config_for_channel
from danswer.danswerbot.slack.constants import DISLIKE_BLOCK_ACTION_ID
from danswer.danswerbot.slack.constants import FeedbackVisibility
from danswer.danswerbot.slack.constants import LIKE_BLOCK_ACTION_ID
from danswer.danswerbot.slack.constants import VIEW_DOC_FEEDBACK_ID
from danswer.danswerbot.slack.handlers.handle_message import (
    remove_scheduled_feedback_reminder,
)
from danswer.danswerbot.slack.utils import build_feedback_id
from danswer.danswerbot.slack.utils import decompose_action_id
from danswer.danswerbot.slack.utils import fetch_groupids_from_names
from danswer.danswerbot.slack.utils import fetch_userids_from_emails
from danswer.danswerbot.slack.utils import get_channel_name_from_id
from danswer.danswerbot.slack.utils import get_feedback_visibility
from danswer.danswerbot.slack.utils import respond_in_thread
from danswer.danswerbot.slack.utils import update_emote_react
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.feedback import create_chat_message_feedback
from danswer.db.feedback import create_doc_retrieval_feedback
from danswer.document_index.document_index_utils import get_both_index_names
from danswer.document_index.factory import get_default_document_index
from danswer.utils.logger import setup_logger

logger_base = setup_logger()


def handle_doc_feedback_button(
    req: SocketModeRequest,
    client: SocketModeClient,
) -> None:
    if not (actions := req.payload.get("actions")):
        logger_base.error("Missing actions. Unable to build the source feedback view")
        return

    # Extracts the feedback_id coming from the 'source feedback' button
    # and generates a new one for the View, to keep track of the doc info
    query_event_id, doc_id, doc_rank = decompose_action_id(actions[0].get("value"))
    external_id = build_feedback_id(query_event_id, doc_id, doc_rank)

    channel_id = req.payload["container"]["channel_id"]
    thread_ts = req.payload["container"]["thread_ts"]

    data = View(
        type="modal",
        callback_id=VIEW_DOC_FEEDBACK_ID,
        external_id=external_id,
        # We use the private metadata to keep track of the channel id and thread ts
        private_metadata=f"{channel_id}_{thread_ts}",
        title="Give Feedback",
        blocks=[get_document_feedback_blocks()],
        submit="send",
        close="cancel",
    )

    client.web_client.views_open(
        trigger_id=req.payload["trigger_id"], view=data.to_dict()
    )


def handle_slack_feedback(
    feedback_id: str,
    feedback_type: str,
    feedback_msg_reminder: str,
    client: WebClient,
    user_id_to_post_confirmation: str,
    channel_id_to_post_confirmation: str,
    thread_ts_to_post_confirmation: str,
) -> None:
    engine = get_sqlalchemy_engine()

    message_id, doc_id, doc_rank = decompose_action_id(feedback_id)

    with Session(engine) as db_session:
        if feedback_type in [LIKE_BLOCK_ACTION_ID, DISLIKE_BLOCK_ACTION_ID]:
            create_chat_message_feedback(
                is_positive=feedback_type == LIKE_BLOCK_ACTION_ID,
                feedback_text="",
                chat_message_id=message_id,
                user_id=None,  # no "user" for Slack bot for now
                db_session=db_session,
            )
            remove_scheduled_feedback_reminder(
                client=client,
                channel=user_id_to_post_confirmation,
                msg_id=feedback_msg_reminder,
            )
        elif feedback_type in [
            SearchFeedbackType.ENDORSE.value,
            SearchFeedbackType.REJECT.value,
            SearchFeedbackType.HIDE.value,
        ]:
            if doc_id is None or doc_rank is None:
                raise ValueError("Missing information for Document Feedback")

            if feedback_type == SearchFeedbackType.ENDORSE.value:
                feedback = SearchFeedbackType.ENDORSE
            elif feedback_type == SearchFeedbackType.REJECT.value:
                feedback = SearchFeedbackType.REJECT
            else:
                feedback = SearchFeedbackType.HIDE

            curr_ind_name, sec_ind_name = get_both_index_names(db_session)
            document_index = get_default_document_index(
                primary_index_name=curr_ind_name, secondary_index_name=sec_ind_name
            )

            create_doc_retrieval_feedback(
                message_id=message_id,
                document_id=doc_id,
                document_rank=doc_rank,
                document_index=document_index,
                db_session=db_session,
                clicked=False,  # Not tracking this for Slack
                feedback=feedback,
            )
        else:
            logger_base.error(f"Feedback type '{feedback_type}' not supported")

    if get_feedback_visibility() == FeedbackVisibility.PRIVATE or feedback_type not in [
        LIKE_BLOCK_ACTION_ID,
        DISLIKE_BLOCK_ACTION_ID,
    ]:
        client.chat_postEphemeral(
            channel=channel_id_to_post_confirmation,
            user=user_id_to_post_confirmation,
            thread_ts=thread_ts_to_post_confirmation,
            text="Thanks for your feedback!",
        )
    else:
        feedback_response_txt = (
            "liked" if feedback_type == LIKE_BLOCK_ACTION_ID else "disliked"
        )

        if get_feedback_visibility() == FeedbackVisibility.ANONYMOUS:
            msg = f"A user has {feedback_response_txt} the AI Answer"
        else:
            msg = f"<@{user_id_to_post_confirmation}> has {feedback_response_txt} the AI Answer"

        respond_in_thread(
            client=client,
            channel=channel_id_to_post_confirmation,
            text=msg,
            thread_ts=thread_ts_to_post_confirmation,
            unfurl=False,
        )


def handle_followup_button(
    req: SocketModeRequest,
    client: SocketModeClient,
) -> None:
    action_id = None
    if actions := req.payload.get("actions"):
        action = cast(dict[str, Any], actions[0])
        action_id = cast(str, action.get("block_id"))

    channel_id = req.payload["container"]["channel_id"]
    thread_ts = req.payload["container"]["thread_ts"]

    update_emote_react(
        emoji=DANSWER_FOLLOWUP_EMOJI,
        channel=channel_id,
        message_ts=thread_ts,
        remove=False,
        client=client.web_client,
    )

    tag_ids: list[str] = []
    group_ids: list[str] = []
    with Session(get_sqlalchemy_engine()) as db_session:
        channel_name, is_dm = get_channel_name_from_id(
            client=client.web_client, channel_id=channel_id
        )
        slack_bot_config = get_slack_bot_config_for_channel(
            channel_name=channel_name, db_session=db_session
        )
        if slack_bot_config:
            tag_names = slack_bot_config.channel_config.get("follow_up_tags")
            remaining = None
            if tag_names:
                tag_ids, remaining = fetch_userids_from_emails(
                    tag_names, client.web_client
                )
            if remaining:
                group_ids, _ = fetch_groupids_from_names(remaining, client.web_client)

    blocks = build_follow_up_resolved_blocks(tag_ids=tag_ids, group_ids=group_ids)

    respond_in_thread(
        client=client.web_client,
        channel=channel_id,
        text="Received your request for more help",
        blocks=blocks,
        thread_ts=thread_ts,
        unfurl=False,
    )

    if action_id is not None:
        message_id, _, _ = decompose_action_id(action_id)

        create_chat_message_feedback(
            is_positive=None,
            feedback_text="",
            chat_message_id=message_id,
            user_id=None,  # no "user" for Slack bot for now
            db_session=db_session,
            required_followup=True,
        )


def get_clicker_name(
    req: SocketModeRequest,
    client: SocketModeClient,
) -> str:
    clicker_name = req.payload.get("user", {}).get("name", "Someone")
    clicker_real_name = None
    try:
        clicker = client.web_client.users_info(user=req.payload["user"]["id"])
        clicker_real_name = (
            cast(dict, clicker.data).get("user", {}).get("profile", {}).get("real_name")
        )
    except Exception:
        # Likely a scope issue
        pass

    if clicker_real_name:
        clicker_name = clicker_real_name

    return clicker_name


def handle_followup_resolved_button(
    req: SocketModeRequest,
    client: SocketModeClient,
    immediate: bool = False,
) -> None:
    channel_id = req.payload["container"]["channel_id"]
    message_ts = req.payload["container"]["message_ts"]
    thread_ts = req.payload["container"]["thread_ts"]

    clicker_name = get_clicker_name(req, client)

    update_emote_react(
        emoji=DANSWER_FOLLOWUP_EMOJI,
        channel=channel_id,
        message_ts=thread_ts,
        remove=True,
        client=client.web_client,
    )

    # Delete the message with the option to mark resolved
    if not immediate:
        slack_call = make_slack_api_rate_limited(client.web_client.chat_delete)
        response = slack_call(
            channel=channel_id,
            ts=message_ts,
        )

        if not response.get("ok"):
            logger_base.error("Unable to delete message for resolved")

    if immediate:
        msg_text = f"{clicker_name} has marked this question as resolved!"
    else:
        msg_text = (
            f"{clicker_name} has marked this question as resolved! "
            f'\n\n You can always click the "I need more help button" to let the team '
            f"know that your problem still needs attention."
        )

    resolved_block = SectionBlock(text=msg_text)

    respond_in_thread(
        client=client.web_client,
        channel=channel_id,
        text="Your request for help as been addressed!",
        blocks=[resolved_block],
        thread_ts=thread_ts,
        unfurl=False,
    )
