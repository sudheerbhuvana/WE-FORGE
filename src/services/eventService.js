const API_BASE = '/api';

async function safeJson(res) {
    try { return await res.json(); } catch { return {}; }
}

const eventService = {
    async getAll() {
        const res = await fetch(`${API_BASE}/events`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load events');
        return safeJson(res);
    },

    async getById(id) {
        const res = await fetch(`${API_BASE}/events/${encodeURIComponent(id)}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Event not found');
        return safeJson(res);
    },

    async create(formData) {
        const res = await fetch(`${API_BASE}/events`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });
        if (!res.ok) {
            const data = await safeJson(res);
            throw new Error(data.error || 'Failed to create event');
        }
        return safeJson(res);
    },

    async update(id, formData) {
        const res = await fetch(`${API_BASE}/events/${encodeURIComponent(id)}`, {
            method: 'PUT',
            credentials: 'include',
            body: formData,
        });
        if (!res.ok) {
            const data = await safeJson(res);
            throw new Error(data.error || 'Failed to update event');
        }
        return safeJson(res);
    },

    async remove(id) {
        const res = await fetch(`${API_BASE}/events/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) {
            const data = await safeJson(res);
            throw new Error(data.error || 'Failed to delete event');
        }
        return safeJson(res);
    },

    async register(id, data) {
        // Supports both JSON (basic) and multipart/form-data (with files/form fields).
        // `data` may be { name, rollNumber, email, customFields, _files: { fieldId: File[] } }.
        const hasFiles = data && data._files && Object.values(data._files).some((arr) => Array.isArray(arr) && arr.length > 0);
        const hasCustomFields = data && data.customFields && Object.keys(data.customFields).length > 0;

        if (!hasFiles && !hasCustomFields) {
            const res = await fetch(`${API_BASE}/events/${encodeURIComponent(id)}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data),
            });
            const json = await safeJson(res);
            if (!res.ok) throw new Error(json.error || 'Registration failed');
            return json;
        }

        // Multipart path
        const fd = new FormData();
        fd.append('name', data.name || '');
        fd.append('rollNumber', data.rollNumber || '');
        fd.append('email', data.email || '');
        if (data.customFields) {
            Object.entries(data.customFields).forEach(([fieldId, value]) => {
                if (value === undefined || value === null) return;
                if (Array.isArray(value) && value.length && typeof value[0] === 'object' && value[0] && !value[0].arrayBuffer) {
                    // Work links array
                    fd.append(`field_${fieldId}_links`, JSON.stringify(value));
                } else if (typeof value === 'string' || typeof value === 'number') {
                    fd.append(`field_${fieldId}`, String(value));
                }
            });
        }
        if (data._files) {
            Object.entries(data._files).forEach(([fieldId, files]) => {
                (files || []).forEach((f) => {
                    if (f) fd.append(`field_${fieldId}_file`, f);
                });
            });
        }

        const res = await fetch(`${API_BASE}/events/${encodeURIComponent(id)}/register`, {
            method: 'POST',
            credentials: 'include',
            body: fd,
        });
        const json = await safeJson(res);
        if (!res.ok) throw new Error(json.error || 'Registration failed');
        return json;
    },

    async getRegistrations(id) {
        const res = await fetch(`${API_BASE}/events/${encodeURIComponent(id)}/registrations`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to load registrations');
        return safeJson(res);
    },

    async updateRegistrationRole(eventId, registrationId, role) {
        const res = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}/registrations`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ registrationId, role }),
        });
        if (!res.ok) {
            const data = await safeJson(res);
            throw new Error(data.error || 'Failed to update role');
        }
        return safeJson(res);
    },
};

export default eventService;
