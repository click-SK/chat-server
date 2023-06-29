// const mongoose = require('mongoose');

// const MessagesSchema = new mongoose.Schema({
//     message: String,
// }, { timestamps: true });

// // export default mongoose.model('message',MessagesSchema)

const mongoose = require('mongoose');

const MessagesSchema = new mongoose.Schema({
  message: String,
  roomId: String,
  user: String
}, { timestamps: true });

const MessagesModel = mongoose.model('Message', MessagesSchema);

module.exports = MessagesModel;