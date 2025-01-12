import mongoose from "mongoose"
import { DB_NAME } from "./constants.js"

import connectDB from "./db/index.js"
import dotenv from "dotenv"
import app from "./app.js"

dotenv.config({
    path: "./.env"
});



connectDB()
    .then(() => {
        app.on("error", (error) => {
            console.log("ERROR IN SERVER SETUP : ", error)
            throw error;
        })
        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`)
        })
    })
    .catch((error) => {
        console.log("database connection error : ", error)
    })














/*
import express from "express"
const app = express();


// EFIS code
(async () => {
    try {
        await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
        console.log("Connected to MongoDB");

        app.on("error", (error) => {
            console.log("ERROR ", error);
            throw error;
        })

        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ----- ${process.env.PORT}`);
        })

    } catch (error) {
        console.error("ERROR ", error);
        throw error;
    }
})()

*/