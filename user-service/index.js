const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://mongo:27017/users";

app.use(bodyParser.json());

// ── MongoDB connection with retry ────────────────────────────
async function connectDB(retries = 10, delay = 5000) {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB at:", MONGO_URI);
    } catch (err) {
        console.error("Failed to connect to MongoDB, retrying...", err.message);
        if (retries > 0) {
            console.log(`Retrying in ${delay}ms... (${retries} retries left)`);
            setTimeout(() => connectDB(retries - 1, delay), delay);
        } else {
            console.error("Max retries reached. Exiting.");
            process.exit(1);
        }
    }
}

connectDB();

// ── Schema ───────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
});

const User = mongoose.model("User", UserSchema);

// ── Routes ───────────────────────────────────────────────────
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.get("/api/users", async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

app.post("/api/users", async (req, res) => {
    try {
        const { name, email } = req.body;
        const user = new User({ name, email });
        await user.save();
        res.status(201).json(user);
    } catch (err) {
        res.status(500).json({ error: "Failed to create user" });
    }
});

app.put("/api/users/:id", async (req, res) => {
    try {
        const { name, email } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { name, email },
            { new: true }
        );
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ error: "Failed to update user" });
    }
});

app.delete("/api/users/:id", async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "User deleted" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete user" });
    }
});

app.delete("/api/users/all", async (req, res) => {
    try {
        await User.deleteMany({});
        res.status(200).json({ message: "All users deleted" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete users" });
    }
});

// ── Start server ─────────────────────────────────────────────
app.listen(port, () => {
    console.log(`User service listening at http://localhost:${port}`);
});

module.exports = app;