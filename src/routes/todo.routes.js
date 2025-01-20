import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    createTodo,
    updateTodo,
    deleteTodo,
    getTodos,
    getTodoById
} from "../controllers/todo.controller.js";

const router = Router();

// Secure all routes with authentication
router.use(verifyJWT);

router.route("/").post(createTodo).get(getTodos);

router.route("/:id").get(getTodoById).patch(updateTodo).delete(deleteTodo);

export { router as todoRouter }