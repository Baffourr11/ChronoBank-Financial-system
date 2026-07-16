// Path: app/(dashboard)/rules/page.tsx
"use client";

import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatasetSelector } from "@/components/dataset/DatasetSelector";
import { useDataset } from "@/lib/contexts/DatasetContext";
import {
  CheckCircle,
  Database,
  Edit,
  Play,
  Plus,
  Settings,
  Target,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import RuleFormPanel, {
  type RuleFormData,
} from "@/components/rules/RuleFormPanel";

interface Rule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  conditions: any[];
  actions: any[];
  schedule: any;
  executionCount: number;
  lastExecuted?: string;
  createdAt: string;
}

export default function RulesPage() {
  const { selectedDataset } = useDataset();
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const datasetId = selectedDataset?._id;
  const [ruleTemplates, setRuleTemplates] = useState<
    { id: string; name: string; description: string; category: string; rule: RuleFormData }[]
  >([]);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>({
    name: "",
    description: "",
    priority: 5,
    isActive: true,
    conditions: [],
    actions: [],
    schedule: { type: "triggered" },
  });

  useEffect(() => {
    fetch("/api/rules/templates")
      .then((r) => r.json())
      .then((data) => {
        if (data.data?.templates) setRuleTemplates(data.data.templates);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (datasetId) {
      fetchRules();
    } else {
      setIsLoading(false);
    }
  }, [datasetId]);

  const fetchRules = async () => {
    if (!datasetId) return;

    try {
      const response = await fetch(
        `/api/rules?includeExecutions=true&datasetId=${datasetId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setRules(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch rules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateRuleForm = (): string | null => {
    if (!formData.conditions.length) {
      return "Add at least one condition.";
    }
    for (const c of formData.conditions) {
      if (
        c.type === "budget" &&
        c.field &&
        String(c.field) !== "*" &&
        !String(c.field).trim()
      ) {
        return "Select a budget category for each budget condition.";
      }
    }
    if (!formData.actions.length) {
      return "Add at least one action.";
    }
    return null;
  };

  const handleCreateRule = async () => {
    const validationError = validateRuleForm();
    if (validationError) {
      window.alert(validationError);
      return;
    }
    try {
      const response = await fetch(`/api/rules?datasetId=${datasetId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, datasetId }),
      });

      const json = await response.json();
      if (response.ok) {
        const run = json.data?.firstRun;
        if (run && !run.fired) {
          window.alert(
            `Rule saved but did not fire yet: ${run.failedCondition || "conditions not met"}`,
          );
        } else if (run?.fired) {
          window.alert("Rule saved and alert sent. Check the bell icon.");
        }
        setIsCreateDialogOpen(false);
        fetchRules();
        resetForm();
      }
    } catch (error) {
      console.error("Failed to create rule:", error);
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;

    const validationError = validateRuleForm();
    if (validationError) {
      window.alert(validationError);
      return;
    }

    try {
      const response = await fetch(
        `/api/rules/${editingRule.id}?datasetId=${datasetId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      const json = await response.json();
      if (response.ok) {
        const run = json.data?.runResult;
        if (run && !run.fired) {
          window.alert(
            `Rule updated but did not fire: ${run.failedCondition || "conditions not met"}`,
          );
        } else if (run?.fired) {
          window.alert("Rule updated and alert sent. Check the bell icon.");
        }
        setEditingRule(null);
        fetchRules();
        resetForm();
      } else {
        window.alert(json.error || "Failed to update rule");
      }
    } catch (error) {
      console.error("Failed to update rule:", error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      const response = await fetch(
        `/api/rules/${ruleId}?datasetId=${datasetId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error("Failed to delete rule:", error);
    }
  };

  const handleExecuteRule = async (ruleId: string) => {
    try {
      const response = await fetch(
        `/api/rules/${ruleId}/execute?datasetId=${datasetId}`,
        {
          method: "POST",
        },
      );

      const json = await response.json();
      if (response.ok) {
        const data = json.data;
        if (data?.fired) {
          window.alert(
            data.message ||
              "Rule ran successfully. Check the bell icon for alerts.",
          );
        } else {
          window.alert(
            data?.message ||
              data?.failedCondition ||
              "Rule did not fire — conditions were not met.",
          );
        }
        fetchRules();
      } else {
        window.alert(json.error || "Failed to run rule");
      }
    } catch (error) {
      console.error("Failed to execute rule:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      priority: 5,
      isActive: true,
      conditions: [],
      actions: [],
      schedule: { type: "triggered" },
    });
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return "bg-red-500";
    if (priority >= 6) return "bg-orange-500";
    if (priority >= 4) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-gray-400" />
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Financial Rules</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2 animate-pulse" />
                <div className="h-3 bg-muted rounded w-1/2 mb-4 animate-pulse" />
                <div className="h-2 bg-muted rounded w-full mb-2 animate-pulse" />
                <div className="h-2 bg-muted rounded w-2/3 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dataset Selector */}
      <DatasetSelector />

      {/* Show message if no dataset selected */}
      {!selectedDataset && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              Select a Dataset to Manage Rules
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Rules are applied to specific datasets. Select a dataset above to
              view and manage rules for that dataset.
            </p>
            <Button asChild>
              <a href="/data/import">Upload New Dataset</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedDataset && (
        <>
          <PageHeader
            title="Financial Rules"
            description={`Prediction-driven automation for ${selectedDataset.name}`}
            actions={
            <Dialog
              open={isCreateDialogOpen || !!editingRule}
              onOpenChange={(open) => {
                if (!open) {
                  setIsCreateDialogOpen(false);
                  setEditingRule(null);
                  resetForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingRule ? "Edit Rule" : "Create New Rule"}
                  </DialogTitle>
                  <DialogDescription>
                    Define conditions and actions to automate your financial
                    decisions
                  </DialogDescription>
                </DialogHeader>
                <RuleFormPanel
                  formData={formData}
                  setFormData={setFormData}
                  datasetId={datasetId}
                  editing={!!editingRule}
                  onCancel={() => {
                    setIsCreateDialogOpen(false);
                    setEditingRule(null);
                    resetForm();
                  }}
                  onSubmit={editingRule ? handleUpdateRule : handleCreateRule}
                />
              </DialogContent>
            </Dialog>
            }
          />

          {/* Rules Grid */}
          {rules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Settings className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Rules Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first financial rule to start automating your
                  decisions
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Rule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rules.map((rule) => (
                <Card key={rule.id} className="relative min-w-0 overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 min-w-0">
                          <CardTitle className="text-lg truncate">{rule.name}</CardTitle>
                          <div
                            className={`w-2 h-2 rounded-full ${getPriorityColor(rule.priority)}`}
                          />
                        </div>
                        <CardDescription className="text-sm line-clamp-2">
                          {rule.description}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(rule.isActive)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Priority:</span>
                        <Badge variant="secondary">{rule.priority}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Executions:
                        </span>
                        <span>{rule.executionCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Conditions:
                        </span>
                        <span>{rule.conditions.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Actions:</span>
                        <span>{rule.actions.length}</span>
                      </div>
                      {rule.lastExecuted && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Last run:
                          </span>
                          <span>
                            {new Date(rule.lastExecuted).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExecuteRule(rule.id)}
                        disabled={!rule.isActive}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Run
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingRule(rule);
                          setFormData({
                            name: rule.name,
                            description: rule.description,
                            priority: rule.priority,
                            isActive: rule.isActive,
                            conditions: rule.conditions,
                            actions: rule.actions,
                            schedule: rule.schedule,
                          });
                        }}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Quick Templates */}
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 shrink-0" />
                Quick Rule Templates
              </CardTitle>
              <CardDescription>
                Pre-configured rules for common financial automation needs
              </CardDescription>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
                {ruleTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="flex w-full min-w-0 flex-col items-start gap-2 rounded-lg border border-border bg-background p-4 text-left shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={() => {
                      setFormData({
                        name: t.rule.name,
                        description: t.rule.description ?? "",
                        priority: t.rule.priority ?? 5,
                        isActive: t.rule.isActive ?? true,
                        conditions: t.rule.conditions ?? [],
                        actions: t.rule.actions ?? [],
                        schedule: t.rule.schedule ?? { type: "triggered" },
                      });
                      setIsCreateDialogOpen(true);
                    }}
                  >
                    <span className="w-full min-w-0 text-sm font-medium leading-snug line-clamp-2">
                      {t.name}
                    </span>
                    <span className="w-full min-w-0 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {t.description}
                    </span>
                    {t.category === "ghana" && (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        Ghana SME
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
