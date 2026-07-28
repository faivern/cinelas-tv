// api endpoints for auth: profiles, login, current user, logout
import { api } from "./http/axios";
import type { User, Profile } from "../types/user";
import { ME_URL, LOGOUT_URL, PROFILES_URL, LOGIN_URL } from "../lib/config";

export async function getUserCredentials(): Promise<User | null> {
    try {
        const response = await api.get<User>(ME_URL);
        return response.data;
    } catch {
        // Any error (401, network error, redirect) means not authenticated
        return null;
    }
}

export async function getProfiles(): Promise<Profile[]> {
    const response = await api.get<Profile[]>(PROFILES_URL);
    return response.data;
}

export async function createProfile(
    name: string,
    avatarUrl?: string | null
): Promise<Profile> {
    const response = await api.post<Profile>(PROFILES_URL, { name, avatarUrl });
    return response.data;
}

export async function renameProfile(
    id: string,
    name: string,
    avatarUrl?: string | null
): Promise<Profile> {
    const response = await api.patch<Profile>(`${PROFILES_URL}/${id}`, {
        name,
        avatarUrl,
    });
    return response.data;
}

export async function loginProfile(profileId: string): Promise<User> {
    const response = await api.post<User>(LOGIN_URL, { profileId });
    return response.data;
}

export async function postLogoutUser(): Promise<void> {
    await api.post<void>(LOGOUT_URL);
}
