"use client";

import React, { useState, useEffect } from "react";
import { Folder } from "./interfaces";
import { ChatSessionDisplay } from "../sessionSidebar/ChatSessionDisplay"; // Ensure this is correctly imported
import {
  FiChevronDown,
  FiChevronRight,
  FiFolder,
  FiEdit,
  FiCheck,
  FiX,
  FiTrash, // Import the trash icon
} from "react-icons/fi";
import { BasicSelectable } from "@/components/BasicClickable";
import {
  addChatToFolder,
  deleteFolder,
  updateFolderName,
} from "./FolderManagement";
import { usePopup } from "@/components/admin/connectors/Popup";
import { useRouter } from "next/navigation";
import { CHAT_SESSION_ID_KEY } from "@/lib/drag/constants";
import Cookies from "js-cookie";

const FolderItem = ({
  folder,
  currentChatId,
  isInitiallyExpanded,
}: {
  folder: Folder;
  currentChatId?: number;
  isInitiallyExpanded: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(isInitiallyExpanded);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedFolderName, setEditedFolderName] = useState<string>(
    folder.folder_name
  );
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const { setPopup } = usePopup();
  const router = useRouter();

  const toggleFolderExpansion = () => {
    if (!isEditing) {
      const newIsExpanded = !isExpanded;
      setIsExpanded(newIsExpanded);
      // Update the cookie with the new state
      const openedFoldersCookieVal = Cookies.get("openedFolders");
      const openedFolders = openedFoldersCookieVal
        ? JSON.parse(openedFoldersCookieVal)
        : {};
      if (newIsExpanded) {
        openedFolders[folder.folder_id] = true;
      } else {
        delete openedFolders[folder.folder_id];
      }
      Cookies.set("openedFolders", JSON.stringify(openedFolders));
    }
  };

  const handleEditFolderName = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation(); // Prevent the event from bubbling up to the toggle expansion
    setIsEditing(true);
  };

  const handleFolderNameChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setEditedFolderName(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      saveFolderName();
    }
  };

  const saveFolderName = async () => {
    try {
      await updateFolderName(folder.folder_id, editedFolderName);
      setIsEditing(false);
      router.refresh(); // Refresh values to update the sidebar
    } catch (error) {
      setPopup({ message: "Failed to save folder name", type: "error" });
    }
  };

  const deleteFolderHandler = async (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.stopPropagation(); // Prevent the event from bubbling up to the toggle expansion
    try {
      await deleteFolder(folder.folder_id);
      router.refresh(); // Refresh values to update the sidebar
    } catch (error) {
      setPopup({ message: "Failed to delete folder", type: "error" });
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const chatSessionId = parseInt(
      event.dataTransfer.getData(CHAT_SESSION_ID_KEY),
      10
    );
    try {
      await addChatToFolder(folder.folder_id, chatSessionId);
      router.refresh(); // Refresh to show the updated folder contents
    } catch (error) {
      setPopup({
        message: "Failed to add chat session to folder",
        type: "error",
      });
    }
  };

  const folders = folder.chat_sessions.sort((a, b) => {
    return a.time_created.localeCompare(b.time_created);
  });

  return (
    <div
      key={folder.folder_id}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`transition duration-300 ease-in-out rounded-md ${
        isDragOver ? "bg-hover" : ""
      }`}
    >
      <BasicSelectable fullWidth selected={false}>
        <div
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div onClick={toggleFolderExpansion} className="cursor-pointer">
            <div className="text-sm text-medium flex items-center justify-start w-full">
              <div className="mr-2">
                {isExpanded ? (
                  <FiChevronDown size={16} />
                ) : (
                  <FiChevronRight size={16} />
                )}
              </div>
              <div>
                <FiFolder size={16} className="mr-2" />
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editedFolderName}
                  onChange={handleFolderNameChange}
                  onKeyDown={handleKeyDown}
                  className="text-sm px-1 flex-1 min-w-0 -my-px mr-2"
                />
              ) : (
                <div className="flex-1 min-w-0">
                  {editedFolderName || folder.folder_name}
                </div>
              )}
              {isHovering && !isEditing && (
                <div className="flex ml-auto my-auto">
                  <div
                    onClick={handleEditFolderName}
                    className="hover:bg-black/10 p-1 -m-1 rounded"
                  >
                    <FiEdit size={16} />
                  </div>
                  <div
                    onClick={deleteFolderHandler}
                    className="hover:bg-black/10 p-1 -m-1 rounded ml-2"
                  >
                    <FiTrash size={16} />
                  </div>
                </div>
              )}
              {isEditing && (
                <div className="flex ml-auto my-auto">
                  <div
                    onClick={saveFolderName}
                    className="hover:bg-black/10 p-1 -m-1 rounded"
                  >
                    <FiCheck size={16} />
                  </div>
                  <div
                    onClick={() => setIsEditing(false)}
                    className="hover:bg-black/10 p-1 -m-1 rounded ml-2"
                  >
                    <FiX size={16} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </BasicSelectable>
      {isExpanded && folders && (
        <div className={"ml-2 pl-2 border-l border-border"}>
          {folders.map((chatSession) => (
            <ChatSessionDisplay
              key={chatSession.id}
              chatSession={chatSession}
              isSelected={chatSession.id === currentChatId}
              skipGradient={isDragOver}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FolderList = ({
  folders,
  currentChatId,
  openedFolders,
}: {
  folders: Folder[];
  currentChatId?: number;
  openedFolders: { [key: number]: boolean };
}) => {
  if (folders.length === 0) {
    return null;
  }

  return (
    <div className="mt-1 mb-1 overflow-y-auto">
      {folders.map((folder) => (
        <FolderItem
          key={folder.folder_id}
          folder={folder}
          currentChatId={currentChatId}
          isInitiallyExpanded={openedFolders[folder.folder_id] || false}
        />
      ))}
    </div>
  );
};
