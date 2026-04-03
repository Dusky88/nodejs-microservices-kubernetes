const amqp = require("amqplib");

let channel, connection;

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq";

async function start(retries = 10, delay = 5000) {
    try {
        console.log(`Connecting to RabbitMQ at: ${RABBITMQ_URL}`);
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue("task_created");
        console.log(
            "Notification service is listening to messages from RabbitMQ"
        );
        channel.consume("task_created", (msg) => {
            if (msg !== null) {
                const messageContent = msg.content.toString();
                const task = JSON.parse(messageContent);
                console.log(
                    `Received notification for new task: ${task.title} assigned to user ID: ${task.userId}`
                );
                channel.ack(msg);
            }
        });
    } catch (err) {
        console.error("Failed to connect to RabbitMQ, retrying...", err);
        if (retries > 0) {
            console.log(`Retrying in ${delay}ms... (${retries} retries left)`);
            setTimeout(() => start(retries - 1, delay), delay);
        } else {
            console.error("Max retries reached. Exiting.");
            process.exit(1);
        }
    }
}

start();