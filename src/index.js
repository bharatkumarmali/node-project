import mongoose from "mongoose"
import { DB_NAME } from "./constants.js"
import connectDB from "./db/index.js"
import dotenv from "dotenv"

dotenv.config({
    path: "./.env"
});

connectDB();















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