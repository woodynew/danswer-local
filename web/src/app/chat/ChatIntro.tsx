import { getSourceMetadataForSources, listSourceMetadata } from "@/lib/sources";
import { ValidSources } from "@/lib/types";
import Image from "next/image";
import { Persona } from "../admin/assistants/interfaces";
import { Divider } from "@tremor/react";
import { FiBookmark, FiCpu, FiInfo, FiX, FiZoomIn } from "react-icons/fi";
import { HoverPopup } from "@/components/HoverPopup";
import { Modal } from "@/components/Modal";
import { useState } from "react";
import { FaRobot } from "react-icons/fa";
import { SourceMetadata } from "@/lib/search/interfaces";

const MAX_PERSONAS_TO_DISPLAY = 4;

function HelperItemDisplay({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="cursor-pointer hover:bg-hover-light border border-border rounded py-2 px-4">
      <div className="text-emphasis font-bold text-lg flex">{title}</div>
      <div className="text-sm">{description}</div>
    </div>
  );
}

export function ChatIntro({
  availableSources,
  availablePersonas,
  selectedPersona,
}: {
  availableSources: ValidSources[];
  availablePersonas: Persona[];
  selectedPersona: Persona;
}) {
  const availableSourceMetadata = getSourceMetadataForSources(availableSources);

  return (
    <>
      <div className="flex justify-center items-center h-full">
        <div className="w-message-xs 2xl:w-message-sm 3xl:w-message">
          <div className="flex">
            <div className="mx-auto">
              <div className="m-auto h-[80px] w-[80px]">
                <Image src="/logo.png" alt="Logo" width="1419" height="1520" />
              </div>
              <div className="m-auto text-3xl font-bold text-strong mt-4 w-fit">
                {selectedPersona?.name || "How can I help you today?"}
              </div>
              {selectedPersona && (
                <div className="mt-1">{selectedPersona.description}</div>
              )}
            </div>
          </div>

          {selectedPersona && selectedPersona.num_chunks !== 0 && (
            <>
              <Divider />
              <div>
                {selectedPersona.document_sets.length > 0 && (
                  <div className="mt-2">
                    <p className="font-bold mb-1 mt-4 text-emphasis">
                      Knowledge Sets:{" "}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedPersona.document_sets.map((documentSet) => (
                        <div key={documentSet.id} className="w-fit">
                          <HoverPopup
                            mainContent={
                              <span className="flex w-fit p-1 rounded border border-border text-xs font-medium cursor-default">
                                <div className="mr-1 my-auto">
                                  <FiBookmark />
                                </div>
                                {documentSet.name}
                              </span>
                            }
                            popupContent={
                              <div className="flex py-1 w-96">
                                <FiInfo className="my-auto mr-2" />
                                <div className="text-sm">
                                  {documentSet.description}
                                </div>
                              </div>
                            }
                            direction="top"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {availableSources.length > 0 && (
                  <div className="mt-2">
                    <p className="font-bold mb-1 mt-4 text-emphasis">
                      Connected Sources:{" "}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {availableSourceMetadata.map((sourceMetadata) => (
                        <span
                          key={sourceMetadata.internalName}
                          className="flex w-fit p-1 rounded border border-border text-xs font-medium cursor-default"
                        >
                          <div className="mr-1 my-auto">
                            {sourceMetadata.icon({})}
                          </div>
                          <div className="my-auto">
                            {sourceMetadata.displayName}
                          </div>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
