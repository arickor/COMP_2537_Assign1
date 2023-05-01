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

var { database } = include("databaseConnection");

const userCollection = database.db(mongodb_database).collection("users");

app.use(express.urlencoded({ extended: false }));

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

app.get("/nosql-injection", async (req, res) => {
  var username = req.query.user;

  if (!username) {
    res.send(
      `<h3>no user provided - try /nosql-injection?user=name</h3> <h3>or /nosql-injection?user[$ne]=name</h3>`
    );
    return;
  }
  console.log("user: " + username);

  const schema = Joi.string().max(20).required();
  const validationResult = schema.validate(username);

  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.send(
      "<h1 style='color:darkred;'>A NoSQL injection attack was detected!!</h1>"
    );
    return;
  }

  const result = await userCollection
    .find({ username: username })
    .project({ username: 1, password: 1, _id: 1 })
    .toArray();

  console.log(result);

  res.send(`<h1>Hello ${username}</h1>`);
});

app.get("/contact", (req, res) => {
  var missingEmail = req.query.missing;
  var html = `
      email address:
      <form action='/submitEmail' method='post'>
        <input name='email' type='text' placeholder='email'>
        <button>Submit</button>
      </form>
  `;
  if (missingEmail) {
    html += "<br> email is required";
  }
  res.send(html);
});

app.post("/submitEmail", (req, res) => {
  var email = req.body.email;
  if (!email) {
    res.redirect("/contact?missing=1");
  } else {
    res.send("Thanks for subscribing with your email: " + email);
  }
});

app.get("/signup", (req, res) => {
  var html = `
  create user
  <form action='/submitUser' method='post'>
    <input name='name' type='text' placeholder='Name'><br>
    <input name='email' type='email' placeholder='Email'><br>
    <input name='password' type='password' placeholder='Password'>
    <button>Submit</button>
  </form>
  `;
  res.send(html);
});

app.post("/loggingin", async (req, res) => {
  var username = req.body.username;
  var password = req.body.password;

  const schema = Joi.string().max(20).required();
  const validationResult = schema.validate(username);
  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.redirect("/login");
    return;
  }

  const result = await userCollection
    .find({ username: username })
    .project({ username: 1, password: 1, _id: 1 })
    .toArray();

  console.log(result);
  if (result.length != 1) {
    console.log("user not found");
    res.redirect("/login");
    return;
  }
  if (await bcrypt.compare(password, result[0].password)) {
    console.log("correct password");
    req.session.authenticated = true;
    req.session.username = username;
    req.session.cookie.maxAge = expireTime;

    res.redirect("/loggedIn");
    return;
  } else {
    console.log("incorrect password");
    res.redirect("/login");
    return;
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
