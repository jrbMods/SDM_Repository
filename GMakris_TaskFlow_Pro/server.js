const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();
const PORT = 3000;

app.use(express.json());

app.use(
    session({
        secret: "change-this-secret-key",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24
        }
    })
);

app.use(express.static("public"));

const db = new sqlite3.Database("./database.db");

/*
|--------------------------------------------------------------------------
| DATABASE
|--------------------------------------------------------------------------
*/

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS profiles (
            user_id INTEGER PRIMARY KEY,
            avatar TEXT DEFAULT '',
            bio TEXT DEFAULT '',

            FOREIGN KEY(user_id)
            REFERENCES users(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS tasks (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            title TEXT NOT NULL,

            completed INTEGER DEFAULT 0,

            priority TEXT DEFAULT 'medium',

            category TEXT DEFAULT 'General',

            due_date TEXT,

            status TEXT DEFAULT 'todo',

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            user_id INTEGER NOT NULL,

            FOREIGN KEY(user_id)
            REFERENCES users(id)
        )
    `);
});

/*
|--------------------------------------------------------------------------
| AUTH MIDDLEWARE
|--------------------------------------------------------------------------
*/

function auth(req, res, next) {

    if (!req.session.userId) {

        return res.status(401).json({
            error: "Unauthorized"
        });
    }

    next();
}

/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
*/

app.post("/register", async (req, res) => {

    try {

        const {
            username,
            password
        } = req.body;

        if (!username || !password) {

            return res.status(400).json({
                error: "Missing fields"
            });
        }

        const hash =
            await bcrypt.hash(password, 10);

        db.run(
            `
            INSERT INTO users
            (username,password)
            VALUES(?,?)
            `,
            [username, hash],
            function(err) {

                if (err) {

                    return res.status(400).json({
                        error:
                        "Username already exists"
                    });
                }

                db.run(
                    `
                    INSERT INTO profiles
                    (user_id)
                    VALUES(?)
                    `,
                    [this.lastID]
                );

                res.json({
                    success: true
                });
            }
        );

    } catch {

        res.status(500).json({
            error: "Server error"
        });
    }
});

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

app.post("/login", (req, res) => {

    const {
        username,
        password
    } = req.body;

    db.get(
        `
        SELECT *
        FROM users
        WHERE username=?
        `,
        [username],
        async (err, user) => {

            if (err || !user) {

                return res.status(401).json({
                    error:
                    "Invalid credentials"
                });
            }

            const match =
                await bcrypt.compare(
                    password,
                    user.password
                );

            if (!match) {

                return res.status(401).json({
                    error:
                    "Invalid credentials"
                });
            }

            req.session.userId =
                user.id;

            req.session.username =
                user.username;

            res.json({
                success: true
            });
        }
    );
});

/*
|--------------------------------------------------------------------------
| LOGOUT
|--------------------------------------------------------------------------
*/

app.post("/logout", (req, res) => {

    req.session.destroy(() => {

        res.json({
            success: true
        });
    });
});

/*
|--------------------------------------------------------------------------
| CURRENT USER
|--------------------------------------------------------------------------
*/

app.get("/me", auth, (req, res) => {

    res.json({
        id: req.session.userId,
        username:
            req.session.username
    });
});

/*
|--------------------------------------------------------------------------
| PROFILE
|--------------------------------------------------------------------------
*/

app.get("/profile", auth, (req, res) => {

    db.get(
        `
        SELECT *
        FROM profiles
        WHERE user_id=?
        `,
        [req.session.userId],
        (err, profile) => {

            if (err) {

                return res
                    .status(500)
                    .json(err);
            }

            res.json(
                profile || {
                    avatar: "",
                    bio: ""
                }
            );
        }
    );
});

app.put("/profile", auth, (req, res) => {

    const {
        avatar,
        bio
    } = req.body;

    db.run(
        `
        UPDATE profiles
        SET avatar=?,
            bio=?
        WHERE user_id=?
        `,
        [
            avatar || "",
            bio || "",
            req.session.userId
        ],
        err => {

            if (err) {

                return res
                    .status(500)
                    .json(err);
            }

            res.json({
                success: true
            });
        }
    );
});

/*
|--------------------------------------------------------------------------
| TASKS
|--------------------------------------------------------------------------
*/

app.get("/tasks", auth, (req, res) => {

    db.all(
        `
        SELECT *
        FROM tasks
        WHERE user_id=?
        ORDER BY created_at DESC
        `,
        [req.session.userId],
        (err, rows) => {

            if (err) {

                return res
                    .status(500)
                    .json(err);
            }

            res.json(rows);
        }
    );
});

app.post("/tasks", auth, (req, res) => {

    const {
        title,
        priority,
        category,
        due_date,
        status
    } = req.body;

    if (!title) {

        return res.status(400).json({
            error: "Title required"
        });
    }

    db.run(
        `
        INSERT INTO tasks
        (
            title,
            priority,
            category,
            due_date,
            status,
            user_id
        )
        VALUES(?,?,?,?,?,?)
        `,
        [
            title,
            priority || "medium",
            category || "General",
            due_date || null,
            status || "todo",
            req.session.userId
        ],
        function(err) {

            if (err) {

                return res
                    .status(500)
                    .json(err);
            }

            res.json({
                success: true,
                id: this.lastID
            });
        }
    );
});

/*
|--------------------------------------------------------------------------
| EDIT TASK
|--------------------------------------------------------------------------
*/

app.put("/tasks/:id", auth, (req, res) => {

    const {
        title,
        priority,
        category,
        due_date,
        status
    } = req.body;

    db.run(
        `
        UPDATE tasks

        SET
            title=?,
            priority=?,
            category=?,
            due_date=?,
            status=?

        WHERE
            id=?
        AND
            user_id=?
        `,
        [
            title,
            priority,
            category,
            due_date,
            status,
            req.params.id,
            req.session.userId
        ],
        err => {

            if (err) {

                return res
                    .status(500)
                    .json(err);
            }

            res.json({
                success: true
            });
        }
    );
});

/*
|--------------------------------------------------------------------------
| TOGGLE COMPLETE
|--------------------------------------------------------------------------
*/

app.put(
    "/tasks/:id/toggle",
    auth,
    (req, res) => {

        db.run(
            `
            UPDATE tasks

            SET completed =
                NOT completed

            WHERE
                id=?
            AND
                user_id=?
            `,
            [
                req.params.id,
                req.session.userId
            ],
            err => {

                if (err) {

                    return res
                        .status(500)
                        .json(err);
                }

                res.json({
                    success: true
                });
            }
        );
    }
);

/*
|--------------------------------------------------------------------------
| DELETE TASK
|--------------------------------------------------------------------------
*/

app.delete(
    "/tasks/:id",
    auth,
    (req, res) => {

        db.run(
            `
            DELETE FROM tasks

            WHERE id=?
            AND user_id=?
            `,
            [
                req.params.id,
                req.session.userId
            ],
            err => {

                if (err) {

                    return res
                        .status(500)
                        .json(err);
                }

                res.json({
                    success: true
                });
            }
        );
    }
);

/*
|--------------------------------------------------------------------------
| CLEAR COMPLETED
|--------------------------------------------------------------------------
*/

app.delete(
    "/tasks/completed/clear",
    auth,
    (req, res) => {

        db.run(
            `
            DELETE FROM tasks

            WHERE
                completed=1
            AND
                user_id=?
            `,
            [req.session.userId],
            err => {

                if (err) {

                    return res
                        .status(500)
                        .json(err);
                }

                res.json({
                    success: true
                });
            }
        );
    }
);

/*
|--------------------------------------------------------------------------
| STATS
|--------------------------------------------------------------------------
*/

app.get("/stats", auth, (req, res) => {

    db.get(
        `
        SELECT

        COUNT(*) AS total,

        SUM(
            CASE
            WHEN completed=1
            THEN 1
            ELSE 0
            END
        ) AS completed,

        SUM(
            CASE
            WHEN priority='high'
            THEN 1
            ELSE 0
            END
        ) AS highPriority,

        SUM(
            CASE
            WHEN status='todo'
            THEN 1
            ELSE 0
            END
        ) AS todo,

        SUM(
            CASE
            WHEN status='doing'
            THEN 1
            ELSE 0
            END
        ) AS doing,

        SUM(
            CASE
            WHEN status='done'
            THEN 1
            ELSE 0
            END
        ) AS done

        FROM tasks

        WHERE user_id=?
        `,
        [req.session.userId],
        (err, row) => {

            if (err) {

                return res
                    .status(500)
                    .json(err);
            }

            res.json({
                total:
                    row.total || 0,

                completed:
                    row.completed || 0,

                highPriority:
                    row.highPriority || 0,

                todo:
                    row.todo || 0,

                doing:
                    row.doing || 0,

                done:
                    row.done || 0
            });
        }
    );
});

app.listen(PORT, () => {

    console.log(
        `🚀 Server running on http://localhost:${PORT}`
    );
});