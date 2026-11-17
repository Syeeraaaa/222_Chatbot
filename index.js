const express = require("express");
const dotenv  = require("dotenv");

dontenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render("/index.html");
});
