"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Download, Loader2, Trash2 } from "lucide-react";
import {
  deleteAccountAction,
  exportAccountDataAction,
  type DeleteAccountActionState,
} from "@/app/actions";
import type { AccountInventory } from "../../../shared/accountData";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Data export & deletion</CardTitle>
        <CardDescription>
          Download your account data or permanently remove the account and its
          related rows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div>
            <div className="text-sm font-medium">JSON export</div>
            <div className="text-xs text-muted-foreground">
              {formatCount(inventory.totalRows)} account rows currently in
              scope.
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onExport}
            disabled={isExportPending}
          >
            {isExportPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Download />
            )}
            Download JSON
          </Button>
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
                <Button type="button" variant="destructive">
                  <Trash2 />
                  Delete account
                </Button>
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
                  <label className="block space-y-2 text-sm">
                    <span className="text-muted-foreground">
                      Type <span className="font-mono text-foreground">{username}</span>
                    </span>
                    <Input
                      name="confirmationUsername"
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      autoComplete="off"
                    />
                  </label>
                  {deleteState.error && (
                    <p className="text-sm text-destructive">
                      {deleteState.error}
                    </p>
                  )}
                  <DialogFooter>
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={confirmation !== username || isDeletePending}
                    >
                      {isDeletePending ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Trash2 />
                      )}
                      Permanently delete
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
