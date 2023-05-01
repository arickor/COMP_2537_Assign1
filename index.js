require("dotenv").config();
require("./utils.js");
const MongoStore = require("connect-mongo");
const express = require("express");
const Joi = require("joi");
const session = require("express-session");
const bcrypt = require("bcrypt");
const saltRounds = 12;

const app = express();

const port = process.env.PORT || 3000;

const expireTime = 1 * 60 * 60 * 1000; // 1 hour

/* secret info */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
/* secret info */

var mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
  crypto: {
    secret: mongodb_session_secret,
  },
});

app.use(
  session({
    secret: node_session_secret,
    store: mongoStore, //default is memory store
    saveUninitialized: false,
    resave: true,
  })
);

app.get("/", (req, res) => {
  var email = req.session.email;

  if (!email) {
    res.send(`
      <form action='/signup' method='get'>
      <button>Sign Up</button><br>
      </form>
      
      <form action='/login' method='get'>
      <button>Log In</button>
      </form>
      `);
  } else {
    var hello = `<h2>Hello, ` + req.session.name + `!</h2>`;

    var membersArea = `<form action='/members' method='get'>
    <button>Go to Members Area ;)</button>
    </form>`;

    var logOut = `<form action='/logout' method='get'>
    <button>Log Out</button>
    </form>`;

    var html = hello + membersArea + logOut;

    res.send(html);
  }
});

app.get("/corgi/:id", (req, res) => {
  var corgi = req.params.id;
  if (corgi == 1) {
    res.send("corgi 1: <img src='/images/corgi1.jpg' />");
  } else if (corgi == 2) {
    res.send("corgi 2: <img src='/images/corgi2.jpg' />");
  } else if (corgi == 3) {
    res.send("corgi 3: <img src='/images/corgi3.jpg' />");
  } else {
    res.send("Invalid corgi ID: " + corgi);
  }
});

app.use(express.static(__dirname + "/public"));

app.get("/notfound", (req, res) => {
  res.status(404);
  res.send("Page not found - 404");
});

app.get("*", (req, res) => {
  res.redirect("/notfound");
});

app.listen(port, () => console.log(`Listening on port ${port}...`));
