"use client";

import { useEffect, useState } from "react";
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
import type { RuleCondition } from "@/lib/models/Rule";

interface RuleConditionEditorProps {
  conditions: RuleCondition[];
  datasetId?: string;
  onChange: (conditions: RuleCondition[]) => void;
}

const CONDITION_TYPES: { value: RuleCondition["type"]; label: string }[] = [
  { value: "balance", label: "Account balance" },
  { value: "transaction", label: "Transaction" },
  { value: "category", label: "Category" },
  { value: "amount", label: "Amount" },
  { value: "date", label: "Date" },
  { value: "predicted_balance", label: "Predicted balance" },
  { value: "cash_flow_risk", label: "Cash-flow risk" },
  { value: "budget", label: "Budget usage %" },
];

const OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "greater_than", label: "Greater than" },
  { value: "greater_than_or_equal", label: "At or above (≥)" },
  { value: "less_than", label: "Less than" },
  { value: "less_than_or_equal", label: "At or below (≤)" },
  { value: "contains", label: "Contains" },
  { value: "between", label: "Between" },
];

function defaultCondition(): RuleCondition {
  return {
    type: "balance",
    operator: "less_than",
    field: "",
    value: "",
  };
}

export default function RuleConditionEditor({
  conditions,
  datasetId,
  onChange,
}: RuleConditionEditorProps) {
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!datasetId) {
      setAccounts([]);
      setBudgetCategories([]);
      return;
    }
    fetch(`/api/accounts?datasetId=${datasetId}`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.data?.accounts ?? [];
        setAccounts(
          list.map((a: { id: string; name: string }) => ({
            id: a.id,
            name: a.name,
          })),
        );
      })
      .catch(() => setAccounts([]));

    fetch(`/api/budgets?datasetId=${datasetId}`)
      .then((r) => r.json())
      .then((data) => {
        const cats = (data.data?.budgets ?? []).map(
          (b: { category: string }) => b.category,
        );
        setBudgetCategories(cats);
      })
      .catch(() => setBudgetCategories([]));
  }, [datasetId]);

  const update = (index: number, patch: Partial<RuleCondition>) => {
    onChange(
      conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
  };

  const add = () => onChange([...conditions, defaultCondition()]);

  const remove = (index: number) =>
    onChange(conditions.filter((_, i) => i !== index));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Conditions</p>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          Add condition
        </Button>
      </div>
      <p className="text-xs text-muted-foreground rounded-md border bg-muted/40 p-3">
        <strong className="text-foreground">All conditions (AND):</strong> every
        condition listed below must pass for the rule to fire. If you have 2
        conditions, both must be true — remove extras you do not need. Rules run
        when you click <strong>Run</strong>, save/update the rule, add a
        transaction, or use Run analysis.
      </p>

      {conditions.length === 0 ? (
        <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
          No conditions yet. Add at least one.
        </p>
      ) : null}

      {conditions.map((condition, index) => (
        <div
          key={index}
          className="border rounded-lg p-4 space-y-4 bg-muted/30"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Condition {index + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              aria-label="Remove condition"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <Field>
            <FieldLabel>Type</FieldLabel>
            <FieldContent>
              <Select
                value={condition.type}
                onValueChange={(v) =>
                  update(index, {
                    type: v as RuleCondition["type"],
                    field: "",
                    value: "",
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>
              {condition.type === "balance"
                ? "Account"
                : condition.type === "predicted_balance"
                  ? "Forecast horizon"
                  : condition.type === "cash_flow_risk"
                    ? "Risk level"
                    : condition.type === "budget"
                      ? "Budget category"
                      : "Field"}
            </FieldLabel>
            <FieldContent>
              {condition.type === "balance" ? (
                <Select
                  value={String(condition.field || "")}
                  onValueChange={(v) => update(index, { field: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.name}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : condition.type === "predicted_balance" ? (
                <Select
                  value={String(condition.field || "30d")}
                  onValueChange={(v) => update(index, { field: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">7 days</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                    <SelectItem value="90d">90 days</SelectItem>
                  </SelectContent>
                </Select>
              ) : condition.type === "cash_flow_risk" ? (
                <Select
                  value={String(condition.value || "medium")}
                  onValueChange={(v) => update(index, { value: v, field: "severity" })}
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
              ) : condition.type === "budget" ? (
                <Select
                  value={String(condition.field || "*")}
                  onValueChange={(v) => update(index, { field: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select budget category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="*">Any category with a budget</SelectItem>
                    {budgetCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="w-full"
                  value={String(condition.field ?? "")}
                  onChange={(e) => update(index, { field: e.target.value })}
                  placeholder={
                    condition.type === "budget"
                      ? "Category name"
                      : condition.type === "date"
                        ? "day_of_week or day_of_month"
                        : "e.g. category, amount, type"
                  }
                />
              )}
              <FieldDescription>
                {condition.type === "predicted_balance" &&
                  "Uses forecast from Run analysis."}
                {condition.type === "budget" &&
                  "Must match a budget you created on the Budgets page (same spelling)."}
              </FieldDescription>
            </FieldContent>
          </Field>

          {condition.type !== "cash_flow_risk" ? (
            <>
              <Field>
                <FieldLabel>Operator</FieldLabel>
                <FieldContent>
                  <Select
                    value={condition.operator}
                    onValueChange={(v) =>
                      update(index, {
                        operator: v as RuleCondition["operator"],
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Value</FieldLabel>
                <FieldContent>
                  <Input
                    className="w-full"
                    type={
                      condition.type === "amount" ||
                      condition.type === "balance" ||
                      condition.type === "predicted_balance" ||
                      condition.type === "budget"
                        ? "number"
                        : "text"
                    }
                    value={String(condition.value ?? "")}
                    onChange={(e) => update(index, { value: e.target.value })}
                    placeholder={
                      condition.type === "budget"
                        ? "Threshold % (e.g. 100)"
                        : "Amount in GHS or text"
                    }
                  />
                  {condition.type === "budget" && (
                    <FieldDescription>
                      Percent of monthly budget spent. Use &quot;At or above
                      (≥)&quot; with 100 to alert at exactly 100% or over.
                    </FieldDescription>
                  )}
                </FieldContent>
              </Field>
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}
