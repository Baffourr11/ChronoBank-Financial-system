import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/helpers";
import { apiSuccess, apiError } from "@/lib/api";
import { repairDatasetAccounts } from "@/lib/data/repairDatasetAccounts";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { id: datasetId } = await params;
    const body = await request.json();
    const { isActive } = body;

    const { data: dataset, error: findError } = await supabase
      .from("datasets")
      .select("*")
      .eq("id", datasetId)
      .eq("user_id", user.userId)
      .maybeSingle();

    if (findError || !dataset) {
      return apiError("Dataset not found", 404);
    }

    if (isActive) {
      await supabase
        .from("datasets")
        .update({ is_active: false })
        .eq("user_id", user.userId)
        .neq("id", datasetId);
    }

    const { data: updated, error: updateError } = await supabase
      .from("datasets")
      .update({ is_active: isActive })
      .eq("id", datasetId)
      .select("*")
      .single();

    if (updateError || !updated) {
      throw updateError;
    }

    if (isActive) {
      await repairDatasetAccounts(supabase, user.userId, datasetId);
    }

    return apiSuccess({
      id: updated.id,
      name: updated.name,
      isActive: updated.is_active,
      message: isActive
        ? "Dataset activated for analysis"
        : "Dataset deactivated",
    });
  } catch (error) {
    console.error("Update dataset error:", error);
    return apiError("Failed to update dataset", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { id: datasetId } = await params;

    const { data: dataset, error: findError } = await supabase
      .from("datasets")
      .select("id")
      .eq("id", datasetId)
      .eq("user_id", user.userId)
      .maybeSingle();

    if (findError || !dataset) {
      return apiError("Dataset not found", 404);
    }

    await supabase
      .from("transactions")
      .delete()
      .eq("user_id", user.userId)
      .eq("dataset_id", datasetId);

    await supabase.from("datasets").delete().eq("id", datasetId);

    return apiSuccess({
      message: "Dataset and associated transactions deleted successfully",
    });
  } catch (error) {
    console.error("Delete dataset error:", error);
    return apiError("Failed to delete dataset", 500);
  }
}
