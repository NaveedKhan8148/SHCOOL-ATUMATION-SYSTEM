import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { message } from 'antd';
import { useAuth } from './AuthContext';

const OrganizationContext = createContext(null);

export const OrganizationProvider = ({ children }) => {
    const { user } = useAuth();
    const [organization, setOrganization] = useState(null);
    const [organizationName, setOrganizationName] = useState(() => {
        return localStorage.getItem('organizationName') || '';
    });
    const [isConfigured, setIsConfigured] = useState(() => {
        return !!localStorage.getItem('organizationName');
    });
    const [loading, setLoading] = useState(true);

    const fetchOrganization = useCallback(async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const res = await axios.get('/api/v1/organizations/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data?.data;
            if (data) {
                setOrganization(data);
                const name = (data.name || '').trim();
                setOrganizationName(name);
                setIsConfigured(!!name);
                if (name) {
                    localStorage.setItem('organizationName', name);
                    localStorage.setItem('organizationData', JSON.stringify(data));
                } else {
                    localStorage.removeItem('organizationName');
                }
            }
        } catch (err) {
            console.error('Failed to fetch organization settings:', err);
            // Fallback to cached organizationName in localStorage if present
            const cachedName = localStorage.getItem('organizationName');
            if (cachedName) {
                setOrganizationName(cachedName);
                setIsConfigured(true);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchOrganization();
        } else {
            setOrganization(null);
            setOrganizationName('');
            setIsConfigured(false);
            setLoading(false);
        }
    }, [user, fetchOrganization]);

    const updateOrganizationName = async (newName) => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            message.error('Authentication token not found');
            return { ok: false, message: 'Not authenticated' };
        }

        const trimmedName = typeof newName === 'string' ? newName.trim() : '';
        if (!trimmedName) {
            message.error('Organization name is required and cannot be empty');
            return { ok: false, message: 'Name cannot be empty' };
        }

        if (trimmedName.length > 150) {
            message.error('Organization name cannot exceed 150 characters');
            return { ok: false, message: 'Name exceeds 150 characters' };
        }

        try {
            const res = await axios.patch(
                '/api/v1/organizations/me',
                { name: trimmedName },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const updatedData = res.data?.data;
            setOrganization(updatedData);
            setOrganizationName(trimmedName);
            setIsConfigured(true);
            localStorage.setItem('organizationName', trimmedName);
            if (updatedData) {
                localStorage.setItem('organizationData', JSON.stringify(updatedData));
            }

            message.success('Organization name saved successfully!');
            return { ok: true, data: updatedData };
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to update organization name';
            message.error(msg);
            return { ok: false, message: msg };
        }
    };

    return (
        <OrganizationContext.Provider
            value={{
                organization,
                organizationName,
                isConfigured,
                loading,
                fetchOrganization,
                updateOrganizationName
            }}
        >
            {children}
        </OrganizationContext.Provider>
    );
};

export const useOrganization = () => {
    const context = useContext(OrganizationContext);
    if (!context) {
        // Fallback object to avoid crashes if accessed outside Provider
        const cachedName = typeof window !== 'undefined' ? localStorage.getItem('organizationName') || '' : '';
        return {
            organization: null,
            organizationName: cachedName,
            isConfigured: !!cachedName,
            loading: false,
            fetchOrganization: async () => {},
            updateOrganizationName: async () => ({ ok: false })
        };
    }
    return context;
};
