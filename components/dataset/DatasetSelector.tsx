"use client";

import { useDataset, Dataset } from "@/lib/contexts/DatasetContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, ChevronDown, Check, FileText, Calendar, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

interface DatasetSelectorProps {
  onDatasetChange?: (dataset: Dataset) => void;
  showDetails?: boolean;
}

export function DatasetSelector({ onDatasetChange, showDetails = true }: DatasetSelectorProps) {
  const { selectedDataset, datasets, loading, selectDataset } = useDataset();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (datasets.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="text-center">
            <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Datasets Available</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your first dataset to start analyzing your financial data
            </p>
            <Button asChild>
              <a href="/data/import">Upload Dataset</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!selectedDataset) {
    return (
      <Card className="border-dashed border-yellow-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Select a Dataset
          </CardTitle>
          <CardDescription>
            Choose a dataset to analyze from your uploaded datasets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasets.map((dataset) => (
              <Card
                key={dataset._id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => {
                  selectDataset(dataset);
                  onDatasetChange?.(dataset);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {dataset.metadata.source === "upload" ? (
                        <Upload className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{dataset.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {dataset.transactionCount} transactions
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          {dataset.dateRange.totalDays} days
                        </Badge>
                        {dataset.isActive && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Analyzing Dataset</CardTitle>
          </div>
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Change Dataset
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              {datasets.map((dataset) => (
                <DropdownMenuItem
                  key={dataset._id}
                  className="cursor-pointer"
                  onClick={() => {
                    selectDataset(dataset);
                    onDatasetChange?.(dataset);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-1.5 bg-primary/10 rounded">
                      {dataset.metadata.source === "upload" ? (
                        <Upload className="w-3.5 h-3.5" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{dataset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {dataset.transactionCount} transactions • {dataset.dateRange.totalDays} days
                      </p>
                    </div>
                    {selectedDataset._id === dataset._id && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription>
          {selectedDataset.name}
        </CardDescription>
      </CardHeader>
      {showDetails && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span>{selectedDataset.transactionCount} transactions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{selectedDataset.dateRange.totalDays} days</span>
            </div>
            {selectedDataset.isActive && (
              <Badge className="bg-green-100 text-green-800 text-xs">
                Active
              </Badge>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
