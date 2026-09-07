export default function handler() {
  return Response.json({ ok: true, ping: 'pong', node: process.version });
}
