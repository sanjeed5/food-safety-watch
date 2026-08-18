import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../src";

async function request(path: string, init?: RequestInit<IncomingRequestCfProperties>) {
  const context = createExecutionContext();
  const response = await worker.fetch(
    new Request<unknown, IncomingRequestCfProperties>(`https://example.com${path}`, init),
    env,
  );
  await waitOnExecutionContext(context);
  return response;
}

describe("Food Safety Watch worker", () => {
  it("returns service health", async () => {
    const response = await request("/api/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", service: "food-safety-watch" });
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("returns JSON for unknown API routes", async () => {
    const response = await request("/api/unknown");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });

  it("rejects writes to the public inspections endpoint", async () => {
    const response = await request("/api/inspections", { method: "POST" });
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
  });
});
