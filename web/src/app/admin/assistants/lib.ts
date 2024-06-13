import { Persona, Prompt, StarterMessage } from "./interfaces";

interface PersonaCreationRequest {
  name: string;
  description: string;
  system_prompt: string;
  task_prompt: string;
  document_set_ids: number[];
  num_chunks: number | null;
  include_citations: boolean;
  is_public: boolean;
  llm_relevance_filter: boolean | null;
  llm_model_provider_override: string | null;
  llm_model_version_override: string | null;
  starter_messages: StarterMessage[] | null;
  users?: string[];
  groups: number[];
  tool_ids: number[]; // Added tool_ids to the interface
}

interface PersonaUpdateRequest {
  id: number;
  existingPromptId: number | undefined;
  name: string;
  description: string;
  system_prompt: string;
  task_prompt: string;
  document_set_ids: number[];
  num_chunks: number | null;
  include_citations: boolean;
  is_public: boolean;
  llm_relevance_filter: boolean | null;
  llm_model_provider_override: string | null;
  llm_model_version_override: string | null;
  starter_messages: StarterMessage[] | null;
  users?: string[];
  groups: number[];
  tool_ids: number[]; // Added tool_ids to the interface
}

function promptNameFromPersonaName(personaName: string) {
  return `default-prompt__${personaName}`;
}

function createPrompt({
  personaName,
  systemPrompt,
  taskPrompt,
  includeCitations,
}: {
  personaName: string;
  systemPrompt: string;
  taskPrompt: string;
  includeCitations: boolean;
}) {
  return fetch("/api/prompt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: promptNameFromPersonaName(personaName),
      description: `Default prompt for persona ${personaName}`,
      system_prompt: systemPrompt,
      task_prompt: taskPrompt,
      include_citations: includeCitations,
    }),
  });
}

function updatePrompt({
  promptId,
  personaName,
  systemPrompt,
  taskPrompt,
  includeCitations,
}: {
  promptId: number;
  personaName: string;
  systemPrompt: string;
  taskPrompt: string;
  includeCitations: boolean;
}) {
  return fetch(`/api/prompt/${promptId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: promptNameFromPersonaName(personaName),
      description: `Default prompt for persona ${personaName}`,
      system_prompt: systemPrompt,
      task_prompt: taskPrompt,
      include_citations: includeCitations,
    }),
  });
}

function buildPersonaAPIBody(
  creationRequest: PersonaCreationRequest | PersonaUpdateRequest,
  promptId: number
) {
  const {
    name,
    description,
    document_set_ids,
    num_chunks,
    llm_relevance_filter,
    is_public,
    groups,
    users,
    tool_ids, // Added tool_ids to the destructuring
  } = creationRequest;

  return {
    name,
    description,
    num_chunks,
    llm_relevance_filter,
    llm_filter_extraction: false,
    is_public,
    recency_bias: "base_decay",
    prompt_ids: [promptId],
    document_set_ids,
    llm_model_provider_override: creationRequest.llm_model_provider_override,
    llm_model_version_override: creationRequest.llm_model_version_override,
    starter_messages: creationRequest.starter_messages,
    users,
    groups,
    tool_ids, // Added tool_ids to the return object
  };
}

export async function createPersona(
  personaCreationRequest: PersonaCreationRequest
): Promise<[Response, Response | null]> {
  // first create prompt
  const createPromptResponse = await createPrompt({
    personaName: personaCreationRequest.name,
    systemPrompt: personaCreationRequest.system_prompt,
    taskPrompt: personaCreationRequest.task_prompt,
    includeCitations: personaCreationRequest.include_citations,
  });
  const promptId = createPromptResponse.ok
    ? (await createPromptResponse.json()).id
    : null;

  const createPersonaResponse =
    promptId !== null
      ? await fetch("/api/persona", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            buildPersonaAPIBody(personaCreationRequest, promptId)
          ),
        })
      : null;

  return [createPromptResponse, createPersonaResponse];
}

export async function updatePersona(
  personaUpdateRequest: PersonaUpdateRequest
): Promise<[Response, Response | null]> {
  const { id, existingPromptId } = personaUpdateRequest;

  // first update prompt
  let promptResponse;
  let promptId;
  if (existingPromptId !== undefined) {
    promptResponse = await updatePrompt({
      promptId: existingPromptId,
      personaName: personaUpdateRequest.name,
      systemPrompt: personaUpdateRequest.system_prompt,
      taskPrompt: personaUpdateRequest.task_prompt,
      includeCitations: personaUpdateRequest.include_citations,
    });
    promptId = existingPromptId;
  } else {
    promptResponse = await createPrompt({
      personaName: personaUpdateRequest.name,
      systemPrompt: personaUpdateRequest.system_prompt,
      taskPrompt: personaUpdateRequest.task_prompt,
      includeCitations: personaUpdateRequest.include_citations,
    });
    promptId = promptResponse.ok ? (await promptResponse.json()).id : null;
  }

  const updatePersonaResponse =
    promptResponse.ok && promptId
      ? await fetch(`/api/persona/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            buildPersonaAPIBody(personaUpdateRequest, promptId)
          ),
        })
      : null;

  return [promptResponse, updatePersonaResponse];
}

export function deletePersona(personaId: number) {
  return fetch(`/api/persona/${personaId}`, {
    method: "DELETE",
  });
}

export function buildFinalPrompt(
  systemPrompt: string,
  taskPrompt: string,
  retrievalDisabled: boolean
) {
  let queryString = Object.entries({
    system_prompt: systemPrompt,
    task_prompt: taskPrompt,
    retrieval_disabled: retrievalDisabled,
  })
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&");

  return fetch(`/api/persona/utils/prompt-explorer?${queryString}`);
}

function smallerNumberFirstComparator(a: number, b: number) {
  return a > b ? 1 : -1;
}

function closerToZeroNegativesFirstComparator(a: number, b: number) {
  if (a < 0 && b > 0) {
    return -1;
  }
  if (a > 0 && b < 0) {
    return 1;
  }

  const absA = Math.abs(a);
  const absB = Math.abs(b);

  if (absA === absB) {
    return a > b ? 1 : -1;
  }

  return absA > absB ? 1 : -1;
}

export function personaComparator(a: Persona, b: Persona) {
  if (a.display_priority === null && b.display_priority === null) {
    return closerToZeroNegativesFirstComparator(a.id, b.id);
  }

  if (a.display_priority !== b.display_priority) {
    if (a.display_priority === null) {
      return 1;
    }
    if (b.display_priority === null) {
      return -1;
    }

    return smallerNumberFirstComparator(a.display_priority, b.display_priority);
  }

  return closerToZeroNegativesFirstComparator(a.id, b.id);
}
