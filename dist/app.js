"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./config/env");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middlewares/errorHandler");
const notFoundHandler_1 = require("./middlewares/notFoundHandler");
const app = (0, express_1.default)();
// Security Middlewares
app.use((0, helmet_1.default)());
const allowedOrigins = env_1.ENV.CORS_ORIGIN.split(',');
const corsOptions = {
    origin: (origin, callback) => {
        console.log('CORS Check:', origin);
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        else {
            console.log('Warning: Origin not in allowed list, but allowing for dev:', origin);
            return callback(null, true); // Temporarily allow all to prevent fetch errors
        }
    },
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
// Parsers
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Logger
if (env_1.ENV.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
// API Routes
app.use('/api/v1', routes_1.default);
const path_1 = __importDefault(require("path"));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// 404 Handler
app.use(notFoundHandler_1.notFoundHandler);
// Global Error Handler
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map