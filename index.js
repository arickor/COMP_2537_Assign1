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
    var hello = `<h2>Hello, ` + req.session.name + `.</h2>`;

    var membersArea = `<form action='/members' method='get'><button>Go to Members Area</button></form>`;

    var logout = `<form action='/logout' method='get'><button>Log Out</button></form>`;

    var html = hello + membersArea + logout;

    res.send(html);
  }
});

// protection against NoSQL injection attacks
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

app.get("/members", (req, res) => {
  var email = req.session.email;

  if (!email) {
    res.redirect("/");
  }
  var msg = "<h3>Hello, " + req.session.name + ".</h3>";
  var logout =
    "<form action='/logout' method='get'><button>Sign Out</button><br></form>";
  var corgiID = Math.floor(Math.random() * 3) + 1;
  var corgi = "<img src='/" + corgiID + ".jpg'>";
  var html = msg + `<br>` + corgi + logout;
  res.send(html);
});

// signup page
app.get("/signup", (req, res) => {
  var html = `
  create user
  <form action='/submitUser' method='post'>
    <input name='name' type='text' placeholder='name'><br>
    <input name='email' type='email' placeholder='email'><br>
    <input name='password' type='password' placeholder='password'>
    <button>Submit</button>
  </form>
  `;
  res.send(html);
});

app.get("/login", (req, res) => {
  var email = req.session.email;
  if (email) {
    res.redirect("/");
  } else {
    var html = `
  Log In
  <form action='/loggingin' method='post'>
    <input name='email' type='email' placeholder='Email'>
    <input name='password' type='password' placeholder='Password'>
    <button>Submit</button>
  </form>
  `;
    res.send(html);
  }
});

app.post("/submitUser", async (req, res) => {
  var name = req.body.name;
  var email = req.body.email;
  var password = req.body.password;

  const schema = Joi.object({
    name: Joi.string().min(1).max(20).required(),
    email: Joi.string().email().required(),
    password: Joi.string().max(20).required(),
  });

  const validationResult = schema.validate({ name, email, password });
  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.redirect(
      `/signupSubmit?error=${encodeURIComponent(
        validationResult.error.details[0].message
      )}`
    );
    return;
  }

  var hashedPassword = await bcrypt.hash(password, saltRounds);

  await userCollection.insertOne({
    name: name,
    email: email,
    password: hashedPassword,
  });
  console.log("Inserted user");

  // Create a session for the new user
  req.session.authenticated = true;
  req.session.email = email;
  req.session.name = name;
  req.session.password = hashedPassword;
  req.session.cookie.maxAge = expireTime;

  res.redirect("/members");
});

app.get("/signupSubmit", (req, res) => {
  const errorMessage = decodeURIComponent(req.query.error);
  var html = `
  <p>${errorMessage}. <a href='/signup'>Please try again.</a></p>
  `;
  res.send(html);
});

// checking if user exists
app.post("/loggingin", async (req, res) => {
  var email = req.body.email;
  var password = req.body.password;

  const schema = Joi.string().email().required();
  const validationResult = schema.validate(email);
  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.redirect("/login");
    return;
  }

  const result = await userCollection
    .find({ email: email })
    .project({ name: 1, email: 1, password: 1, _id: 1 })
    .toArray();

  console.log(result);
  if (result.length != 1) {
    console.log("user not found");
    res.redirect(`/loginSubmit?error=User not found`);
    return;
  }
  if (await bcrypt.compare(password, result[0].password)) {
    console.log("correct password");
    req.session.authenticated = true;
    req.session.email = email;
    req.session.name = result[0].name;
    req.session.cookie.maxAge = expireTime;

    res.redirect("/loggedIn");
    return;
  } else {
    console.log("incorrect password");
    res.redirect(`/loginSubmit?error=Password is incorrect`);
    return;
  }
});

app.get("/loginSubmit", (req, res) => {
  const errorMessage = req.query.error;
  var html = `
  <p>${errorMessage}. <a href='/login'>Please try again.</a></p>
  `;
  res.send(html);
});

app.get("/loggedIn", (req, res) => {
  if (!req.session.authenticated) {
    res.redirect("/login");
  } else {
    res.redirect("/members");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  // var html = `
  //   You are logged out.
  //   `;
  res.redirect("/");
});

app.get("/corgi/:id", (req, res) => {
  var corgi = req.params.id;
  if (corgi == 1) {
    res.send("corgi 1: <img src='/1.jpg' style='width:250px;'>");
  } else if (corgi == 2) {
    res.send("corgi 2: <img src='/2.jpg' style='width:250px;'>");
  } else if (corgi == 3) {
    res.send("corgi 3: <img src='/3.jpg' style='width:250px;'>");
  } else {
    res.send("Invalid corgi ID: " + corgi);
  }
});

app.use(express.static(__dirname + "/public"));

app.get("/does_not_exist", (req, res) => {
  res.status(404);
  res.send("Page not found - 404");
});

app.get("*", (req, res) => {
  res.redirect("/does_not_exist");
});

app.listen(port, () => console.log(`Listening on port ${port}...`));
