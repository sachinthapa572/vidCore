import { faker } from "@faker-js/faker";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { setupTestDB, teardownTestDB } from "./setup";

const baseUrl = "http://localhost:8080/api/v1/users";
let accessToken: string;
let refreshToken: string;
let userId: string;

const user = {
  username: faker.internet.username().toLowerCase(),
  password: "Password@123",
  email: faker.internet.email().toLowerCase(),
  fullName: faker.person.fullName(),
};

beforeAll(async () => {
  await setupTestDB();
  const formData = new FormData();
  formData.append("username", user.username);
  formData.append("password", user.password);206018
  formData.append("email", user.email);
  formData.append("fullName", user.fullName);

  const res = await fetch(`${baseUrl}/register`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  userId = data.data._id;

  const loginResponse = await fetch(`${baseUrl}/login`, {
    method: "POST",
    body: JSON.stringify({ email: user.email, password: user.password }),
    headers: { "Content-Type": "application/json" },
  });
  const loginData = await loginResponse.json();
  accessToken = loginData.data.accessToken;
  refreshToken = loginData.data.refreshToken;
});

afterAll(async () => {
  await teardownTestDB();
});

describe("User Routes", () => {
  test("POST /refresh-token", async () => {
    const response = await fetch(`${baseUrl}/refresh-token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.data).toHaveProperty("accessToken");
    expect(responseData.data).toHaveProperty("refreshToken");
  });

  test("GET /current-user", async () => {
    const response = await fetch(`${baseUrl}/current-user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.data._id).toBe(userId);
  });

  test("POST /change-password", async () => {
    const newPassword = "NewPassword@123";
    const response = await fetch(`${baseUrl}/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        oldPassword: user.password,
        newPassword: newPassword,
      }),
    });

    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.message).toBe("Password updated successfully");
  });

  test("PATCH /update-account", async () => {
    const newFullName = faker.person.fullName();
    const formData = new FormData();
    formData.append("fullName", newFullName);

    const response = await fetch(`${baseUrl}/update-account`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.data.fullName).toBe(newFullName);
  });

  test("PATCH /update-image", async () => {
    const formData = new FormData();
    const avatarFile = new Blob(["avatar"], { type: "image/png" });
    formData.append("avatar", avatarFile, "avatar.png");

    const response = await fetch(`${baseUrl}/update-image`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.data).toHaveProperty("avatar");
  });

  test("POST /logout", async () => {
    const response = await fetch(`${baseUrl}/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.message).toBe("Logout successful");
  });
});
