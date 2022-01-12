const express = require("express");
const cors = require("cors");
const config = require("./config")
const socket = require("socket.io");
const transcribe = require("../stt");

const app = express();
app.use(cors());
app.use(express.json());


app.use(require("./patientLogin/router"));
app.use(require("./doctorLogin/router"));
app.use(require("./posts/router"));
app.use(require("./schedules/router"));

const login = require("./login.js")

app.get("/audio", (req, res) => {
    console.log(req.body);
});

// const port = 3001;
const server = app.listen(config.express.port, () => {
    console.log(`Server running on Port ${config.express.port}`);
});

//login using jwt
//doctor login
// app.post('/dlogin', (req, res) => {
//     const email = req.body.email
//     const password = req.body.password
//     const result = login.docLogin([email, password])
//     res.json({ accessToken: result[1], doctorID: result[0] })
// })

// //patient login
// app.post('/plogin', (req, res) => {
//     console.log(req.body)
//     const email = req.body.email
//     const password = req.body.password
//     const result = login.paLogin([email, password])
//     res.json({ accessToken: result[1], doctorID: result[0] })
// })


const io = socket(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
});

io.on("connection", async socket => {
    console.log(socket.id);

    socket.on("start", (data) => {
        console.log(data)
        const userid = data[0];
        const role = data[1];
        var otherUserId;
        var otherSocketId;

        console.log(userid);
        console.log(role);

        if (role) {
            const getDoctorId = "SELECT doctor_id, socket_id FROM felicity.reservation where patient_id = ?";

            config.db.query(getDoctorId, userid, (err, result) => {
                if (err) console.log(err);

                otherUserId = result[0].doctor_id;
                otherSocketId = result[0].socket_id;
                console.log(result);
                console.log(otherUserId);
                console.log(otherSocketId);

            });
        } else {
            const getPatientId = "SELECT patient_id, socket_id FROM felicity.reservation where doctor_id = ?";

            config.db.query(getPatientId, userid, (err, result) => {
                if (err) console.log(err);

                console.log(result);
            });
        }

        socket.emit("me", socket.id);

    });

    socket.on("disconnect", () => {
        socket.broadcast.emit("callended");
    });

    socket.on("calluser", ({ userToCall, signalData, from, someName }) => {
        io.to(userToCall).emit("calluser", { signal: signalData, from, someName });
    });

    socket.on("answercall", (data) => {
        io.to(data.to).emit("callaccepted", data.signal);
    });

    socket.on("message-transcribe", async (file) => {
        const dataURL = file.audio.dataURL.split(",").pop();
        let fileBuffer = Buffer.from(dataURL, "base64");
        const result = await transcribe(fileBuffer);
        console.log(result);
        // console.log(dataURL);
        socket.emit("result", result);
    });
})