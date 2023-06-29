const cors = require('cors');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { MongoClient } = require("mongodb");
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const mongoose = require('mongoose');
const MessagesModel = require('./MessagesModel');
const RoomsModel = require('./RoomsModel');

require('dotenv').config();
app.use(express.json());
app.use(cors());

const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING);

// Підключення до MongoDB за допомогою Mongoose
mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('Failed to connect to MongoDB', error);
});

app.patch('/add-message', async (req, res) => {
  const { message, id, user } = req.body;
  console.log('work');
  console.log('message',message);
  console.log('id',id);
  console.log('user',user);
  const result = await RoomsModel.findOneAndUpdate(
    { roomId: id },
    { $push: { messages: { message, user } } },
    { new: true }
  );

  res.json(result);
});

app.post('/create-room', async (req, res) => {
  const { messages, roomId, user } = req.body;
  console.log('user', user);

  // Перевірка, чи існує roomId в колекції
  const existingRoom = await RoomsModel.findOne({ roomId });
  console.log('existingRoom',existingRoom);
  if (existingRoom) {
    return res.json({roomId: existingRoom.roomId});
  }

  const post = await RoomsModel.create({
    messages,
    roomId,
    user
  });

  res.json(post);
});

app.get('/get-current-messages', async (req,res) => {
  const allMessages = await RoomsModel.find();
  res.json(allMessages);
})

async function run() {
  try {
    await client.connect();
    const database = client.db('test');

    const messages = database.collection('rooms');

    // Open a Change Stream on the "messages" collection
    const changeStream = messages.watch();

    // Set up a listener when change events are emitted

    const activeConnections = new Set();

io.on("connection", (socket) => {
  console.log("user connected");
  socket.on("Room: Join", (data) => {
    const { roomId, user } = data;
    socket.join(roomId);
    activeConnections.add(socket); // Додаємо активне з'єднання до множини
  });
  socket.on("disconnect", () => {
    console.log("user disconnected");
    activeConnections.delete(socket); // Видаляємо з'єднання з множини при відключенні
  });
});

changeStream.on("change", async (next) => {
  // Process any change event
  switch (next.operationType) {
    case "insert":
      const { message, roomId } = next.fullDocument;
      console.log('new message',message);
      io.sockets.in(roomId).emit("chat message", {data: {
        name: "ros",
        age: 25
      }});
      console.log("insert message", message);
      break;
    case "update":
      const updatedMessage = next.updateDescription.updatedFields;
      console.log('updatedMessage',updatedMessage);
      const { _id } = next.documentKey;
      console.log('ID:',_id);
      const allData = RoomsModel.findById(_id);
      const finalObject = next.updateDescription.updatedFields;
      console.log('allData',allData);
      console.log("update", next.updateDescription.updatedFields);
      let newMessage = '';
      let newUser = '';
      for (const key in finalObject) {
        if(finalObject.hasOwnProperty(key)) {
          const value = finalObject[key];
          if(key != 'updatedAt') {
            newMessage = value.message;
            newUser = value.user;
            console.log('its work',value);
          }
        }
      }

      console.log('newMessage',newMessage);
      console.log('newUser',newUser);

      io.emit("chat message", { mes: newMessage, user: newUser });

      break;
  }
});

  } catch (error) {
    console.error('Error occurred:', error);
    // Ensures that the client will close when you error
    await client.close();
  }
}

run().catch(console.dir);

server.listen(4444, () => {
  console.log('Listening on port 4444');
});