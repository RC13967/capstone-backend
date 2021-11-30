import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config();
import cors from "cors";
import { compare } from "bcrypt";
import { router1 } from "./admin.js";
export const app = express();
app.use(cors());
app.use(express.json());
const PORT = 4000;
const MONGO_URL = 'mongodb://localhost';
// const PORT = process.env.PORT;
// const MONGO_URL = process.env.MONGO_URL;
export async function createConnection() {
  const client = new MongoClient(MONGO_URL)
  await client.connect();
  return client;
}
app.get("/", (request, response) => {
  response.send("This is home page, append appropriate end points");
})
app.get("/posts", async (request, response) => {
  const { email } = request.body;
  const client = await createConnection();
  const user = await client.db("capstone").collection("users").find().toArray();
  if (user.length > 0) {
    response.send(user[0].posts);
  }
});
app.post("/posts", async (request, response) => {
  const { email } = request.body;
  const client = await createConnection();
  const user = await client.db("capstone").collection("users").find({ "email": email }).toArray();
  if (user.length > 0) {
    response.send(user[0].posts);
  }
});
app.put("/addpost", async (request, response) => {
  const { postname, adress, user } = request.body;
  const client = await createConnection();
  const result = await client.db("capstone").collection("users")
    .updateOne({
      email: user
    },
      {
        $push: {
          "posts": {
            postname: postname,
            adress: adress,
          }
        }
      })
  response.send(result)

});
app.put("/deletePost", async (request, response) => {
  const { user, postname, adress } = request.body;
  const client = await createConnection();
  const result = await client.db("capstone").collection("users")
    .updateOne({
      email: user
    },
      {
        $pull: {
          "posts": {
            postname: postname,
            adress: adress
          }
        }
      });
  response.send(result);
});
app.put("/updatePost", async (request, response) => {
  const { newpostName, newAdress, oldpostName, oldAdress, user } = request.body;
  const client = await createConnection();
  const result1 = await client.db("capstone").collection("users")
    .updateOne({
      email: user
    },
      {
        $pull: {
          "posts": {
            postname: oldpostName,
            adress: oldAdress
          }
        }
      });
  const result2 = await client.db("capstone").collection("users")
    .updateOne({
      email: user
    },
      {
        $push: {
          "posts": {
            postname: newpostName,
            adress: newAdress
          }
        }
      });
  response.send("updated");
});

app.get("/posts", async (request, response) => {
  const client = await createConnection();
  const result = await client.db("capstone").collection("movies").find({}).toArray();
  response.send(result);
});
app.use("/", router1);
app.listen(PORT, () => console.log("The server is started"));