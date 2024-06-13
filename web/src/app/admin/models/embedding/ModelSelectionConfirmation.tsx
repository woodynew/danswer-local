import { Modal } from "@/components/Modal";
import { Button, Text, Callout } from "@tremor/react";
import { EmbeddingModelDescriptor } from "./embeddingModels";

export function ModelSelectionConfirmaion({
  selectedModel,
  isCustom,
  onConfirm,
}: {
  selectedModel: EmbeddingModelDescriptor;
  isCustom: boolean;
  onConfirm: () => void;
}) {
  return (
    <div className="mb-4">
      <Text className="text-lg mb-4">
        You have selected: <b>{selectedModel.model_name}</b>. Are you sure you
        want to update to this new embedding model?
      </Text>
      <Text className="text-lg mb-2">
        We will re-index all your documents in the background so you will be
        able to continue to use Danswer as normal with the old model in the
        meantime. Depending on how many documents you have indexed, this may
        take a while.
      </Text>
      <Text className="text-lg mb-2">
        <i>NOTE:</i> this re-indexing process will consume more resources than
        normal. If you are self-hosting, we recommend that you allocate at least
        16GB of RAM to Danswer during this process.
      </Text>

      {isCustom && (
        <Callout title="IMPORTANT" color="yellow" className="mt-4">
          We&apos;ve detected that this is a custom-specified embedding model.
          Since we have to download the model files before verifying the
          configuration&apos;s correctness, we won&apos;t be able to let you
          know if the configuration is valid until <b>after</b> we start
          re-indexing your documents. If there is an issue, it will show up on
          this page as an indexing error on this page after clicking Confirm.
        </Callout>
      )}

      <div className="flex mt-8">
        <Button className="mx-auto" color="green" onClick={onConfirm}>
          Confirm
        </Button>
      </div>
    </div>
  );
}

export function ModelSelectionConfirmaionModal({
  selectedModel,
  isCustom,
  onConfirm,
  onCancel,
}: {
  selectedModel: EmbeddingModelDescriptor;
  isCustom: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title="Update Embedding Model" onOutsideClick={onCancel}>
      <div>
        <ModelSelectionConfirmaion
          selectedModel={selectedModel}
          isCustom={isCustom}
          onConfirm={onConfirm}
        />
      </div>
    </Modal>
  );
}
