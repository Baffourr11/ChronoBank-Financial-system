// Path: app/(dashboard)/analytics/scenarios/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ScenarioResults from "@/components/analytics/ScenarioResults";
import {
  Shield,
  TrendingDown,
  AlertTriangle,
  Play,
  RefreshCw,
  DollarSign,
  Activity,
  Target,
  Zap,
} from "lucide-react";

interface Scenario {
  id: string;
  name: string;
  description: string;
  type:
    | "market_shock"
    | "income_change"
    | "expense_change"
    | "investment"
    | "custom";
  parameters: any;
  duration: number;
  createdAt: Date;
}

interface AmountFrequency {
  amount: number;
  frequency?: string;
}

interface SimulationResult {
  scenario: Scenario;
  baseline: any;
  stressed: any;
  impact: any;
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendations: any[];
}

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(
    null,
  );
  const [simulationResult, setSimulationResult] =
    useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [customParameters, setCustomParameters] = useState<any>({});

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/analytics/scenarios");
      if (response.ok) {
        const data = await response.json();
        setScenarios(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch scenarios:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const runScenario = async (scenario: Scenario, customParams?: any) => {
    try {
      setIsSimulating(true);

      const scenarioToRun = customParams
        ? {
            ...scenario,
            parameters: { ...scenario.parameters, ...customParams },
          }
        : scenario;

      const response = await fetch("/api/analytics/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: scenarioToRun,
          projectionDays: 90,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSimulationResult(result.data);
        setSelectedScenario(scenarioToRun);
      }
    } catch (error) {
      console.error("Failed to run scenario:", error);
    } finally {
      setIsSimulating(false);
    }
  };

  const getScenarioIcon = (type: string) => {
    switch (type) {
      case "market_shock":
        return <DollarSign className="w-4 h-4" />;
      case "income_change":
        return <TrendingDown className="w-4 h-4" />;
      case "expense_change":
        return <Activity className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Scenario Simulator</h1>
          <Button>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scenario Simulator</h1>
          <p className="text-muted-foreground">
            Stress test your financial resilience against hypothetical market
            conditions
          </p>
        </div>
        <Button onClick={fetchScenarios}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Scenarios
        </Button>
      </div>

      {/* Scenario Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Scenarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Available Scenarios
            </CardTitle>
            <CardDescription>
              Pre-configured scenarios for Ghanaian market conditions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedScenario?.id === scenario.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedScenario(scenario)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getScenarioIcon(scenario.type)}
                      <h4 className="font-medium">{scenario.name}</h4>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {scenario.type.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {scenario.description}
                  </p>

                  {/* Scenario Parameters */}
                  <div className="space-y-2 text-xs">
                    {Object.entries(scenario.parameters).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}:
                        </span>
                        <span className="font-medium">
                          {typeof value === "number"
                            ? `${value}%`
                            : typeof value === "object" &&
                                value !== null &&
                                (value as AmountFrequency).amount
                              ? `GHS ${(value as AmountFrequency).amount}${(value as AmountFrequency).frequency ? ` ${(value as AmountFrequency).frequency}` : ""}`
                              : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      Duration: {scenario.duration} days
                    </span>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        runScenario(scenario);
                      }}
                      disabled={isSimulating}
                    >
                      {isSimulating ? (
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3 mr-1" />
                      )}
                      Run
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Custom Scenario Builder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Custom Scenario
            </CardTitle>
            <CardDescription>
              Create your own scenario with custom parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Scenario Type Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Scenario Type
                </label>
                <Select
                  onValueChange={(value) => {
                    const scenario = scenarios.find((s) => s.id === value);
                    if (scenario) {
                      setSelectedScenario(scenario);
                      setCustomParameters({ ...scenario.parameters });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a scenario template" />
                  </SelectTrigger>
                  <SelectContent>
                    {scenarios.map((scenario) => (
                      <SelectItem key={scenario.id} value={scenario.id}>
                        {scenario.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Parameters */}
              {selectedScenario && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Adjust Parameters</h4>

                  {Object.entries(selectedScenario.parameters).map(
                    ([key, defaultValue]) => {
                      if (typeof defaultValue !== "number") return null;

                      return (
                        <div key={key} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium capitalize">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </label>
                            <span className="text-sm font-medium">
                              {customParameters[key] || defaultValue}%
                            </span>
                          </div>
                          <Slider
                            value={[customParameters[key] || defaultValue]}
                            onValueChange={(value) => {
                              setCustomParameters((prev: any) => ({
                                ...prev,
                                [key]: value[0],
                              }));
                            }}
                            max={100}
                            min={0}
                            step={1}
                            className="w-full"
                          />
                        </div>
                      );
                    },
                  )}
                </div>
              )}

              {/* Run Custom Scenario */}
              <Button
                className="w-full"
                onClick={() =>
                  selectedScenario &&
                  runScenario(selectedScenario, customParameters)
                }
                disabled={!selectedScenario || isSimulating}
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Simulating...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Custom Scenario
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Simulation Results */}
      {simulationResult && (
        <ScenarioResults
          result={simulationResult}
          onRunNewScenario={() => {
            setSimulationResult(null);
            setSelectedScenario(null);
            setCustomParameters({});
          }}
        />
      )}

      {/* Quick Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Quick Stress Tests
          </CardTitle>
          <CardDescription>
            Common scenarios for Ghanaian market conditions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => {
                const scenario = scenarios.find(
                  (s) => s.id === "currency_devaluation_20",
                );
                if (scenario) runScenario(scenario);
              }}
              disabled={isSimulating}
            >
              <DollarSign className="w-6 h-6 mb-2" />
              <span className="text-sm">20% Devaluation</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => {
                const scenario = scenarios.find(
                  (s) => s.id === "inflation_spike",
                );
                if (scenario) runScenario(scenario);
              }}
              disabled={isSimulating}
            >
              <Activity className="w-6 h-6 mb-2" />
              <span className="text-sm">Inflation Spike</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => {
                const scenario = scenarios.find((s) => s.id === "job_loss");
                if (scenario) runScenario(scenario);
              }}
              disabled={isSimulating}
            >
              <TrendingDown className="w-6 h-6 mb-2" />
              <span className="text-sm">Job Loss</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => {
                const scenario = scenarios.find(
                  (s) => s.id === "medical_emergency",
                );
                if (scenario) runScenario(scenario);
              }}
              disabled={isSimulating}
            >
              <AlertTriangle className="w-6 h-6 mb-2" />
              <span className="text-sm">Medical Emergency</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment Info */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p>
              <strong>Understanding Risk Levels:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                <strong>Low:</strong> Minimal impact on financial stability
              </li>
              <li>
                <strong>Medium:</strong> Some disruption, manageable with
                adjustments
              </li>
              <li>
                <strong>High:</strong> Significant impact, requires immediate
                action
              </li>
              <li>
                <strong>Critical:</strong> Severe impact, emergency measures
                needed
              </li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
