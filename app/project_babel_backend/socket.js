const { Server } = require("socket.io");

const os = require("os");

function getLocalIP() {
    const nets = os.networkInterfaces();
    for(const name of Object.keys(nets)) {
        for(const net of nets[name]) {
            if(net.family === "IPv4" && !net.internal)
                return net.address;
        }
    }
}
console.log("Your Local IP Address: ", getLocalIP());

let IO;

module.exports.initIO = (httpServer) => {
    IO = new Server(httpServer);

    // middleware used whenever a new client connects
    IO.use((socket, next) => {
        if(socket.handshake.query) {
            let callerId = socket.handshake.query.callerId;
            socket.user = callerId;
            next();
        } else {
            next(new Error("Authentication Error"));
        }
    });

    IO.on("connection", (socket) => {
        console.log(socket.user, " connected");
        socket.join(socket.user);

        socket.on("call", (data) => {
            let calleeId = data.calleeId;
            let rtcMessage = data.rtcMessage;

            socket.to(calleeId).emit("newCall", {
                callerId: socket.user, 
                rtcMessage: rtcMessage
            });
        });
        socket.on("answerCall", (data) => {
            let callerId = data.callerId;
            let rtcMessage = data.rtcMessage;
    
            socket.to(callerId).emit("callAnswered", {
                callee: socket.user,
                rtcMessage: rtcMessage
            });
        });
        socket.on("ICEcandidate", (data) => {
            console.log("ICEcandidate: ", data.calleeId);
            let calleeId = data.calleeId;
            let rtcMessage = data.rtcMessage;

            socket.to(calleeId).emit("ICEcandidate", {
                sender: socket.user, 
                rtcMessage: rtcMessage
            });
        });
    });
};

module.exports.getIO = () => {
    if(!IO) {
        throw new Error("Socket.io not initialized");
    } else {
        return IO;
    }
};