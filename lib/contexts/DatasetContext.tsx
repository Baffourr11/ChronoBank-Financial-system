// Path: lib/contexts/DatasetContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

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
  };
}

interface DatasetContextType {
  selectedDataset: Dataset | null;
  datasets: Dataset[];
  loading: boolean;
  selectDataset: (dataset: Dataset) => void;
  clearSelection: () => void;
  refreshDatasets: () => Promise<void>;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDatasets = async () => {
    try {
      const response = await fetch("/api/datasets");
      if (response.ok) {
        const result = await response.json();
        console.log("Dataset API response:", result);
        // API returns { success: true, data: { datasets: [...] } }
        const datasetsArray = result.data?.datasets || result.data || [];
        console.log("Extracted datasets:", datasetsArray);
        setDatasets(datasetsArray);

        // If no dataset selected, auto-select the active one
        if (!selectedDataset && datasetsArray.length > 0) {
          const active = datasetsArray.find((d: Dataset) => d.isActive);
          if (active) {
            setSelectedDataset(active);
          } else {
            // If no active dataset, select the first one
            setSelectedDataset(datasetsArray[0]);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch datasets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const selectDataset = (dataset: Dataset) => {
    setSelectedDataset(dataset);
  };

  const clearSelection = () => {
    setSelectedDataset(null);
  };

  const refreshDatasets = async () => {
    setLoading(true);
    await fetchDatasets();
  };

  return (
    <DatasetContext.Provider
      value={{
        selectedDataset,
        datasets,
        loading,
        selectDataset,
        clearSelection,
        refreshDatasets,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
}

export function useDataset() {
  const context = useContext(DatasetContext);
  if (context === undefined) {
    throw new Error("useDataset must be used within a DatasetProvider");
  }
  return context;
}

export type { Dataset };
