




folder structure information

config/
└── Database connection & environment configuration

models/
└── MongoDB schemas (User, File, Job)

routes/
└── API endpoints (/auth, /pdf, /ai)

controllers/
└── Business logic for each route

middleware/
└── JWT auth, upload handling, validation

uploads/
└── Uploaded PDFs and generated files

app.js
└── Main Express application entry point

.env
└── Secrets, Mongo URI, API keys

README.md
└── Project documentation