const mongoose = require("mongoose")

const checkSchema = new mongoose.Schema({
    url : String,
    score : Number,
    verdict : String,
    reasons:[String],
    timestamp:{
        type:Date,
        default:Date.now
    }
})
const Check = mongoose.model("Check", checkSchema);

module.exports = Check