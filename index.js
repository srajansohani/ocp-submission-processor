import mongoose from "mongoose";
import dotenv from "dotenv";
import amqp from "amqplib/callback_api.js";
import redis from "redis";
import asyncRedis from "async-redis";
import express from "express";
import { handel_problem_submission } from "./controllers/problem_submission_controller.js";
import { handel_playground_submission } from "./controllers/playground_submission_controller.js";
import { handel_contest_submission } from "./controllers/contest_submission_controller.js";

const app = express();

dotenv.config();
export let redisClient;

const handel_submission = (submission_data) => {
  if (submission_data.type == "problem_submission") {
    handel_problem_submission(submission_data.submission);
    return;
  }

  if (submission_data.type == "playground_submission") {
    handel_playground_submission(submission_data.submission);
    return;
  }

  if (submission_data.type == "contest_submission") {
    handel_contest_submission(
      submission_data.submission,
      submission_data.submission.contest_id
    );
    return;
  }

  console.log(`submission of type ${submission_data.type} not supported`);
};

const connect_to_mongoDB = async () => {
  try {
    mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to mongoDB database");
  } catch (err) {
    throw err;
  }
};

const connect_to_rabbitMQ = async () => {
  try {
    amqp.connect(
      process.env.RABBIT_MQ_URI,
      {
        heartbeat: 60,
      },
      function (error, connection) {
        if (error) {
          throw error;
        }

        connection.createChannel(function (error, channel) {
          if (error) {
            throw error;
          }

          channel.assertQueue("processed_submission", {
            durable: false,
          });

          console.log("waiting for messages...");

          channel.consume(
            "processed_submission",
            function (msg) {
              const submission_data = JSON.parse(msg.content.toString());

              handel_submission(submission_data);
            },
            {
              noAck: true,
            }
          );
        });
      }
    );

    console.log("Connected to rabbitMQ");
  } catch (err) {
    throw err;
  }
};

const connect_to_redis = async () => {
  const client = redis.createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_URI,
      port: process.env.REDIS_PORT,
      heartbeatInterval: 60000,
    },
    heartbeatInterval: 60000,
  });

  client.on("error", (err) => console.log("Redis Client Error", err));

  await client.connect();

  // await client.set("key", "value");
  // const value = await client.get("key");
  // console.log("Test Key Value:", value);

  redisClient = client;
  console.log("connected to redis");
};

const startup = async () => {
  app.listen(process.env.PORT || 8083, async () => {
    try {
      await connect_to_mongoDB();
      await connect_to_rabbitMQ();
      await connect_to_redis();
    } catch (err) {
      console.log("Error during startup:", err);
    }
  });
};

startup();
