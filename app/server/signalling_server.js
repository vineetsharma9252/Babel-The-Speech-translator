const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const redis = require("redis");

const app = express();
const server = http.createServer(app);
const io = socketIo(
    server, {
        cors: { origin: "*" }
    }
);

const redisClient = redis.createClient();

io.on("connection", socket => {
    console.log(`User Connected: ${socket.id}`);

    socket.on("join-room", async roomId => {
        socket.join(roomId);
        const rooms = await redisClient.keys("room: ");
        await redisClient.sadd(`room: ${roomId}`, socket.id);
    })
});