// Healthcheck do contêiner (deploy/docker-compose.vps.yml).
export function GET() {
  return Response.json({ ok: true });
}
