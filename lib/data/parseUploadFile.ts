import * as XLSX from "xlsx";

export interface ParsedUploadTransaction {
  date: string;
  type: string;
  category: string;
  amount: number;
  description: string;
  accountName: string;
}

export function parseUploadFile(
  buffer: Buffer,
  fileExtension: string,
): ParsedUploadTransaction[] {
  if (fileExtension === "csv") {
    const text = buffer.toString("utf-8");
    const lines = text.split("\n").filter((line) => line.trim());
    const transactions: ParsedUploadTransaction[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length >= 4) {
        transactions.push({
          date: values[0],
          type: normalizeType(values[1]),
          category: values[2],
          amount: parseFloat(values[3]) || 0,
          description: values[4] || "",
          accountName: values[5] || "Main Account",
        });
      }
    }
    return transactions;
  }

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);

  return (jsonData as Record<string, unknown>[]).map((row) => ({
    date: String(row.Date || row.date || ""),
    type: normalizeType(String(row.Type || row.type || "expense")),
    category: String(row.Category || row.category || ""),
    amount: parseFloat(String(row.Amount || row.amount)) || 0,
    description: String(row.Description || row.description || ""),
    accountName: String(row.Account || row.accountName || "Main Account"),
  }));
}

function normalizeType(value: string): string {
  return value.trim().toLowerCase();
}

export function validateUploadTransaction(tx: {
  date: string;
  type: string;
  category: string;
  amount: number;
}): { valid: boolean; error?: string } {
  if (!tx.date) {
    return { valid: false, error: "Date is required" };
  }

  if (!tx.type || !["income", "expense", "transfer"].includes(tx.type)) {
    return {
      valid: false,
      error: "Type must be 'income', 'expense', or 'transfer'",
    };
  }

  if (!tx.category || tx.category.trim().length === 0) {
    return { valid: false, error: "Category is required" };
  }

  if (!tx.amount || tx.amount <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }

  const date = new Date(tx.date);
  if (isNaN(date.getTime())) {
    return { valid: false, error: "Invalid date format" };
  }

  return { valid: true };
}
