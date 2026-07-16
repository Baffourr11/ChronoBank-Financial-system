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
    importedAt?: string;
  };
}

interface DatasetContextType {
  selectedDataset: Dataset | null;
  datasets: Dataset[];
  loading: boolean;
  selectDataset: (dataset: Dataset) => void;
  clearSelection: () => void;
  refreshDatasets: (preferDatasetId?: string) => Promise<void>;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDatasets = async (preferDatasetId?: string) => {
    try {
      const response = await fetch("/api/datasets");
      if (response.ok) {
        const result = await response.json();
        const datasetsArray = result.data?.datasets || result.data || [];
        setDatasets(datasetsArray);

        if (datasetsArray.length === 0) {
          setSelectedDataset(null);
          return;
        }

        if (preferDatasetId) {
          const preferred = datasetsArray.find(
            (d: Dataset) => d._id === preferDatasetId,
          );
          if (preferred) {
            setSelectedDataset(preferred);
            return;
          }
        }

        setSelectedDataset((current) => {
          if (current) {
            const stillExists = datasetsArray.find(
              (d: Dataset) => d._id === current._id,
            );
            if (stillExists) return stillExists;
          }
          const active = datasetsArray.find((d: Dataset) => d.isActive);
          return active ?? datasetsArray[0];
        });
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

  const refreshDatasets = async (preferDatasetId?: string) => {
    setLoading(true);
    await fetchDatasets(preferDatasetId);
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
