import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from "@tremor/react";
import { DraggableTableBody } from "./DraggableTableBody";
import React, { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DraggableRow } from "./DraggableRow";
import { Row } from "./interfaces";
import { StaticRow } from "./StaticRow";

export function DraggableTable({
  headers,
  rows,
  setRows,
}: {
  headers: (string | JSX.Element | null)[];
  rows: Row[];
  setRows: (newRows: UniqueIdentifier[]) => void | Promise<void>;
}) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>();
  const items = useMemo(() => rows?.map(({ id }) => id), [rows]);
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over !== null && active.id !== over.id) {
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      setRows(arrayMove(rows, oldIndex, newIndex).map((row) => row.id));
    }

    setActiveId(null);
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const selectedRow = useMemo(() => {
    if (activeId === null || activeId === undefined) {
      return null;
    }
    const row = rows.find(({ id }) => id === activeId);
    return row;
  }, [activeId, rows]);

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
    >
      <Table className="overflow-y-visible">
        <TableHead>
          <TableRow>
            <TableHeaderCell></TableHeaderCell>
            {headers.map((header, ind) => (
              <TableHeaderCell key={ind}>{header}</TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {rows.map((row) => {
              return <DraggableRow key={row.id} row={row} />;
            })}
          </SortableContext>

          <DragOverlay>
            {selectedRow && (
              <Table className="overflow-y-visible">
                <TableBody>
                  <StaticRow key={selectedRow.id} row={selectedRow} />
                </TableBody>
              </Table>
            )}
          </DragOverlay>
        </TableBody>
      </Table>
    </DndContext>
  );
}
