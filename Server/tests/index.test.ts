import axios, { type AxiosResponse } from 'axios';
import { Buffer } from 'buffer';
import dotenv from 'dotenv';
dotenv.config();

const baseUrl = process.env.Backend_url;
const getAxiosResponse = (error: unknown): AxiosResponse | undefined =>
    axios.isAxiosError(error) ? error.response : undefined;

describe("Authentication", () => {
    test("User should be able to sign up only once", async () => {
        const username = `raghav${Math.random()}`;
        const password = "Raghav@123";

        const response = await axios.post(`${baseUrl}/api/auth/signup`, {
            username,
            password,
            type: "admin"
        });

        expect([200, 201]).toContain(response.status);

        let duplicateResponse;
        try {
            await axios.post(`${baseUrl}/api/auth/signup`, {
                username,
                password,
                type: "admin"
            });
        } catch (error) {
            duplicateResponse = getAxiosResponse(error);
        }

        expect(duplicateResponse?.status).toBe(400);
    });

    test("User signup request fails if username or password is missing", async () => {
        const password = "Raghav@123";
        let response;

        try {
            await axios.post(`${baseUrl}/api/auth/signup`, {
                password,
            });
        } catch (error) {
            response = getAxiosResponse(error);
        }

        expect(response?.status).toBe(400);
    });

    test("Login succeeds with correct credentials and returns user id", async () => {
        const username = `raghav${Math.random()}`;
        const password = "Raghav@123";
        let response = await axios.post(`${baseUrl}/api/auth/signup`, {
            username,
            password,
        });
        expect([200, 201]).toContain(response.status);
        response = await axios.post(`${baseUrl}/api/auth/login`, {
            username,
            password
        });
        expect(response.status).toBe(200);
        expect(response.data.token).toBeDefined();
        expect(response.data.user).toBeDefined();
        expect(response.data.user.email).toBe(username);
    });

    test("Login fails with incorrect password", async () => {
        const username = `raghav${Math.random()}`;
        const password = "Raghav@123";
        let response = await axios.post(`${baseUrl}/api/auth/signup`, {
            username,
            password,
        });
        expect([200, 201]).toContain(response.status);
        try {
            response = await axios.post(`${baseUrl}/api/auth/login`, {
                username,
                password: "wrongpassword"
            });
        } catch (error) {
            response = getAxiosResponse(error) as AxiosResponse;
        }
        expect(response?.status).toBe(401);
    });


});

describe("User information endpoints", () => {
    let token = "";
    let avatarId = "";

    beforeAll(async () => {
        const username = `raghav${Math.random()}`;
        const password = "Raghav@123";
        await axios.post(`${baseUrl}/api/auth/signup`, {
            username,
            password, 
            type: "admin"
        });
        const response = await axios.post(`${baseUrl}/api/auth/login`, {
            username,
            password
        });
        token = response.data.token;

        const avatarResponse = await axios.post(`${baseUrl}/api/avatar/generate`, {
            "imageUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmM3RFDZM2lteuCMfYX_AROjt-AzUwDBROFWM&s",
            "name": "Timmy"
        });
        avatarId = avatarResponse.data.avatarId;
    });

    test("User can't update their metadata with wrong id", async () => {
        let response;

        try {
            await axios.post(`${baseUrl}/api/user/metadata`, {
                avatarId: "123123123"
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
        } catch (error) {
            response = getAxiosResponse(error);
        }

        expect(response?.status).toBe(400);
    });

    test("User can update their metadata with correct id", async () => {
        const response = await axios.post(`${baseUrl}/api/user/metadata`, {
            avatarId
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        expect(response.status).toBe(200);
    });

    test("User is not able to update the metadata without token", async () => {
        let response;
        try {
            await axios.post(`${baseUrl}/api/user/metadata`, {
                avatarId
            });
        } catch (error) {
            response = getAxiosResponse(error) as AxiosResponse;
        }
        expect(response?.status).toBe(401);
    });
});

describe("Avatar catalog endpoints", () => {
    let token = "";
    let userId = "";
    let avatarId = "";

    beforeAll(async () => {
        const username = `raghav${Math.random()}`;
        const password = "Raghav@123";

        const signupResponse = await axios.post(`${baseUrl}/api/auth/signup`, {
            username,
            password,
        });
        expect([200, 201]).toContain(signupResponse.status);

        const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
            username,
            password,
        });
        expect(loginResponse.status).toBe(200);

        token = loginResponse.data.token;

        const payload = (() => {
            if (!token) {
                return {};
            }
            const parts = token.split(".");
            if (parts.length < 2) {
                return {};
            }
            try {
                const decoded = Buffer.from(parts[1], "base64").toString("utf8");
                return JSON.parse(decoded);
            } catch (error) {
                return {};
            }
        })();

        userId = payload.id || payload.userId || payload._id || "";

        const avatarsResponse = await axios.get(`${baseUrl}/api/v1/avatars`);
        expect(avatarsResponse.status).toBe(200);
        expect(Array.isArray(avatarsResponse.data.avatars)).toBe(true);
        expect(avatarsResponse.data.avatars.length).toBeGreaterThan(0);

        avatarId = avatarsResponse.data.avatars[0].id;

        await axios.post(`${baseUrl}/api/user/metadata`, {
            avatarId,
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    });

    test("lists available avatars", async () => {
        const response = await axios.get(`${baseUrl}/api/v1/avatars`);
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data.avatars)).toBe(true);
        expect(response.data.avatars.length).toBeGreaterThan(0);

        const avatar = response.data.avatars[0];
        expect(avatar).toHaveProperty("id");
        expect(avatar).toHaveProperty("imageUrl");
        expect(avatar).toHaveProperty("name");
    });

    test("returns metadata for requested user ids", async () => {
        expect(userId).toBeTruthy();

        const response = await axios.get(`${baseUrl}/api/v1/user/metadata/bulk`, {
            params: {
                ids: JSON.stringify([userId])
            },
        });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data.avatars)).toBe(true);

        const currentUserMeta = response.data.avatars.find(
            (entry: { userId: string }) => String(entry.userId) === String(userId)
        );

        expect(currentUserMeta).toBeDefined();
        expect(currentUserMeta).toHaveProperty("imageUrl");
    });
});
