"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Trash2 } from "lucide-react";
import type { RuleAction } from "@/lib/models/Rule";

interface RuleActionEditorProps {
  actions: RuleAction[];
  onChange: (actions: RuleAction[]) => void;
}

const ACTION_TYPES: { value: RuleAction["type"]; label: string }[] = [
  { value: "send_alert", label: "Send alert" },
  { value: "create_transaction", label: "Create transaction" },
  { value: "create_budget", label: "Create budget" },
  { value: "transfer", label: "Transfer funds" },
  { value: "update_account", label: "Update account" },
];

function defaultAction(): RuleAction {
  return {
    type: "send_alert",
    params: { title: "", message: "", severity: "medium" },
  };
}

export default function RuleActionEditor({
  actions,
  onChange,
}: RuleActionEditorProps) {
  const update = (index: number, patch: Partial<RuleAction>) => {
    onChange(
      actions.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    );
  };

  const updateParams = (
    index: number,
    params: Record<string, unknown>,
  ) => {
    onChange(
      actions.map((a, i) =>
        i === index ? { ...a, params: { ...a.params, ...params } } : a,
      ),
    );
  };

  const add = () => onChange([...actions, defaultAction()]);
  const remove = (index: number) =>
    onChange(actions.filter((_, i) => i !== index));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Actions</p>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          Add action
        </Button>
      </div>

      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
          No actions yet. Add at least one.
        </p>
      ) : null}

      {actions.map((action, index) => (
        <div
          key={index}
          className="border rounded-lg p-4 space-y-4 bg-muted/30"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Action {index + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              aria-label="Remove action"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <Field>
            <FieldLabel>Action type</FieldLabel>
            <FieldContent>
              <Select
                value={action.type}
                onValueChange={(v) =>
                  update(index, {
                    type: v as RuleAction["type"],
                    params: {},
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>

          {action.type === "send_alert" && (
            <div className="space-y-4">
              <Field>
                <FieldLabel>Alert title</FieldLabel>
                <FieldContent>
                  <Input
                    className="w-full"
                    value={String(action.params?.title ?? "")}
                    onChange={(e) =>
                      updateParams(index, { title: e.target.value })
                    }
                    placeholder="e.g. Low balance warning"
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Message</FieldLabel>
                <FieldContent>
                  <Input
                    className="w-full"
                    value={String(action.params?.message ?? "")}
                    onChange={(e) =>
                      updateParams(index, { message: e.target.value })
                    }
                    placeholder="What should the user know?"
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Severity</FieldLabel>
                <FieldContent>
                  <Select
                    value={String(action.params?.severity ?? "medium")}
                    onValueChange={(v) => updateParams(index, { severity: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
            </div>
          )}

          {action.type === "create_transaction" && (
            <div className="space-y-4">
              <Field>
                <FieldLabel>Amount (GHS)</FieldLabel>
                <FieldContent>
                  <Input
                    className="w-full"
                    type="number"
                    value={String(action.params?.amount ?? "")}
                    onChange={(e) =>
                      updateParams(index, { amount: e.target.value })
                    }
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Type</FieldLabel>
                <FieldContent>
                  <Select
                    value={String(action.params?.type ?? "expense")}
                    onValueChange={(v) => updateParams(index, { type: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Category</FieldLabel>
                <FieldContent>
                  <Input
                    className="w-full"
                    value={String(action.params?.category ?? "Automation")}
                    onChange={(e) =>
                      updateParams(index, { category: e.target.value })
                    }
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Description</FieldLabel>
                <FieldContent>
                  <Input
                    className="w-full"
                    value={String(action.params?.description ?? "")}
                    onChange={(e) =>
                      updateParams(index, { description: e.target.value })
                    }
                  />
                </FieldContent>
              </Field>
            </div>
          )}

          {action.type === "create_budget" && (
            <div className="space-y-4">
              <Field>
                <FieldLabel>Category</FieldLabel>
                <FieldContent>
                  <Input
                    className="w-full"
                    value={String(action.params?.category ?? "")}
                    onChange={(e) =>
                      updateParams(index, { category: e.target.value })
                    }
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Limit (GHS)</FieldLabel>
                <FieldContent>
                  <Input
                    className="w-full"
                    type="number"
                    value={String(action.params?.limitAmount ?? "")}
                    onChange={(e) =>
                      updateParams(index, { limitAmount: e.target.value })
                    }
                  />
                </FieldContent>
              </Field>
            </div>
          )}

          {action.type === "transfer" && (
            <div className="space-y-4">
              <Field>
                <FieldLabel>Amount (GHS)</FieldLabel>
                <FieldContent>
                  <Input
                    className="w-full"
                    type="number"
                    value={String(action.params?.amount ?? "")}
                    onChange={(e) =>
                      updateParams(index, { amount: e.target.value })
                    }
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Description</FieldLabel>
                <FieldContent>
                  <Input
                    className="w-full"
                    value={String(action.params?.description ?? "")}
                    onChange={(e) =>
                      updateParams(index, { description: e.target.value })
                    }
                  />
                </FieldContent>
              </Field>
              <FieldDescription>
                Account IDs must match accounts in this dataset (advanced).
              </FieldDescription>
              <Field>
                <FieldLabel>From account ID</FieldLabel>
                <FieldContent>
                  <Input
                    className="w-full"
                    value={String(action.params?.fromAccountId ?? "")}
                    onChange={(e) =>
                      updateParams(index, { fromAccountId: e.target.value })
                    }
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>To account ID</FieldLabel>
                <FieldContent>
                  <Input
                    className="w-full"
                    value={String(action.params?.toAccountId ?? "")}
                    onChange={(e) =>
                      updateParams(index, { toAccountId: e.target.value })
                    }
                  />
                </FieldContent>
              </Field>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
