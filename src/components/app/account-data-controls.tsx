"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Download, Loader2, Trash2 } from "lucide-react";
import {
  deleteAccountAction,
  exportAccountDataAction,
  type DeleteAccountActionState,
} from "@/app/actions";
import type { AccountInventory } from "../../../shared/accountData";
import { Button } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { Heading } from "@/components/ds/heading";
import { Text } from "@/components/ds/text";
import { TextInput } from "@/components/ds/text-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCount } from "@/lib/utils";

type AccountDataControlsProps = {
  username: string;
  inventory: AccountInventory;
};

const initialDeleteState: DeleteAccountActionState = { error: null };

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function AccountDataControls({
  username,
  inventory,
}: AccountDataControlsProps) {
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExportPending, startExportTransition] = useTransition();
  const [confirmation, setConfirmation] = useState("");
  const [deleteState, deleteFormAction, isDeletePending] = useActionState(
    deleteAccountAction,
    initialDeleteState
  );
  const tableRows = useMemo(
    () => inventory.tables.filter((table) => table.count > 0),
    [inventory.tables]
  );

  function onExport() {
    setExportError(null);
    startExportTransition(async () => {
      const result = await exportAccountDataAction();
      if (!result.ok) {
        setExportError(result.error);
        return;
      }
      downloadJson(result.filename, result.payload);
    });
  }

  return (
    <Card padding={3}>
      <div className="space-y-4">
        <div className="space-y-1">
          <Heading level={3} className="text-base">
            Data export & deletion
          </Heading>
          <Text type="supporting" color="secondary" display="block">
            Download your account data or permanently remove the account and its
            related rows.
          </Text>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <div className="text-sm font-medium">JSON export</div>
            <div className="text-xs text-muted-foreground">
              {formatCount(inventory.totalRows)} account rows currently in scope.
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            label="Download JSON"
            icon={
              isExportPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Download className="size-4" />
              )
            }
            isDisabled={isExportPending}
            onClick={onExport}
          />
        </div>

        {exportError && (
          <p className="text-sm text-destructive">{exportError}</p>
        )}

        <div className="rounded-lg border border-destructive/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-destructive">
                Delete account
              </div>
              <div className="text-xs text-muted-foreground">
                Deletes child data in batches before removing @{username}.
              </div>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  label="Delete account"
                  icon={<Trash2 className="size-4" />}
                />
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete @{username}</DialogTitle>
                  <DialogDescription>
                    Review the dry-run inventory, then type your username to
                    start deletion.
                  </DialogDescription>
                </DialogHeader>

                <div className="max-h-64 overflow-auto rounded-lg border">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Table</th>
                        <th className="px-3 py-2 text-right font-medium">
                          Rows
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((table) => (
                        <tr key={table.table} className="border-b last:border-0">
                          <td className="px-3 py-2 font-mono text-xs">
                            {table.table}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">
                            {formatCount(table.count)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <form action={deleteFormAction} className="space-y-3">
                  <input
                    type="hidden"
                    name="confirmationUsername"
                    value={confirmation}
                    readOnly
                  />
                  <TextInput
                    label={`Type ${username}`}
                    value={confirmation}
                    onChange={setConfirmation}
                  />
                  {deleteState.error && (
                    <p className="text-sm text-destructive">
                      {deleteState.error}
                    </p>
                  )}
                  <DialogFooter>
                    <Button
                      type="submit"
                      variant="destructive"
                      label="Permanently delete"
                      icon={
                        isDeletePending ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )
                      }
                      isDisabled={
                        confirmation !== username || isDeletePending
                      }
                    />
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </Card>
  );
}
