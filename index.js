const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
mongoose.Promise = global.Promise;
mongoose.set("strictQuery", false);
require("dotenv").config();
const loger = require("morgan");
const { User } = require("./Schemas/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());
app.use(loger("dev"));

const secretKey = crypto.randomBytes(32).toString("hex");

const verifyToken = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "Отсутствует токен авторизации" });
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded.user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Неверный токен авторизации" });
  }
};

app.post("/register", async (req, res) => {
  const { login } = req.body;
  const user = await User.findOne({ login });
  if (user) {
    res.status(400).json({ message: "Already exist" });
    return;
  }
  const token = jwt.sign({ user }, secretKey, { expiresIn: "1h" });

  req.body.token = token;

  const newUser = await User.create(req.body);

  newUser.save();
  console.log(newUser);
  res.status(201).json(newUser);
});

app.post("/login", async (req, res) => {
  const { login, pass } = req.body;
  const user = await User.findOne({ login });
  if (!user) {
    return res.status(400).json({ message: "User doesnt registred" });
  }

  if (pass !== user.pass) {
    return res.status(400).json({ message: "password incorrect" });
  }
  console.log(user);

  res.status(200).json(user);
});

app.get("/sounds", async (req, res) => {
  const { query } = req.query;
  try {
    const { data } = await axios.get(
      `https://api-v2.soundcloud.com/search?q=${query}&variant_ids=&facet=model&user_id=375405-419824-723463-515208&client_id=ArYppSEotE3YiXCO4Nsgid2LLqJutiww&limit=20&offset=0&linked_partitioning=1&app_version=1696577813&app_locale=en`
    );
    const tracksData = await data.collection.reduce(async (acc, track) => {
      const ac = await acc;
      if (!track.media) {
        return ac;
      }
      const { url } = track.media.transcodings.find(
        (el) => el.format?.protocol === "progressive"
      );
      const { data: urlInfo } = await axios(
        `${url}?client_id=iXfdiZL2MeKJsPjeNEdnpG3ewjiBQSby&track_authorization=${track.track_authorization}`
      );

      console.log(acc);
      ac.push({ title: track.title, url: urlInfo.url });

      return ac;
    }, []);
    res.status(200).json(tracksData);
  } catch (error) {
    res.status(400).json(error.message);
  }
});

app.get("/track", async (req, res) => {
  const { url, track_authorization } = req.query;
  console.log(url, track_authorization);
  try {
    const { data } = await axios.get(
      `${url}?client_id=iXfdiZL2MeKJsPjeNEdnpG3ewjiBQSby&track_authorization=${track_authorization}`
    );

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json(error.message);
  }
});

async function connect() {
  await mongoose.connect(process.env.DB_url, {
    useNewUrlParser: true,
  });
  app.listen(4000, () => {
    console.log("server listening");
  });
}

connect()
  .then(() => {
    console.log("Database connection successful");
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
