const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes")
const path = require("path");
const { error } = require("console");

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // form data handle ke liye
app.use(cookieParser());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


console.log("Mongo URI:", process.env.MONGO_URI);

// DB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.log("DB Error:", err));

// Routes
app.use("/api/auth", authRoutes);

// EJS Pages
app.get("/", (req, res) => res.redirect("/api/auth/signup"));

app.get('/signup', (req, res) =>{
    res.render("signup" , {error : null})
});

app.get("/login", (req, res) =>{
    res.render("login", {error: null});
})
// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
