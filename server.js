require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const moment = require("moment");
const { Schema } = mongoose;

//===================Middlewares
app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded());
app.use(express.json());

//===============Database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
console.log(mongoose.connection.readyState);

const personSchema = new Schema(
  {
    username: String,
  },
  { versionKey: false }
);

const ExerciseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    maxlength: [25, "Description too long, not greater than 25"],
  },
  duration: {
    type: Number,
    required: true,
    min: [1, "Duration too short, at least 1 minute"],
  },
  date: {
    type: Date,
    default: Date.now,
  },
  userId: {
    type: String,
    required: true,
  },
});

const Person = mongoose.model("Person", personSchema);
const Exercise = mongoose.model("Exercise", ExerciseSchema);

//=================Routes

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", (req, res) => {
  const { username } = req.body;
  Person.findOne({ username })
    .then((user) => {
      if (user) throw new Error("username already taken");
      return Person.create({ username });
    })
    .then((user) =>
      res.status(200).send({
        username: user.username,
        _id: user._id,
      })
    )
    .catch((err) => {
      console.log(err);
      res.status(500).send(err.message);
    });
});

app.get("/api/users", (req, res) => {
  const users = Person.find((err, data) => {
    if (err) return res.json({ error: "Something's wrong in database" });
    res.json(data);
  });
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  let { description, duration, date } = req.body;
  let userId = req.params._id;
  Person.findOne({ _id: userId })
    .then((user) => {
      if (!user) throw new Error("Unknown user with _id");
      date = date || Date.now();
      return Exercise.create({
        description,
        duration,
        date,
        userId,
      }).then((ex) =>
        res.status(200).send({
          username: user.username,
          description,
          duration,
          _id: user._id,
          date: moment(ex.date).format("ddd MMMM DD YYYY"),
        })
      );
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send(err.message);
    });
});

app.get("/api/users/:_id/logs", (req, res) => {
  let { from, to, limit } = req.query;
  let userId = req.params._id;
  from = moment(from, "YYYY-MM-DD").isValid() ? moment(from, "YYYY-MM-DD") : 0;
  to = moment(to, "YYYY-MM-DD").isValid()
    ? moment(to, "YYYY-MM-DD")
    : moment().add(1000000000000);

  Person.findById(userId)
    .then((user) => {
      if (!user) throw new Error("Unknown user with _id");
      Exercise.find({ userId })
        .where("date")
        .gte(from)
        .lte(to)
        .limit(+limit)
        .exec()
        .then((log) =>
          res.status(200).send({
            _id: userId,
            username: user.username,
            count: log.length,
            log: log.map((o) => ({
              description: o.description,
              duration: o.duration,
              date: moment(o).format("ddd MMMM DD YYYY"),
            })),
          })
        );
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send(err.message);
    });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
