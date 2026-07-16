import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/helpers";
import { apiSuccess, apiError } from "@/lib/api";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "excel";

    if (format === "excel") {
      const templateData = [
        {
          Date: "2026-01-15",
          Type: "income",
          Category: "Salary",
          Amount: 3000,
          Description: "Monthly salary",
          Account: "Main Account",
        },
        {
          Date: "2026-01-16",
          Type: "expense",
          Category: "Food",
          Amount: 150,
          Description: "Grocery shopping",
          Account: "Main Account",
        },
        {
          Date: "2026-01-17",
          Type: "expense",
          Category: "Transportation",
          Amount: 50,
          Description: "Transport fare",
          Account: "Main Account",
        },
        {
          Date: "2026-02-15",
          Type: "income",
          Category: "Salary",
          Amount: 3200,
          Description: "Monthly salary with bonus",
          Account: "Main Account",
        },
        {
          Date: "2026-02-20",
          Type: "expense",
          Category: "Utilities",
          Amount: 200,
          Description: "Electricity bill",
          Account: "Main Account",
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      return new Response(excelBuffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="chronobank-template.xlsx"',
        },
      });
    }

    if (format === "csv") {
      const csvTemplate = `Date,Type,Category,Amount,Description,Account
2026-01-15,income,Salary,3000,Monthly salary,Main Account
2026-01-16,expense,Food,150,Grocery shopping,Main Account
2026-01-17,expense,Transportation,50,Transport fare,Main Account
2026-02-15,income,Salary,3200,Monthly salary with bonus,Main Account
2026-02-20,expense,Utilities,200,Electricity bill,Main Account`;

      return new Response(csvTemplate, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="chronobank-template.csv"',
        },
      });
    }

    return apiError("Unsupported format. Use 'excel' or 'csv'", 400);
  } catch (error) {
    console.error("Template download error:", error);
    return apiError("Failed to generate template", 500);
  }
}
