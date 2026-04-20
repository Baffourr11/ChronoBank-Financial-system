import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api";
import { Dataset, Transaction } from "@/lib/models";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    await connectToDatabase();

    const datasetId = params.id;
    const body = await request.json();
    const { isActive } = body;

    // Update dataset active status
    const dataset = await Dataset.findOne({ _id: datasetId, userId: user.userId });
    if (!dataset) {
      return apiError("Dataset not found", 404);
    }

    // Deactivate all other datasets if activating this one
    if (isActive) {
      await Dataset.updateMany(
        { userId: user.userId, _id: { $ne: datasetId } },
        { isActive: false }
      );
    }

    // Update the selected dataset
    dataset.isActive = isActive;
    await dataset.save();

    return apiSuccess({
      id: dataset._id.toString(),
      name: dataset.name,
      isActive: dataset.isActive,
      message: isActive ? "Dataset activated for analysis" : "Dataset deactivated"
    });
  } catch (error) {
    console.error("Update dataset error:", error);
    return apiError("Failed to update dataset", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    await connectToDatabase();

    const datasetId = params.id;
    const dataset = await Dataset.findOne({ _id: datasetId, userId: user.userId });
    if (!dataset) {
      return apiError("Dataset not found", 404);
    }

    // Delete associated transactions
    await Transaction.deleteMany({ userId: user.userId, 'metadata.datasetId': datasetId });

    // Delete the dataset
    await Dataset.findByIdAndDelete(datasetId);

    return apiSuccess({
      message: "Dataset and associated transactions deleted successfully"
    });
  } catch (error) {
    console.error("Delete dataset error:", error);
    return apiError("Failed to delete dataset", 500);
  }
}
