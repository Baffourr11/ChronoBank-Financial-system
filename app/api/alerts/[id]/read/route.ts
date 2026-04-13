// Path: app/api/alerts/[id]/read/route.ts
// This API route is not part of the core system
export async function PUT() {
  return Response.json(
    { message: "This feature is not part of the core system" },
    { status: 404 },
  );
}
