import request from 'supertest';
import { app } from '../../src/app.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

describe.skip('API Rate Limiting Integration Tests', () => {
    let validToken;

    beforeAll(async () => {
        process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "ratelimit_secret";
        
        validToken = jwt.sign(
            { type: "guest", name: "RateLimitGuest", sessionCode: "TEST", sessionId: "rl-session-id" },
            process.env.ACCESS_TOKEN_SECRET
        );

        process.env.MONGODB_URI = 'mongodb://localhost:27017/codespace_ratelimit_db';
        await mongoose.connect(process.env.MONGODB_URI);
        await mongoose.connection.db.dropDatabase();
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    test('Should reject requests with 429 after exceeding limit', async () => {
        const REQUEST_LIMIT = 50; // Assume limit is 50 per minute
        const problemId = new mongoose.Types.ObjectId().toString();
        
        // Fire bursts of requests
        let got429 = false;
        for (let i = 0; i < REQUEST_LIMIT + 5; i++) {
            const res = await request(app)
                .post('/api/v1/submissions/submit')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    problemId: problemId,
                    language: "python",
                    code: "print(1)"
                });
                
            if (res.status === 429) {
                got429 = true;
                break;
            }
        }
        
        // If the rate limiter is implemented, we expect a 429 status code
        expect(got429).toBe(true);
    });
});
