import request from 'supertest';
import { app } from '../../src/app.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

describe('API Integration Tests - Submission Boundaries', () => {
    let validToken;

    beforeAll(async () => {
        process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "integration_secret";
        
        validToken = jwt.sign(
            { type: "guest", name: "IntegrationGuest", sessionCode: "TEST", sessionId: "session-id" },
            process.env.ACCESS_TOKEN_SECRET
        );

        process.env.MONGODB_URI = 'mongodb://localhost:27017/codespace_integration_db';
        await mongoose.connect(process.env.MONGODB_URI);
        await mongoose.connection.db.dropDatabase();
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    test('Should return 401 Unauthorized when missing Authorization header', async () => {
        const res = await request(app)
            .post('/api/v1/submissions/submit')
            .send({
                problemId: "60b9b3b3b3b3b3b3b3b3b3b3",
                language: "cpp",
                code: "int main() {}"
            });
            
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Authentication required");
    });

    test('Should return 400 Bad Request when problemId is invalid/missing', async () => {
        const res = await request(app)
            .post('/api/v1/submissions/submit')
            .set('Authorization', `Bearer ${validToken}`)
            .send({
                language: "cpp",
                code: "int main() {}"
            });
            
        expect(res.status).toBe(400);
        expect(res.body.message).toContain("problemId");
    });

    test('Should return 400 Bad Request when language is unsupported', async () => {
        const res = await request(app)
            .post('/api/v1/submissions/submit')
            .set('Authorization', `Bearer ${validToken}`)
            .send({
                problemId: "60b9b3b3b3b3b3b3b3b3b3b3",
                language: "rust",
                code: "fn main() {}"
            });
            
        expect(res.status).toBe(400);
        expect(res.body.message).toContain("language");
    });

    test('Should return 404 Not Found for non-existent endpoint', async () => {
        const res = await request(app)
            .get('/api/v1/invalid/endpoint')
            .set('Authorization', `Bearer ${validToken}`);
            
        expect(res.status).toBe(404);
    });
});
