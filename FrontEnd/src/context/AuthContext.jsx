import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedProfile = localStorage.getItem('profile');
        const token = localStorage.getItem('accessToken');

        if (storedUser && token) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            if (storedProfile) {
                // Restore profile from localStorage immediately
                setProfile(JSON.parse(storedProfile));
                setLoading(false);
            } else {
                // Profile missing from localStorage — re-fetch it
                fetchProfile(parsedUser.role).finally(() => setLoading(false));
            }
        } else {
            setLoading(false);
        }

        // Add response interceptor to handle token expiration
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    // Token expired or invalid, force logout
                    logout(true);
                }
                return Promise.reject(error);
            }
        );

        // Cleanup interceptor on unmount
        return () => {
            axios.interceptors.response.eject(interceptor);
        };
    }, []);

    const fetchProfile = async (role) => {
        try {
            let res;
            if (role === 'TEACHER') {
                res = await axios.get('/api/v1/teachers/me');
            } else if (role === 'STUDENT') {
                res = await axios.get('/api/v1/students/me');
            } else if (role === 'PARENT') {
                res = await axios.get('/api/v1/parents/me');
            } else {
                return null; // ADMIN has no profile
            }
            const profileData = res.data.data;
            setProfile(profileData);
            localStorage.setItem('profile', JSON.stringify(profileData));
            return profileData;
        } catch {
            return null;
        }
    };

    const login = async (email, password, organizationId) => {
        try {
            const res = await axios.post('/api/v1/users/login', { email, password, organizationId });
            const { user, accessToken, refreshToken } = res.data.data;

            setUser(user);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('organizationId', user.organizationId);
            axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

            // Fetch role-specific profile right after login
            await fetchProfile(user.role);

            return { ok: true, role: user.role };
        } catch (error) {
            return {
                ok: false,
                message: error.response?.data?.message || 'Login failed',
            };
        }
    };

    const logout = async (skipApiCall = false) => {
        if (!skipApiCall) {
            try {
                await axios.post('/api/v1/users/logout');
            } catch (_) { }
        }

        setUser(null);
        setProfile(null);
        localStorage.removeItem('user');
        localStorage.removeItem('profile');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('organizationId');
        delete axios.defaults.headers.common['Authorization'];

        if (skipApiCall) {
            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);