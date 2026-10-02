import api from './api';

export const teacherService = {
    getAllTeachers: async () => {
        try {
            const response = await api.get('/teachers/');
            console.log('Raw API Response:', response);
            
            // Handle your API response structure: { statusCode, data, message, success }
            if (response.data && response.data.success && Array.isArray(response.data.data)) {
                return response.data.data; // Return the data array
            } else if (response.data && Array.isArray(response.data)) {
                return response.data;
            } else if (Array.isArray(response)) {
                return response;
            } else {
                console.error('Unexpected response structure:', response);
                return [];
            }
        } catch (error) {
            console.error('Get teachers error:', error);
            throw error;
        }
    },

    addTeacher: async (teacherData) => {
        try {
            console.log('Sending teacher data:', teacherData);
            const response = await api.post('/teachers/', teacherData);
            console.log('Add teacher response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Add teacher error:', error);
            
            // Handle specific error cases
            if (error.response?.status === 400) {
                const errorDetail = error.response?.data?.message || 
                                  error.response?.data?.detail || 
                                  error.response?.data?.error;
                
                // Check if it's a duplicate email error
                if (typeof errorDetail === 'string') {
                    if (errorDetail.toLowerCase().includes('email') || 
                        errorDetail.toLowerCase().includes('already exists') ||
                        errorDetail.toLowerCase().includes('duplicate')) {
                        throw new Error('EMAIL_ALREADY_EXISTS');
                    }
                    throw new Error(errorDetail);
                }
            }
            
            throw new Error(error.response?.data?.message || error.message || 'Failed to add teacher');
        }
    },

    updateTeacher: async (id, teacherData) => {
        try {
            console.log('Updating teacher with PATCH to ID:', id);
            console.log('Update data:', teacherData);
            
            // Using PATCH instead of PUT
            const response = await api.patch(`/teachers/${id}/`, teacherData);
            console.log('Update teacher response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Update teacher error:', error);
            
            if (error.response?.status === 400) {
                const errorDetail = error.response?.data?.message || 
                                  error.response?.data?.detail;
                
                if (typeof errorDetail === 'string' && 
                    (errorDetail.toLowerCase().includes('email') || 
                     errorDetail.toLowerCase().includes('already exists'))) {
                    throw new Error('EMAIL_ALREADY_EXISTS');
                }
                throw new Error(errorDetail || 'Invalid data provided');
            }
            
            if (error.response?.status === 404) {
                throw new Error('Teacher not found');
            }
            
            throw new Error(error.response?.data?.message || error.message || 'Failed to update teacher');
        }
    },

    deleteTeacher: async (id) => {
        try {
            console.log('Deleting teacher with ID:', id);
            const response = await api.delete(`/teachers/${id}/`);
            console.log('Delete teacher response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Delete teacher error:', error);
            throw error;
        }
    },
};