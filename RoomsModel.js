const mongoose = require('mongoose');

const RoomsSchema = new mongoose.Schema({
  messages: [{
    message: String,
    user: String
  }],
  roomId: String,
}, { timestamps: true });

const MessagesModel = mongoose.model('Room', RoomsSchema);

module.exports = MessagesModel;