// backend/src/services/socketService.js
// ... (imports)

export const initializeSockets = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN,
            credentials: true,
            methods: ["GET", "POST"]
        }
    });

    io.use((socket, next) => {
        try {
            // 1. Check the 'auth' object first (sent via socket.js auth callback)
            let token = socket.handshake.auth?.token;

            // 2. Fallback to cookies if auth payload is missing
            if (!token && socket.handshake.headers.cookie) {
                const cookies = Object.fromEntries(
                    socket.handshake.headers.cookie.split(';').map(c => c.trim().split('='))
                );
                token = cookies.accessToken;
            }

            if (!token) {
                console.error("🛑 Auth Failed: Token not found in Auth Payload or Cookies");
                return next(new Error("Authentication error: Token missing"));
            }

            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            socket.data.userId = decoded._id;
            socket.data.username = decoded.username;
            next();
        } catch (err) {
            console.error("🛑 Auth Failed: Invalid Token", err.message);
            next(new Error("Authentication error: Invalid session"));
        }
    });

    // ... (rest of the socket listeners)
    return io;
};