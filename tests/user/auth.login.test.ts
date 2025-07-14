import { afterAll, beforeAll, expect, test } from 'bun:test';
import { setupTestDB, teardownTestDB } from '../setup';

const loginUrl = 'http://localhost:8080/api/v1/users/login';
const signupUrl = 'http://localhost:8080/api/v1/users/register';

beforeAll(async () => {
    await setupTestDB();
    // Ensure user exists for login tests
    const formData = new FormData();
    formData.append('username', 'loginuser');
    formData.append('password', 'Login@1234');
    formData.append('email', 'login@example.com');
    formData.append('fullName', 'Login User');

    await fetch(signupUrl, {
        method: 'POST',
        body: formData,
    });
});

afterAll(async () => {
    await teardownTestDB();
});

test('login with valid credentials succeeds', async () => {
    const response = await fetch(loginUrl, {
        method: 'POST',
        body: JSON.stringify({
            email: 'login@example.com',
            password: 'Login@1234',
        }),
        headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
});

test('login with invalid credentials fails', async () => {
    const response = await fetch(loginUrl, {
        method: 'POST',
        body: JSON.stringify({
            email: 'login@example.com',
            password: 'WrongPassword',
        }),
        headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status).not.toBe(200);
    const data = await response.json();
    expect(data.success).toBe(false);
});

test('login with non-existent user fails', async () => {
    const response = await fetch(loginUrl, {
        method: 'POST',
        body: JSON.stringify({
            email: 'nouser@example.com',
            password: 'AnyPassword',
        }),
        headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status).not.toBe(200);
    const data = await response.json();
    expect(data.success).toBe(false);
});
