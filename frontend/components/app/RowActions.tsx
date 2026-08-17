"use client";

import { Copy, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { IconButton } from "../ui/Button";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "../ui/Menu";

type RowAction = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  onClick: () => Promise<void> | void;
};

export function RowActions({
  label,
  onView,
  onEdit,
  onDuplicate,
  actions = [],
  onDelete,
  deleteLabel = "Delete",
  deleteConfirm
}: {
  label: string;
  onView?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  actions?: RowAction[];
  onDelete?: () => Promise<void> | void;
  deleteLabel?: string;
  deleteConfirm?: string;
}) {
  return (
    <span className="flex justify-end" onClick={(event) => event.stopPropagation()}>
      <Menu
        width="w-48"
        trigger={({ toggle }) => (
          <IconButton label={`Actions for ${label}`} variant="secondary" className="h-7 w-7" onClick={toggle}>
            <MoreHorizontal className="h-4 w-4" />
          </IconButton>
        )}
      >
        {(close) => (
          <>
            <MenuLabel>Actions</MenuLabel>
            {onView ? <MenuItem icon={Eye} onClick={() => { close(); onView(); }}>View details</MenuItem> : null}
            {onEdit ? <MenuItem icon={Pencil} onClick={() => { close(); onEdit(); }}>Edit</MenuItem> : null}
            {onDuplicate ? <MenuItem icon={Copy} onClick={() => { close(); onDuplicate(); }}>Duplicate</MenuItem> : null}
            {actions.length ? (
              <>
                {(onView || onEdit || onDuplicate) ? <MenuSeparator /> : null}
                {actions.map((action) => (
                  <MenuItem
                    key={action.label}
                    icon={action.icon}
                    danger={action.danger}
                    onClick={async () => { close(); await action.onClick(); }}
                  >
                    {action.label}
                  </MenuItem>
                ))}
              </>
            ) : null}
            {onDelete ? (
              <>
                <MenuSeparator />
                <MenuItem
                  icon={Trash2}
                  danger
                  onClick={async () => {
                    close();
                    const message = deleteConfirm ?? `Delete ${label}? This cannot be undone.`;
                    if (!window.confirm(message)) return;
                    await onDelete();
                  }}
                >
                  {deleteLabel}
                </MenuItem>
              </>
            ) : null}
          </>
        )}
      </Menu>
    </span>
  );
}
