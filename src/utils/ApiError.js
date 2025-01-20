// class ApiError extends Error {
//     constructor(
//         statusCode,
//         message = "Something went wrong",
//         errors = [],
//         stack = "",
//     ) {
//         super(message),
//             this.statusCode = statusCode,
//             this.data = null,
//             this.success = false,
//             this.errors = errors,
//             this.message = message,
//             this.stack = stack

//             if (stack) {
//                 this.stack = stack
//             } else {
//                 Error.captureStackTrace(this, this.constructor);
//             }
//     }
// }

// export default ApiError;

class ApiError {

    constructor(
        statusCode,
        message = "Failed"
    ) {
        this.statusCode = statusCode,
            this.message = message
    }
}

export { ApiError }