import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.CLIENT_ORIGINS = "http://localhost:5173";
process.env.JWT_SECRET_KEY = "test-only-secret-that-is-at-least-32-characters";

const { createApp } = await import("../src/app.js");
const app = createApp();

test("health endpoint responds without authentication", async () => {
  const response = await request(app).get("/api/health").expect(200);
  assert.equal(response.body.status, "ok");
  assert.ok(response.headers["x-content-type-options"]);
});

test("unknown API routes return a JSON 404", async () => {
  const response = await request(app).get("/api/missing").expect(404);
  assert.match(response.body.message, /Route not found/);
});

test("protected endpoints reject a missing session", async () => {
  const response = await request(app).get("/api/users/friends").expect(401);
  assert.match(response.body.message, /No Token/);
});

test("signup validation rejects a weak password before database access", async () => {
  const response = await request(app)
    .post("/api/auth/signup")
    .set("Origin", "http://localhost:5173")
    .send({
      fullName: "Test Person",
      email: "person@example.com",
      password: "weak",
    })
    .expect(400);
  assert.match(response.body.message, /8-128 characters/);
});

test("unsafe requests from untrusted browser origins are rejected", async () => {
  const response = await request(app)
    .post("/api/auth/logout")
    .set("Origin", "https://untrusted.example")
    .expect(403);
  assert.match(response.body.message, /Origin/);
});

test("malformed JSON returns a safe client error", async () => {
  const response = await request(app)
    .post("/api/auth/login")
    .set("Origin", "http://localhost:5173")
    .set("Content-Type", "application/json")
    .send('{"email":')
    .expect(400);
  assert.equal(response.body.message, "Request body contains invalid JSON");
});

test("invalid session cookies are rejected without exposing token details", async () => {
  const response = await request(app)
    .get("/api/users/friends")
    .set("Cookie", "jwt=not-a-valid-token")
    .expect(401);
  assert.match(response.body.message, /session has expired/i);
});
