// Path: app/api/budgets/route.ts
// This API route is not part of the core system
export async function GET() {
  return Response.json(
    { message: "This feature is not part of the core system" },
    { status: 404 },
  );
}

export async function POST() {
  return Response.json(
    { message: "This feature is not part of the core system" },
    { status: 404 },
  );
}
