export interface ExportTransaction {
  date: string;
  type: string;
  category: string;
  amount: number;
  description?: string;
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function transactionsToCsv(transactions: ExportTransaction[]): string {
  const headers = ["date", "type", "category", "amount", "description"];
  const rows = transactions.map((tx) =>
    [
      new Date(tx.date).toISOString().split("T")[0],
      tx.type,
      tx.category ?? "",
      String(tx.amount ?? 0),
      escapeCsv(tx.description ?? ""),
    ].join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

export function downloadTextFile(
  content: string,
  filename: string,
  mime = "text/csv;charset=utf-8",
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadDatasetTransactionsCsv(
  datasetId: string,
  datasetName?: string,
): Promise<number> {
  const res = await fetch(
    `/api/transactions?limit=5000&datasetId=${encodeURIComponent(datasetId)}`,
  );
  if (!res.ok) {
    throw new Error("Failed to fetch transactions for export");
  }

  const json = await res.json();
  const transactions: ExportTransaction[] = json.data?.transactions ?? [];

  if (transactions.length === 0) {
    throw new Error("No transactions in this dataset to export");
  }

  const safeName = (datasetName || "dataset")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .toLowerCase();
  const csv = transactionsToCsv(transactions);
  downloadTextFile(csv, `${safeName}-transactions.csv`);

  return transactions.length;
}
