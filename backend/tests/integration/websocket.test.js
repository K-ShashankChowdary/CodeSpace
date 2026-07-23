import { createServer } from 'http';
import { io as Client } from 'socket.io-client';
import { initializeSockets } from '../../src/services/socketService.js';
import jwt from 'jsonwebtoken';

describe('WebSocket Real-time Integration Tests', () => {
    let io, clientSocket;
    let httpServer;
    let validToken;

    beforeAll((done) => {
        process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "ws_secret";
        
        validToken = jwt.sign(
            { type: "guest", name: "WsGuest", sessionCode: "TEST", sessionId: "ws-session-id" },
            process.env.ACCESS_TOKEN_SECRET
        );

        httpServer = createServer();
        io = initializeSockets(httpServer);
        
        httpServer.listen(() => {
            const port = httpServer.address().port;
            clientSocket = Client(`http://localhost:${port}`, {
                auth: { token: validToken }
            });
            
            clientSocket.on("connect", done);
        });
    });

    afterAll(async () => {
        io.close();
        clientSocket.close();
        httpServer.close();
        if (io.redisSubscriber) {
            await io.redisSubscriber.quit();
        }
    });

    test('Should establish connection with valid auth token', () => {
        expect(clientSocket.connected).toBe(true);
    });

    test('Should broadcast disconnect events to peers in session', (done) => {
        // clientSocket must join the session first
        clientSocket.emit("join-room", { roomCode: "TEST" });

        const peerClient = Client(`http://localhost:${httpServer.address().port}`, {
            auth: { token: validToken }
        });
        
        peerClient.on("connect", () => {
            peerClient.emit("join-room", { roomCode: "TEST" });
        });
        
        setTimeout(() => {
            peerClient.close();
        }, 500);
        
        clientSocket.on("candidate-left", (data) => {
            expect(data).toHaveProperty("username");
            done();
        });
    });
});
