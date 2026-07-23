import request from 'supertest';
import { app } from '../../src/app.js';
// Polls the API until the submission status is no longer "Pending"
export async function pollSubmissionStatus(jobId, token, maxRetries = 20, delayMs = 500) {
    for (let i = 0; i < maxRetries; i++) {
        // We use supertest against the Express app to poll
        const res = await request(app)
            .get(`/api/v1/submissions/status/${jobId}`)
            .set('Authorization', `Bearer ${token}`);
            
        if (res.status === 200 && res.body.data && res.body.data.status !== 'Pending') {
            return res.body.data;
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    throw new Error('Polling timeout exceeded: Job stuck in Pending state');
}
