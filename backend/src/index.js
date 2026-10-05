const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Fail-safe environment variable checks
if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
  process.exit(1);
}
if (!process.env.ADMIN_EMAIL) {
  console.error("FATAL ERROR: ADMIN_EMAIL is not defined in .env file.");
  process.exit(1);
}
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const savingsRoutes = require('./routes/savingsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adRoutes = require('./routes/adRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const chatRoutes = require('./routes/chatRoutes');
const authenticate = require('./middleware/authMiddleware');
const adminMiddleware = require('./middleware/adminMiddleware');
const { initCronJobs } = require('./services/cronJobs');
const { initSocket } = require('./socket');
const auditMiddleware = require('./middleware/auditMiddleware');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

// Trust reverse proxy (e.g. Nginx, Cloudflare) for rate limiting and real IP
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());

const corsOptions = {
  origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'] : '*',
  credentials: true
};
app.use(cors(corsOptions));

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per `window` (here, per 15 minutes)
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true, 
  legacyHeaders: false,
});
app.use('/api', globalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Global Audit Logger
app.use(auditMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/savings', authenticate, savingsRoutes);
app.use('/api/admin', authenticate, adminMiddleware, adminRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', authenticate, chatRoutes);

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>FinTrack API Status</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f8fafc; color: #334155; }
          .container { text-align: center; padding: 3rem; background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; }
          h1 { color: #0f172a; margin-top: 0; margin-bottom: 0.5rem; font-size: 1.8rem; }
          p { margin-bottom: 1.5rem; color: #64748b; }
          .status { display: inline-flex; align-items: center; gap: 0.5rem; background: #dcfce7; color: #166534; padding: 0.35rem 1rem; border-radius: 9999px; font-weight: 600; font-size: 0.875rem; letter-spacing: 0.025em; }
          .dot { width: 10px; height: 10px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 0 3px #bbf7d0; animation: pulse 2s infinite; }
          @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); } 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>FinTrack API</h1>
          <p>The backend service is up and running.</p>
          <div class="status"><div class="dot"></div> System Online</div>
        </div>
      </body>
    </html>
  `);
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
});

// Initialize WebSockets
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  initCronJobs();
});
