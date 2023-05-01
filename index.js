require('dotenv').config();
require("./utils.js");

const MongoStore = require("connect-mongo");
const express = require("express");
const Joi = require("joi");
const session = require("express-session");
const bcrypt = require("bcrypt");
const saltRounds = 12;

const app = express();

const port = process.env.PORT || 3000;

const node_session_secret = "a9ba7660-79f2-421b-a24a-122fd8300b85";

app.use(
  session({
    secret: node_session_secret,
    // store: mongoStore,
    saveUninitialized: false,
    resave: true,
  })
);

// var numPageHits = 0;

app.get("/", (req, res) => {
  if (req.session.numPageHits == null) {
    req.session.numPageHits = 0;
  } else {
    req.session.numPageHits++;
  }
  //   numPageHits++;
  res.send("You have visited this page " + req.session.numPageHits + " times!");
});

app.listen(port, () => console.log(`Listening on port ${port}...`));
