const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// ✅ Schema & Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  exercises: [
    {
      description: { type: String, required: true },
      duration: { type: Number, required: true },
      date: { type: Date, required: true }, // ✅ store as Date type
    },
  ],
});
const User = mongoose.model("User", userSchema);

// ✅ POST /api/users - create new user
app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

// ✅ GET /api/users - list all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "username _id");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve users" });
  }
});

// ✅ POST /api/users/:_id/exercises - add exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;

    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const exerciseDate = date ? new Date(date) : new Date();

    const exercise = {
      description: String(description),
      duration: parseInt(duration),
      date: exerciseDate,
    };

    user.exercises.push(exercise);
    await user.save();

    res.json({
      username: user.username,
      _id: user._id,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(), // ✅ return formatted date
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to add exercise" });
  }
});

// ✅ GET /api/users/:_id/logs - get logs
app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    let logs = user.exercises;

    // ✅ Filter by 'from' date
    if (from) {
      const fromDate = new Date(from);
      if (isNaN(fromDate))
        return res.status(400).json({ error: "Invalid from date" });
      logs = logs.filter((ex) => ex.date >= fromDate);
    }

    // ✅ Filter by 'to' date
    if (to) {
      const toDate = new Date(to);
      if (isNaN(toDate))
        return res.status(400).json({ error: "Invalid to date" });
      logs = logs.filter((ex) => ex.date <= toDate);
    }

    // ✅ Limit results
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        logs = logs.slice(0, limitNum);
      }
    }

    // ✅ Format log output
    const formattedLogs = logs.map((ex) => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString(),
    }));

    // ✅ Final response
    res.json({
      username: user.username,
      _id: user._id,
      count: formattedLogs.length,
      log: formattedLogs,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve logs" });
  }
});

// ✅ Start server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
