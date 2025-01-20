import { Todo } from "../models/todo.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTodo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title || !description) {
        return res.status(400).json(
            new ApiError(400, "Title and description are required")
        );
    }

    const todo = await Todo.create({
        title,
        description,
        user_id: req.user._id
    });

    return res.status(200).json(
        new ApiResponse(200, todo, "Todo created successfully")
    );
});

const updateTodo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, completed } = req.body;

    const todo = await Todo.findById(id);

    if (!todo) {
        return res.status(404).json(
            new ApiError(404, "Todo not found")
        );
    }

    // Check if the todo belongs to the logged-in user
    if (todo.user_id.toString() !== req.user._id.toString()) {
        return res.status(403).json(
            new ApiError(403, "You don't have permission to update this todo")
        );
    }

    // Update the todo
    if (title) todo.title = title;
    if (description) todo.description = description;
    if (typeof completed === "boolean") todo.completed = completed;

    await todo.save();

    return res.status(200).json(
        new ApiResponse(200, todo, "Todo updated successfully")
    );
});

const deleteTodo = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const todo = await Todo.findById(id);

    if (!todo) {
        return res.status(404).json(
            new ApiError(404, "Todo not found")
        );
    }

    // Check if the todo belongs to the logged-in user
    if (todo.user.toString() !== req.user._id.toString()) {
        return res.status(403).json(
            new ApiError(403, "You don't have permission to delete this todo")
        );
    }

    await Todo.findByIdAndDelete(id);

    return res.status(200).json(
        new ApiResponse(200, null, "Todo deleted successfully")
    );
});

const getTodos = asyncHandler(async (req, res) => {
    const todos = await Todo.find({ user_id: req.user._id });

    return res.status(200).json(
        new ApiResponse(200, todos, "Todos fetched successfully")
    );
});

const getTodoById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const todo = await Todo.findById(id);

    if (!todo) {
        return res.status(404).json(
            new ApiError(404, "Todo not found")
        );
    }

    // Check if the todo belongs to the logged-in user
    if (todo.user.toString() !== req.user._id.toString()) {
        return res.status(403).json(
            new ApiError(403, "You don't have permission to view this todo")
        );
    }

    return res.status(200).json(
        new ApiResponse(200, todo, "Todo fetched successfully")
    );
});

export {
    createTodo,
    updateTodo,
    deleteTodo,
    getTodos,
    getTodoById
}; 