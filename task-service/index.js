const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const amqp = require("amqplib");

const app = express();
const port = process.env.PORT || 3002;
const MONGO_URI = process.env.MONGO_URI || "mongodb://mongo:27017/tasks";
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq";

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

// ── Schema ───────────────────────────────────────────────────
const TaskSchema = new mongoose.Schema({
    title: String,
    description: String,
    userId: String,
    createdAt: { type: Date, default: Date.now },
});

const Task = mongoose.model("Task", TaskSchema);

// ── RabbitMQ connection with retry ───────────────────────────
let channel, connection;

async function connectRabbitMQ(retries = 10, delay = 5000) {
    while (retries > 0) {
        try {
            console.log("Connecting to RabbitMQ at:", RABBITMQ_URL);
            connection = await amqp.connect(RABBITMQ_URL);
            channel = await connection.createChannel();
            await channel.assertQueue("task_created", { durable: true });
            console.log("Connected to RabbitMQ");
            return;
        } catch (err) {
            console.error("Failed to connect to RabbitMQ, retrying...", err.message);
            retries--;
            if (!retries) {
                console.error("Exhausted all retries to connect to RabbitMQ");
                break;
            }
            await new Promise((res) => setTimeout(res, delay));
        }
    }
}

// ── Routes ───────────────────────────────────────────────────
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.get("/api/tasks", async (req, res) => {
    try {
        const tasks = await Task.find({});
        res.status(200).json(tasks);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch tasks" });
    }
});

app.post("/api/tasks", async (req, res) => {
    try {
        const { title, description, userId } = req.body;
        const task = new Task({ title, description, userId });
        await task.save();

        if (channel) {
            const message = { id: task._id, title, description, userId };
            channel.sendToQueue(
                "task_created",
                Buffer.from(JSON.stringify(message)),
                { persistent: true }
            );
            console.log("Task message sent to RabbitMQ:", message);
        } else {
            console.warn("RabbitMQ channel not available, skipping message");
        }

        res.status(201).json(task);
    } catch (err) {
        console.error("Error saving task:", err);
        res.status(500).json({ error: "Failed to create task" });
    }
});

app.put("/api/tasks/:id", async (req, res) => {
    try {
        const { title, description, userId } = req.body;
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            { title, description, userId },
            { new: true }
        );
        res.status(200).json(task);
    } catch (err) {
        res.status(500).json({ error: "Failed to update task" });
    }
});

app.delete("/api/tasks/:id", async (req, res) => {
    try {
        await Task.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Task deleted" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete task" });
    }
});

app.delete("/api/tasks/all", async (req, res) => {
    try {
        await Task.deleteMany({});
        res.status(200).json({ message: "All tasks deleted" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete tasks" });
    }
});

// ── Start server ─────────────────────────────────────────────
app.listen(port, () => {
    console.log(`Task service listening at http://localhost:${port}`);
    connectDB();
    connectRabbitMQ();
});

module.exports = app;