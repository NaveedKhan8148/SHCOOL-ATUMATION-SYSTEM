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

    // Derived convenience getters from the full organization object
    const orgEmail = organization?.email || '';
    const orgPhoneNumbers = organization?.phoneNumbers || (organization?.phone ? [organization.phone] : []);
    const orgAddress = organization?.address || '';

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
            const cachedName = localStorage.getItem('organizationName');
            if (cachedName) {
                setOrganizationName(cachedName);
                setIsConfigured(true);
            }
            try {
                const cached = localStorage.getItem('organizationData');
                if (cached) setOrganization(JSON.parse(cached));
            } catch (_) { /* ignore parse errors */ }
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

    // Update just the organization name (kept for backward compatibility)
    const updateOrganizationName = async (newName) => {
        return updateOrganization({ name: newName });
    };

    // Update any/all organization fields: name, email, phoneNumbers, address
    const updateOrganization = async (fields = {}) => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            message.error('Authentication token not found');
            return { ok: false, message: 'Not authenticated' };
        }

        if (fields.name !== undefined) {
            const trimmedName = typeof fields.name === 'string' ? fields.name.trim() : '';
            if (!trimmedName) {
                message.error('Organization name is required and cannot be empty');
                return { ok: false, message: 'Name cannot be empty' };
            }
            if (trimmedName.length > 150) {
                message.error('Organization name cannot exceed 150 characters');
                return { ok: false, message: 'Name exceeds 150 characters' };
            }
            fields.name = trimmedName;
        }

        try {
            const res = await axios.patch(
                '/api/v1/organizations/me',
                fields,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const updatedData = res.data?.data;
            setOrganization(updatedData);
            const updatedName = (updatedData?.name || fields.name || organizationName || '').trim();
            setOrganizationName(updatedName);
            setIsConfigured(true);
            if (updatedName) localStorage.setItem('organizationName', updatedName);
            if (updatedData) localStorage.setItem('organizationData', JSON.stringify(updatedData));

            message.success('Organization settings saved successfully!');
            return { ok: true, data: updatedData };
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to update organization settings';
            message.error(msg);
            return { ok: false, message: msg };
        }
    };

    return (
        <OrganizationContext.Provider
            value={{
                organization,
                organizationName,
                orgEmail,
                orgPhoneNumbers,
                orgAddress,
                isConfigured,
                loading,
                fetchOrganization,
                updateOrganizationName,
                updateOrganization
            }}
        >
            {children}
        </OrganizationContext.Provider>
    );
};

export const useOrganization = () => {
    const context = useContext(OrganizationContext);
    if (!context) {
        const cachedName = typeof window !== 'undefined' ? localStorage.getItem('organizationName') || '' : '';
        let cachedOrg = null;
        try {
            const raw = typeof window !== 'undefined' ? localStorage.getItem('organizationData') : null;
            if (raw) cachedOrg = JSON.parse(raw);
        } catch (_) { /* ignore */ }
        return {
            organization: cachedOrg,
            organizationName: cachedName,
            orgEmail: cachedOrg?.email || '',
            orgPhoneNumbers: cachedOrg?.phoneNumbers || [],
            orgAddress: cachedOrg?.address || '',
            isConfigured: !!cachedName,
            loading: false,
            fetchOrganization: async () => {},
            updateOrganizationName: async () => ({ ok: false }),
            updateOrganization: async () => ({ ok: false })
        };
    }
    return context;
};
