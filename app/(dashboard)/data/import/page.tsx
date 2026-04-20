// Path: app/(dashboard)/data/import/page.tsx
"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle,
  CheckCircle,
  Database,
  Download,
  FileText,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Dataset {
  _id: string;
  name: string;
  description?: string;
  transactionCount: number;
  dateRange: {
    start: string;
    end: string;
    totalDays: number;
  };
  isActive: boolean;
  metadata: {
    source: string;
    format: string;
    importedAt: string;
    lastAnalyzed?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
  accounts: string[];
  message: string;
  dataset?: {
    _id: string;
    name: string;
    description: string;
    transactionCount: number;
    dateRange: any;
    metadata: any;
  };
}

interface ImportStats {
  statistics: {
    totalTransactions: number;
    dataRange: {
      start: string;
      end: string;
      totalDays: number;
    };
    hasEnoughData: boolean;
    hasHistoricalData: boolean;
  };
  recommendations: {
    needsMoreData: boolean;
    recommendedMinTransactions: number;
    needsLongerHistory: boolean;
    recommendedMinDays: number;
  };
}

export default function DataImportPage() {
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDataset, setActiveDataset] = useState<Dataset | null>(null);
  const [importOptions, setImportOptions] = useState({
    skipDuplicates: true,
    createMissingAccounts: true,
    batchSize: 100,
  });

  useEffect(() => {
    fetchDatasets();
    fetchImportStats();
  }, []);

  const fetchDatasets = async () => {
    try {
      const response = await fetch("/api/datasets");
      if (response.ok) {
        const data = await response.json();
        const datasetsArray = Array.isArray(data.data) ? data.data : [];
        setDatasets(datasetsArray);
        const active = datasetsArray.find((d: Dataset) => d.isActive);
        setActiveDataset(
          active || (datasetsArray.length > 0 ? datasetsArray[0] : null),
        );
      }
    } catch (error) {
      console.error("Failed to fetch datasets:", error);
    }
  };

  const fetchImportStats = async () => {
    try {
      const response = await fetch("/api/data/import");
      if (response.ok) {
        const data = await response.json();
        setImportStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch import stats:", error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportResult(null);
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", `Upload ${new Date().toLocaleDateString()}`);
      formData.append("description", `Uploaded from ${selectedFile.name}`);

      const response = await fetch("/api/datasets", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setImportResult(result.data.importResult);
        fetchDatasets(); // Refresh datasets
        fetchImportStats(); // Refresh stats
      } else {
        const error = await response.json();
        setImportResult({
          total: 0,
          imported: 0,
          skipped: 0,
          errors: [error.message || "Upload failed"],
          accounts: [],
          message: "Upload failed",
        });
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setImportResult({
        total: 0,
        imported: 0,
        skipped: 0,
        errors: ["Network error during upload"],
        accounts: [],
        message: "Upload failed",
      });
    } finally {
      setIsImporting(false);
      setSelectedFile(null);
    }
  };

  const activateDataset = async (datasetId: string) => {
    try {
      const response = await fetch(`/api/datasets/${datasetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });

      if (response.ok) {
        fetchDatasets(); // Refresh datasets
      }
    } catch (error) {
      console.error("Failed to activate dataset:", error);
    }
  };

  const deleteDataset = async (datasetId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this dataset and all its transactions? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/datasets/${datasetId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchDatasets(); // Refresh datasets
        fetchImportStats(); // Refresh stats
      }
    } catch (error) {
      console.error("Failed to delete dataset:", error);
    }
  };

  const downloadTemplate = async (format: string) => {
    try {
      const response = await fetch(`/api/templates?format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chronobank-template.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error(`Failed to download ${format} template:`, error);
    }
  };

  const generateSampleData = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch("/api/data/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          options: {
            monthsOfHistory: 12,
            irregularIncome: true,
            includeSeasonalPatterns: true,
            baseIncome: 3000,
            varianceLevel: "medium",
          },
          generateAccounts: true,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Format the result to match ImportResult interface
        const importData = result.data;
        setImportResult({
          total: importData.dataRange?.totalTransactions || 0,
          imported: importData.created?.transactions || 0,
          skipped: importData.skipped?.transactions || 0,
          errors: importData.errors || [],
          accounts: [],
          message: importData.message || "Sample data generated successfully",
          dataset: importData.dataset
            ? {
                _id: importData.dataset.id,
                name: importData.dataset.name,
                description: "Generated sample data",
                transactionCount: importData.dataset.transactionCount,
                dateRange: importData.dataRange,
                metadata: {
                  source: "sample",
                  format: "json",
                  importedAt: new Date().toISOString(),
                },
              }
            : undefined,
        });
        fetchDatasets(); // Refresh datasets
        fetchImportStats(); // Refresh stats
      } else {
        const error = await response.json();
        setImportResult({
          total: 0,
          imported: 0,
          skipped: 0,
          errors: [error.message || "Sample data generation failed"],
          accounts: [],
          message: "Generation failed",
        });
      }
    } catch (error) {
      console.error("Sample data generation failed:", error);
      setImportResult({
        total: 0,
        imported: 0,
        skipped: 0,
        errors: ["Network error during generation"],
        accounts: [],
        message: "Generation failed",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getDataQualityColor = (hasEnoughData: boolean) => {
    return hasEnoughData ? "text-green-600" : "text-orange-600";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Management</h1>
          <p className="text-muted-foreground">
            Import, manage, and switch between multiple datasets for AI analysis
          </p>
        </div>
        <Button onClick={fetchImportStats}>
          <Database className="w-4 h-4 mr-2" />
          Refresh Stats
        </Button>
      </div>

      {/* Active Dataset */}
      {activeDataset && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Active Dataset: {activeDataset.name}
            </CardTitle>
            <CardDescription>
              {activeDataset.transactionCount} transactions •{" "}
              {activeDataset.dateRange.totalDays} days of data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Source: {activeDataset.metadata.source} • Format:{" "}
                {activeDataset.metadata.format.toUpperCase()}
              </div>
              <Badge variant={activeDataset.isActive ? "default" : "secondary"}>
                {activeDataset.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dataset Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload & Generate */}
        <Card>
          <CardHeader>
            <CardTitle>Add Data</CardTitle>
            <CardDescription>
              Upload Excel/CSV files or generate sample data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file-upload">Upload Excel or CSV File</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={isImporting}
                className="cursor-pointer"
              />
              {selectedFile && (
                <div className="text-sm text-muted-foreground mt-2">
                  Selected: {selectedFile.name} (
                  {(selectedFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            <Button
              onClick={uploadFile}
              disabled={!selectedFile || isImporting}
              className="w-full"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-r-2 border-t-2 border-l-2 border-blue-600 mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Dataset
                </>
              )}
            </Button>

            <div className="text-sm text-muted-foreground">
              Supports Excel (.xlsx, .xls) and CSV files with headers: Date,
              Type, Category, Amount, Description, Account
            </div>

            {/* Sample Data Generation */}
            <div className="space-y-2">
              <Button
                onClick={generateSampleData}
                disabled={isGenerating}
                variant="outline"
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-r-2 border-t-2 border-l-2 border-blue-600 mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Generate Sample Data
                  </>
                )}
              </Button>
              <div className="text-sm text-muted-foreground">
                Generate 12 months of realistic Ghanaian financial data with
                seasonal patterns
              </div>
            </div>

            {/* Import Options */}
            <div className="space-y-3">
              <Label>Import Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="skip-duplicates"
                    checked={importOptions.skipDuplicates}
                    onCheckedChange={(checked) =>
                      setImportOptions((prev) => ({
                        ...prev,
                        skipDuplicates: checked,
                      }))
                    }
                  />
                  <Label htmlFor="skip-duplicates">
                    Skip duplicate transactions
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="create-accounts"
                    checked={importOptions.createMissingAccounts}
                    onCheckedChange={(checked) =>
                      setImportOptions((prev) => ({
                        ...prev,
                        createMissingAccounts: checked,
                      }))
                    }
                  />
                  <Label htmlFor="create-accounts">
                    Create missing accounts automatically
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dataset List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Your Datasets
            </CardTitle>
            <CardDescription>
              Manage and switch between different datasets for analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {datasets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No datasets uploaded yet</p>
                <p className="text-sm">
                  Upload your first dataset to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {datasets.map((dataset) => (
                  <div
                    key={dataset._id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      dataset.isActive
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => activateDataset(dataset._id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{dataset.name}</h4>
                        {dataset.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {dataset.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <Badge variant="outline">
                            {dataset.transactionCount} transactions
                          </Badge>
                          <Badge variant="outline">
                            {dataset.dateRange.totalDays} days
                          </Badge>
                          <Badge
                            variant={
                              dataset.metadata?.source === "upload"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {dataset.metadata?.source || "unknown"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {dataset.isActive && (
                          <Badge className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteDataset(dataset._id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Template Downloads */}
      <div className="w-full flex justify-center items-center xgrid-cols-1 xmd:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Download Templates
            </CardTitle>
            <CardDescription>
              Get started with pre-formatted Excel and CSV templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center xgrid-cols-1 xmd:grid-cols-2 gap-4">
              <Button
                onClick={() => downloadTemplate("csv")}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
              >
                <FileText className="w-6 h-6 mb-2" />
                Download CSV Template
                <span className="text-xs text-muted-foreground">
                  .csv format
                </span>
              </Button>
            </div>
            <div className="text-sm text-muted-foreground mt-4">
              Templates include sample data with proper headers for ChronoBank
              import
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.imported > 0 ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-lg font-semibold">{importResult.total}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Imported</p>
                  <p className="text-lg font-semibold text-green-600">
                    {importResult.imported}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Skipped</p>
                  <p className="text-lg font-semibold text-orange-600">
                    {importResult.skipped}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Errors</p>
                  <p className="text-lg font-semibold text-red-600">
                    {importResult.errors.length}
                  </p>
                </div>
              </div>

              {importResult.dataset && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">Dataset Created</h4>
                  <div className="text-sm">
                    <p>
                      <strong>Name:</strong> {importResult.dataset.name}
                    </p>
                    <p>
                      <strong>Transactions:</strong>{" "}
                      {importResult.dataset.transactionCount}
                    </p>
                    <p>
                      <strong>Date Range:</strong>{" "}
                      {new Date(
                        importResult.dataset.dateRange.start,
                      ).toLocaleDateString()}{" "}
                      -{" "}
                      {new Date(
                        importResult.dataset.dateRange.end,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div>
                      <p className="font-medium mb-2">Import Errors:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {importResult.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>
                            ... and {importResult.errors.length - 5} more errors
                          </li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Data Status */}
      {importStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Current Data Status
            </CardTitle>
            <CardDescription>
              Overview of your current transaction data across all datasets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Transactions
                </p>
                <p className="text-2xl font-bold">
                  {importStats.statistics.totalTransactions}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Range</p>
                <p className="text-lg font-semibold">
                  {importStats.statistics.dataRange.totalDays} days
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Quality</p>
                <p
                  className={`text-lg font-semibold ${getDataQualityColor(importStats.statistics.hasEnoughData)}`}
                >
                  {importStats.statistics.hasEnoughData ? "Good" : "Needs More"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Historical Data</p>
                <p
                  className={`text-lg font-semibold ${getDataQualityColor(importStats.statistics.hasHistoricalData)}`}
                >
                  {importStats.statistics.hasHistoricalData
                    ? "Available"
                    : "Limited"}
                </p>
              </div>
            </div>

            {importStats.recommendations.needsMoreData && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>
                      <strong>Recommendations:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {importStats.recommendations.needsMoreData && (
                        <li>
                          Need at least{" "}
                          {
                            importStats.recommendations
                              .recommendedMinTransactions
                          }{" "}
                          transactions for accurate AI analysis
                        </li>
                      )}
                      {importStats.recommendations.needsLongerHistory && (
                        <li>
                          Need at least{" "}
                          {importStats.recommendations.recommendedMinDays} days
                          of historical data
                        </li>
                      )}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
