import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
 
export function useChildStudent() {
    const { user } = useAuth();
    const [child, setChild] = useState(null);
    const [parentId, setParentId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
 
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        fetchChildStudent();
    }, [user]);
 
    const fetchChildStudent = async () => {
        setLoading(true);
        setError(null);
        try {
            // Step 1 — get parent profile from logged-in user
            const parentRes = await axios.get('/api/v1/parents/me');
            const parent = parentRes.data.data;
            setParentId(parent._id);
 
            // Step 2 — get linked students for this parent
            const linkedRes = await axios.get(`/api/v1/parents/${parent._id}/students`);
            const links = linkedRes.data.data;
 
            if (links.length === 0) {
                setChild(null);
                return;
            }
 
            // Take the first linked student (most parents have one child)
            // studentId is populated from the StudentParent join
            const studentData = links[0].studentId;
            setChild(studentData);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load child data');
            setChild(null);
        } finally {
            setLoading(false);
        }
    };
 
    return { child, parentId, loading, error, refetch: fetchChildStudent };
}