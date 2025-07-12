import { faker } from '@faker-js/faker';
import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import mongoose from "mongoose";
import { setupTestDB, teardownTestDB } from "./setup";

const signupUrl = 'http://localhost:8080/api/v1/users/register';

beforeAll(async () => {
    await setupTestDB();
});

afterAll(async () => {
    await teardownTestDB();
});

beforeEach(async () => {
  // Clear all collections before each test
  for (const collection of Object.values(mongoose.connection.collections)) {
    await collection.deleteMany({});
  }
});

test("signup with valid data succeeds", async () => {
    const formData = new FormData();
    formData.append("username", faker.person.firstName());
    formData.append("password", faker.internet.password({ length: 12, memorable: false }));
    formData.append("email", faker.internet.email());
    formData.append("fullName", faker.person.fullName());

    const response = await fetch(signupUrl, {
        method: "POST",
        body: formData,
    });
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
});

test("signup with duplicate email fails", async () => {
    const duplicateEmail = faker.internet.email();

    const formData1 = new FormData();
    formData1.append("username", faker.person.firstName());
    formData1.append("password", faker.internet.password({ length: 12, memorable: false }));
    formData1.append("email", duplicateEmail);

    await fetch(signupUrl, {
        method: "POST",
        body: formData1,
    });

    const formData2 = new FormData();
    formData2.append("username", faker.person.firstName());
    formData2.append("password", faker.internet.password({ length: 12, memorable: false }));
    formData2.append("email", duplicateEmail);

    const response = await fetch(signupUrl, {
        method: "POST",
        body: formData2,
    });
    expect(response.status).not.toBe(201);
    const data = await response.json();
    expect(data.success).toBe(false);
});

test("signup with missing email fails", async () => {
    const formData = new FormData();
    formData.append("username", faker.person.firstName());
    formData.append("password", faker.internet.password({ length: 12, memorable: false }));

    const response = await fetch(signupUrl, {
        method: "POST",
        body: formData,
    });
    expect(response.status).not.toBe(201);
    const data = await response.json();
    expect(data.success).toBe(false);
});

test("signup with invalid email format fails", async () => {
    const formData = new FormData();
    formData.append("username", faker.person.firstName());
    formData.append("password", faker.internet.password({ length: 12, memorable: false }));
    formData.append("email", "not-an-email");

    const response = await fetch(signupUrl, {
        method: "POST",
        body: formData,
    });
    expect(response.status).not.toBe(201);
    const data = await response.json();
    expect(data.success).toBe(false);
});

test("signup with no valid data fails", async () => {
    const response = await fetch(signupUrl, {
        method: "POST",
        body: JSON.stringify({}), // No valid data
        headers: { "Content-Type": "application/json" },
    });
    expect(response.status).not.toBe(201);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(typeof data.message).toBe("object");
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("path");
    expect(data).toHaveProperty("method");
});


