require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
var dateFormat = require("dateformat");
const { Schema } = mongoose;

//===================Middlewares
app.use(cors());
app.use(express.static("public"));
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(express.json());

// connect mongodb
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// dateformat

// Create user schema
const exerciseSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: String,
  },
  {
    _id: false,
  }
);

let exerciseUserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  count: Number,
  log: [exerciseSchema],
});

let user = mongoose.model("exercise-user", exerciseUserSchema);
let exercise = mongoose.model("exercise", exerciseSchema);

// post, create user
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", function (req, res) {
  let newUser = new user({ username: req.body.username });

  user.exists({ username: req.body.username }, function (err, result) {
    if (err) {
      console.log(err);
      return;
    } else {
      if (result) {
        res.write("Username already taken");
        res.end();
      } else {
        newUser.save((err, result) => {
          if (err) return;
          res.json({ username: result.username, _id: result.id });
        });
      }
    }
  });
});

// get, all users
app.get("/api/users", function (req, res) {
  user.find({}).exec((error, result) => {
    if (error) return;
    res.json(result);
  });
});

// post, add exercises
app.post("/api/users/:_id/exercises", function (req, res) {
  let inputID = req.params._id;
  let inputDescription = req.body.description;
  let inputDuration = req.body.duration;
  let inputDate = req.body.date || new Date();

  let newExercise = new exercise({
    description: inputDescription,
    duration: parseInt(inputDuration),
    date: dateFormat(inputDate, "ddd mmm dd yyyy"),
  });
  console.log(newExercise);
  user.findByIdAndUpdate(
    inputID,
    { $push: { log: newExercise } },
    { new: true },
    (error, result) => {
      if (error) return;
      var resObj = {};
      resObj["_id"] = result._id;
      resObj["username"] = result.username;
      resObj["date"] = newExercise.date;
      resObj["duration"] = newExercise.duration;
      resObj["description"] = newExercise.description;
      res.json(resObj);
      console.log(result);
    }
  );
});

// get, log
app.get("/api/users/:_id/logs", function (req, res) {
  user.findById(req.params._id, (err, result) => {
    if (err) {
      console.log(err);
      return;
    }

    if (req.query.from || req.query.to) {
      let fromDate = new Date(0);
      let toDate = new Date();

      if (req.query.from) {
        fromDate = new Date(req.query.from);
      }

      if (req.query.to) {
        toDate = new Date(req.query.to);
      }

      fromDate = fromDate.getTime();
      toDate = toDate.getTime();

      result.log = result.log.filter((exercise) => {
        let exerciseDate = new Date(exercise.date).getTime();
        return exerciseDate >= fromDate && exerciseDate <= toDate;
      });
    }

    if (req.query.limit) {
      result.log = result.log.slice(0, req.query.limit);
    }

    var resObj = {};
    resObj["_id"] = result._id;
    resObj["username"] = result.username;
    resObj["count"] = result.log.length;
    resObj["log"] = result.log;
    res.json(resObj);
  });
});
// My Code End

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
