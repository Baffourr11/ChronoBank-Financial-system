"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { FieldSet, FieldLegend } from "@/components/ui/field";
import RuleConditionEditor from "@/components/rules/RuleConditionEditor";
import RuleActionEditor from "@/components/rules/RuleActionEditor";
import type { RuleAction, RuleCondition, RuleSchedule } from "@/lib/models/Rule";

export interface RuleFormData {
  name: string;
  description: string;
  priority: number;
  isActive: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  schedule: RuleSchedule;
}

const PRIORITY_OPTIONS = [
  { value: "1", label: "Low" },
  { value: "5", label: "Medium" },
  { value: "8", label: "High" },
  { value: "10", label: "Critical" },
] as const;

interface RuleFormPanelProps {
  formData: RuleFormData;
  setFormData: React.Dispatch<React.SetStateAction<RuleFormData>>;
  datasetId?: string;
  editing: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export default function RuleFormPanel({
  formData,
  setFormData,
  datasetId,
  editing,
  onCancel,
  onSubmit,
}: RuleFormPanelProps) {
  return (
    <div className="space-y-6 py-2">
      <FieldSet>
        <FieldLegend>Basic info</FieldLegend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 min-w-0">
            <Label htmlFor="rule-name">Rule name</Label>
            <Input
              id="rule-name"
              className="w-full"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Tax reserve automation"
            />
          </div>
          <div className="space-y-2 min-w-0">
            <Label htmlFor="rule-priority">Priority</Label>
            <Select
              value={formData.priority.toString()}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  priority: parseInt(value, 10),
                }))
              }
            >
              <SelectTrigger id="rule-priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2 min-w-0">
          <Label htmlFor="rule-desc">Description</Label>
          <Textarea
            id="rule-desc"
            className="w-full resize-y min-h-[80px]"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Describe what this rule does..."
            rows={3}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="rule-active"
            checked={formData.isActive}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, isActive: checked }))
            }
          />
          <Label htmlFor="rule-active">Rule is active</Label>
        </div>
      </FieldSet>

      <Separator />

      <RuleConditionEditor
        conditions={formData.conditions}
        datasetId={datasetId}
        onChange={(conditions) =>
          setFormData((prev) => ({ ...prev, conditions }))
        }
      />

      <Separator />

      <FieldSet>
        <FieldLegend>Schedule</FieldLegend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2 min-w-0">
            <Label>When to check</Label>
            <Select
              value={formData.schedule?.type ?? "triggered"}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  schedule: { ...prev.schedule, type: value as RuleSchedule["type"] },
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="triggered">On trigger</SelectItem>
                <SelectItem value="recurring">Recurring</SelectItem>
                <SelectItem value="once">Once</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.schedule?.type === "recurring" && (
            <>
              <div className="space-y-2 min-w-0">
                <Label>Frequency</Label>
                <Select
                  value={formData.schedule?.frequency ?? "daily"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      schedule: {
                        ...prev.schedule,
                        frequency: value as RuleSchedule["frequency"],
                      },
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Time (HH:MM)</Label>
                <Input
                  className="w-full"
                  value={formData.schedule?.time ?? "08:00"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      schedule: { ...prev.schedule, time: e.target.value },
                    }))
                  }
                />
              </div>
            </>
          )}
        </div>
      </FieldSet>

      <Separator />

      <RuleActionEditor
        actions={formData.actions}
        onChange={(actions) => setFormData((prev) => ({ ...prev, actions }))}
      />

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={onSubmit}>
          {editing ? "Update rule" : "Create rule"}
        </Button>
      </div>
    </div>
  );
}
