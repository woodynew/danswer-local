"use client";

import { useState } from "react";
import { MinimalUserSnapshot, User } from "@/lib/types";
import { Persona } from "@/app/admin/assistants/interfaces";
import { Divider, Text } from "@tremor/react";
import {
  FiArrowDown,
  FiArrowUp,
  FiEdit2,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiX,
  FiShare2,
} from "react-icons/fi";
import Link from "next/link";
import { orderAssistantsForUser } from "@/lib/assistants/orderAssistants";
import {
  addAssistantToList,
  moveAssistantDown,
  moveAssistantUp,
  removeAssistantFromList,
} from "@/lib/assistants/updateAssistantPreferences";
import { AssistantIcon } from "@/components/assistants/AssistantIcon";
import { DefaultPopover } from "@/components/popover/DefaultPopover";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import { useRouter } from "next/navigation";
import { NavigationButton } from "../NavigationButton";
import { AssistantsPageTitle } from "../AssistantsPageTitle";
import { checkUserOwnsAssistant } from "@/lib/assistants/checkOwnership";
import { AssistantSharingModal } from "./AssistantSharingModal";
import { AssistantSharedStatusDisplay } from "../AssistantSharedStatus";
import useSWR from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ToolsDisplay } from "../ToolsDisplay";

function AssistantListItem({
  assistant,
  user,
  allAssistantIds,
  allUsers,
  isFirst,
  isLast,
  isVisible,
  setPopup,
}: {
  assistant: Persona;
  user: User | null;
  allUsers: MinimalUserSnapshot[];
  allAssistantIds: number[];
  isFirst: boolean;
  isLast: boolean;
  isVisible: boolean;
  setPopup: (popupSpec: PopupSpec | null) => void;
}) {
  const router = useRouter();
  const [showSharingModal, setShowSharingModal] = useState(false);

  const currentChosenAssistants = user?.preferences?.chosen_assistants;
  const isOwnedByUser = checkUserOwnsAssistant(user, assistant);

  return (
    <>
      <AssistantSharingModal
        assistant={assistant}
        user={user}
        allUsers={allUsers}
        onClose={() => {
          setShowSharingModal(false);
          router.refresh();
        }}
        show={showSharingModal}
      />
      <div
        className="
          bg-background-emphasis
          rounded-lg
          shadow-md
          p-4
          mb-4
          flex
          justify-between
          items-center
        "
      >
        <div className="w-3/4">
          <div className="flex items-center">
            <AssistantIcon assistant={assistant} />
            <h2 className="text-xl font-semibold mb-2 my-auto ml-2">
              {assistant.name}
            </h2>
          </div>
          {assistant.tools.length > 0 && (
            <ToolsDisplay tools={assistant.tools} />
          )}
          <div className="text-sm mt-2">{assistant.description}</div>
          <div className="mt-2">
            <AssistantSharedStatusDisplay assistant={assistant} user={user} />
          </div>
        </div>
        {isOwnedByUser && (
          <div className="ml-auto flex items-center">
            {!assistant.is_public && (
              <div
                className="mr-4 rounded p-2 cursor-pointer hover:bg-hover"
                onClick={() => setShowSharingModal(true)}
              >
                <FiShare2 size={16} />
              </div>
            )}
            <Link
              href={`/assistants/edit/${assistant.id}`}
              className="mr-4 rounded p-2 cursor-pointer hover:bg-hover"
            >
              <FiEdit2 size={16} />
            </Link>
          </div>
        )}
        <DefaultPopover
          content={
            <div className="hover:bg-hover rounded p-2 cursor-pointer">
              <FiMoreHorizontal size={16} />
            </div>
          }
          side="bottom"
          align="start"
          sideOffset={5}
        >
          {[
            ...(!isFirst
              ? [
                  <div
                    key="move-up"
                    className="flex items-center gap-x-2"
                    onClick={async () => {
                      const success = await moveAssistantUp(
                        assistant.id,
                        currentChosenAssistants || allAssistantIds
                      );
                      if (success) {
                        setPopup({
                          message: `"${assistant.name}" has been moved up.`,
                          type: "success",
                        });
                        router.refresh();
                      } else {
                        setPopup({
                          message: `"${assistant.name}" could not be moved up.`,
                          type: "error",
                        });
                      }
                    }}
                  >
                    <FiArrowUp /> Move Up
                  </div>,
                ]
              : []),
            ...(!isLast
              ? [
                  <div
                    key="move-down"
                    className="flex items-center gap-x-2"
                    onClick={async () => {
                      const success = await moveAssistantDown(
                        assistant.id,
                        currentChosenAssistants || allAssistantIds
                      );
                      if (success) {
                        setPopup({
                          message: `"${assistant.name}" has been moved down.`,
                          type: "success",
                        });
                        router.refresh();
                      } else {
                        setPopup({
                          message: `"${assistant.name}" could not be moved down.`,
                          type: "error",
                        });
                      }
                    }}
                  >
                    <FiArrowDown /> Move Down
                  </div>,
                ]
              : []),
            isVisible ? (
              <div
                key="remove"
                className="flex items-center gap-x-2"
                onClick={async () => {
                  if (
                    currentChosenAssistants &&
                    currentChosenAssistants.length === 1
                  ) {
                    setPopup({
                      message: `Cannot remove "${assistant.name}" - you must have at least one assistant.`,
                      type: "error",
                    });
                    return;
                  }

                  const success = await removeAssistantFromList(
                    assistant.id,
                    currentChosenAssistants || allAssistantIds
                  );
                  if (success) {
                    setPopup({
                      message: `"${assistant.name}" has been removed from your list.`,
                      type: "success",
                    });
                    router.refresh();
                  } else {
                    setPopup({
                      message: `"${assistant.name}" could not be removed from your list.`,
                      type: "error",
                    });
                  }
                }}
              >
                <FiX /> {isOwnedByUser ? "Hide" : "Remove"}
              </div>
            ) : (
              <div
                key="add"
                className="flex items-center gap-x-2"
                onClick={async () => {
                  const success = await addAssistantToList(
                    assistant.id,
                    currentChosenAssistants || allAssistantIds
                  );
                  if (success) {
                    setPopup({
                      message: `"${assistant.name}" has been added to your list.`,
                      type: "success",
                    });
                    router.refresh();
                  } else {
                    setPopup({
                      message: `"${assistant.name}" could not be added to your list.`,
                      type: "error",
                    });
                  }
                }}
              >
                <FiPlus /> Add
              </div>
            ),
          ]}
        </DefaultPopover>
      </div>
    </>
  );
}

interface AssistantsListProps {
  user: User | null;
  assistants: Persona[];
}

export function AssistantsList({ user, assistants }: AssistantsListProps) {
  const filteredAssistants = orderAssistantsForUser(assistants, user);
  const ownedButHiddenAssistants = assistants.filter(
    (assistant) =>
      checkUserOwnsAssistant(user, assistant) &&
      user?.preferences?.chosen_assistants &&
      !user?.preferences?.chosen_assistants?.includes(assistant.id)
  );
  const allAssistantIds = assistants.map((assistant) => assistant.id);

  const { popup, setPopup } = usePopup();

  const { data: users } = useSWR<MinimalUserSnapshot[]>(
    "/api/users",
    errorHandlingFetcher
  );

  return (
    <>
      {popup}
      <div className="mx-auto w-searchbar-xs 2xl:w-searchbar-sm 3xl:w-searchbar">
        <AssistantsPageTitle>My Assistants</AssistantsPageTitle>

        <div className="grid grid-cols-2 gap-4 mt-3">
          <Link href="/assistants/new">
            <NavigationButton>
              <div className="flex justify-center">
                <FiPlus className="mr-2 my-auto" size={20} />
                Create New Assistant
              </div>
            </NavigationButton>
          </Link>

          <Link href="/assistants/gallery">
            <NavigationButton>
              <div className="flex justify-center">
                <FiSearch className="mr-2 my-auto" size={20} />
                View Public and Shared Assistants
              </div>
            </NavigationButton>
          </Link>
        </div>

        <p className="mt-6 text-center text-base">
          Assistants allow you to customize your experience for a specific
          purpose. Specifically, they combine instructions, extra knowledge, and
          any combination of tools.
        </p>

        <Divider />

        <h3 className="text-xl font-bold mb-4">Active Assistants</h3>

        <Text>
          The order the assistants appear below will be the order they appear in
          the Assistants dropdown. The first assistant listed will be your
          default assistant when you start a new chat.
        </Text>

        <div className="w-full p-4 mt-3">
          {filteredAssistants.map((assistant, index) => (
            <AssistantListItem
              key={assistant.id}
              assistant={assistant}
              user={user}
              allAssistantIds={allAssistantIds}
              allUsers={users || []}
              isFirst={index === 0}
              isLast={index === filteredAssistants.length - 1}
              isVisible
              setPopup={setPopup}
            />
          ))}
        </div>

        {ownedButHiddenAssistants.length > 0 && (
          <>
            <Divider />

            <h3 className="text-xl font-bold mb-4">Your Hidden Assistants</h3>

            <Text>
              Assistants you&apos;ve created that aren&apos;t currently visible
              in the Assistants selector.
            </Text>

            <div className="w-full p-4">
              {ownedButHiddenAssistants.map((assistant, index) => (
                <AssistantListItem
                  key={assistant.id}
                  assistant={assistant}
                  user={user}
                  allAssistantIds={allAssistantIds}
                  allUsers={users || []}
                  isFirst={index === 0}
                  isLast={index === filteredAssistants.length - 1}
                  isVisible={false}
                  setPopup={setPopup}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
