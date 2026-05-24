let currentUser = null;
let allTasks = [];

/*
|--------------------------------------------------------------------------
| ELEMENTS
|--------------------------------------------------------------------------
*/

const taskInput =
    document.getElementById("taskInput");

const priorityInput =
    document.getElementById("priority");

const categoryInput =
    document.getElementById("category");

const dueDateInput =
    document.getElementById("dueDate");

const statusInput =
    document.getElementById("status");

const searchInput =
    document.getElementById("searchInput");

const filterPriority =
    document.getElementById("filterPriority");

const themeBtn =
    document.getElementById("themeBtn");

/*
|--------------------------------------------------------------------------
| TOAST
|--------------------------------------------------------------------------
*/
function closeModal() {

    document
        .getElementById(
            "modalOverlay"
        )
        .classList
        .remove("show");
}

function openModal(
    title,
    message
) {

    document
        .getElementById(
            "modalTitle"
        )
        .textContent = title;

    document
        .getElementById(
            "modalMessage"
        )
        .textContent = message;

    document
        .getElementById(
            "modalInputs"
        )
        .innerHTML = "";

    document
        .getElementById(
            "modalOverlay"
        )
        .classList
        .add("show");
}

function showConfirm(message) {

    return new Promise(resolve => {

        openModal(
            "Confirm",
            message
        );

        document
            .getElementById(
                "confirmBtn"
            )
            .onclick = () => {

                closeModal();

                resolve(true);
            };

        document
            .getElementById(
                "cancelBtn"
            )
            .onclick = () => {

                closeModal();

                resolve(false);
            };
    });
}

function showEditModal(task) {

    return new Promise(resolve => {

        openModal(
            "Edit Task",
            ""
        );

        document
            .getElementById(
                "modalInputs"
            )
            .innerHTML = `

            <input
                id="editTitle"
                value="${task.title}"
                placeholder="Title"
            >

            <input
                id="editCategory"
                value="${task.category}"
                placeholder="Category"
            >

            <input
                id="editDueDate"
                type="date"
                value="${
                    task.due_date || ""
                }"
            >

            <select id="editPriority">

                <option
                    value="low"
                    ${
                        task.priority==="low"
                        ? "selected"
                        : ""
                    }
                >
                    Low
                </option>

                <option
                    value="medium"
                    ${
                        task.priority==="medium"
                        ? "selected"
                        : ""
                    }
                >
                    Medium
                </option>

                <option
                    value="high"
                    ${
                        task.priority==="high"
                        ? "selected"
                        : ""
                    }
                >
                    High
                </option>

            </select>

            <select id="editStatus">

                <option
                    value="todo"
                    ${
                        task.status==="todo"
                        ? "selected"
                        : ""
                    }
                >
                    To Do
                </option>

                <option
                    value="doing"
                    ${
                        task.status==="doing"
                        ? "selected"
                        : ""
                    }
                >
                    Doing
                </option>

                <option
                    value="done"
                    ${
                        task.status==="done"
                        ? "selected"
                        : ""
                    }
                >
                    Done
                </option>

            </select>
        `;

        document
            .getElementById(
                "confirmBtn"
            )
            .onclick = () => {

                resolve({

                    title:
                        document
                        .getElementById(
                            "editTitle"
                        )
                        .value,

                    category:
                        document
                        .getElementById(
                            "editCategory"
                        )
                        .value,

                    due_date:
                        document
                        .getElementById(
                            "editDueDate"
                        )
                        .value,

                    priority:
                        document
                        .getElementById(
                            "editPriority"
                        )
                        .value,

                    status:
                        document
                        .getElementById(
                            "editStatus"
                        )
                        .value
                });

                closeModal();
            };

        document
            .getElementById(
                "cancelBtn"
            )
            .onclick = () => {

                closeModal();

                resolve(null);
            };
    });
}

function showToast(message) {

    const toast =
        document.getElementById("toast");

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);
}

/*
|--------------------------------------------------------------------------
| DARK MODE
|--------------------------------------------------------------------------
*/

if (
    localStorage.getItem("theme")
    === "dark"
) {

    document.body.classList.add("dark");

    if (themeBtn) {

        themeBtn.textContent =
            "☀️";
    }
}

themeBtn?.addEventListener(
    "click",
    () => {

        document.body.classList.toggle(
            "dark"
        );

        const dark =
            document.body.classList.contains(
                "dark"
            );

        localStorage.setItem(
            "theme",
            dark
                ? "dark"
                : "light"
        );

        themeBtn.textContent =
            dark
                ? "☀️"
                : "🌙";
    }
);

/*
|--------------------------------------------------------------------------
| AUTH
|--------------------------------------------------------------------------
*/

async function checkAuth() {

    try {

        const res =
            await fetch("/me");

        if (!res.ok) {

            location.href =
                "/login.html";

            return;
        }

        currentUser =
            await res.json();

        document.getElementById(
            "welcome"
        ).textContent =
            `👋 ${currentUser.username}`;

        await loadProfile();
        await loadTasks();
        await updateStats();

    } catch {

        location.href =
            "/login.html";
    }
}

/*
|--------------------------------------------------------------------------
| PROFILE
|--------------------------------------------------------------------------
*/

async function loadProfile() {

    try {

        const res =
            await fetch("/profile");

        const profile =
            await res.json();

        document.getElementById(
            "userBio"
        ).textContent =
            profile.bio ||
            "No bio yet";

        if (
            profile.avatar &&
            profile.avatar.trim()
        ) {

            document.getElementById(
                "avatarPreview"
            ).src =
                profile.avatar;
        }

    } catch {

        console.error(
            "Profile load failed"
        );
    }
}

async function editProfile() {

    const currentBio =
        document.getElementById(
            "userBio"
        ).textContent;

    const currentAvatar =
        document.getElementById(
            "avatarPreview"
        ).src;

    openModal(
        "Edit Profile",
        ""
    );

    document
        .getElementById(
            "modalInputs"
        )
        .innerHTML = `

        <input
            id="profileAvatar"
            placeholder="Avatar URL"
            value="${currentAvatar}"
        >

        <input
            id="profileBio"
            placeholder="Bio"
            value="${currentBio}"
        >
    `;

    return new Promise(resolve => {

        document
            .getElementById(
                "confirmBtn"
            )
            .onclick =
            async () => {

                const avatar =
                    document
                    .getElementById(
                        "profileAvatar"
                    )
                    .value;

                const bio =
                    document
                    .getElementById(
                        "profileBio"
                    )
                    .value;

                await fetch(
                    "/profile",
                    {
                        method:"PUT",

                        headers:{
                            "Content-Type":
                            "application/json"
                        },

                        body:JSON.stringify({
                            avatar,
                            bio
                        })
                    }
                );

                closeModal();

                await loadProfile();

                showToast(
                    "Profile updated"
                );

                resolve();
            };

        document
            .getElementById(
                "cancelBtn"
            )
            .onclick =
            () => {

                closeModal();

                resolve();
            };
    });
}

/*
|--------------------------------------------------------------------------
| TASKS
|--------------------------------------------------------------------------
*/

async function loadTasks() {

    const res =
        await fetch("/tasks");

    allTasks =
        await res.json();

    renderTasks();
}

function renderTasks() {

    const todoColumn =
        document.getElementById(
            "todoColumn"
        );

    const doingColumn =
        document.getElementById(
            "doingColumn"
        );

    const doneColumn =
        document.getElementById(
            "doneColumn"
        );

    todoColumn.innerHTML = "";
    doingColumn.innerHTML = "";
    doneColumn.innerHTML = "";

    const search =
        searchInput.value
            .toLowerCase()
            .trim();

    const filter =
        filterPriority.value;

    let tasks =
        [...allTasks];

    if (search) {

        tasks =
            tasks.filter(task =>
                task.title
                    .toLowerCase()
                    .includes(search)
            );
    }

    if (filter) {

        tasks =
            tasks.filter(task =>
                task.priority === filter
            );
    }

    tasks.forEach(task => {

        const overdue =
            task.due_date &&
            new Date(task.due_date)
            <
            new Date() &&
            !task.completed;

        const card =
            document.createElement(
                "div"
            );

        card.className =
            overdue
            ? "task overdue"
            : "task";

        card.innerHTML = `

            <div class="task-title">
                ${task.title}
            </div>

            <div class="meta">

                <span class="badge ${task.priority}">
                    ${task.priority}
                </span>

                <span class="category">
                    📁 ${task.category}
                </span>

                ${
                    task.due_date
                    ?
                    `
                    <span class="date">
                        📅 ${task.due_date}
                    </span>
                    `
                    :
                    ""
                }

            </div>

            <div class="actions">

                <button
                    class="complete-btn"
                    onclick="toggleTask(${task.id})"
                >
                    ✓
                </button>

                <button
                    onclick="editTask(${task.id})"
                >
                    ✏️
                </button>

                <button
                    class="delete-btn"
                    onclick="deleteTask(${task.id})"
                >
                    ×
                </button>

            </div>
        `;

        if (
            task.status === "doing"
        ) {

            doingColumn.appendChild(
                card
            );

        } else if (
            task.status === "done"
        ) {

            doneColumn.appendChild(
                card
            );

        } else {

            todoColumn.appendChild(
                card
            );
        }
    });
}

async function addTask() {

    const title =
        taskInput.value.trim();

    if (!title) {

        showToast(
            "Enter a task"
        );

        return;
    }

    await fetch(
        "/tasks",
        {
            method: "POST",

            headers: {
                "Content-Type":
                "application/json"
            },

            body: JSON.stringify({

                title,

                priority:
                    priorityInput.value,

                category:
                    categoryInput.value
                    || "General",

                due_date:
                    dueDateInput.value,

                status:
                    statusInput.value
            })
        }
    );

    taskInput.value = "";
    categoryInput.value = "";
    dueDateInput.value = "";

    await loadTasks();
    await updateStats();

    showToast(
        "Task added"
    );
}

async function editTask(id) {

    const task =
        allTasks.find(
            t => t.id === id
        );

    if (!task) return;

    const data =
        await showEditModal(
            task
        );

    if (!data) return;

    await fetch(
        `/tasks/${id}`,
        {
            method:"PUT",

            headers:{
                "Content-Type":
                "application/json"
            },

            body:JSON.stringify(
                data
            )
        }
    );

    await loadTasks();
    await updateStats();

    showToast(
        "Task updated"
    );
}

async function toggleTask(id) {

    await fetch(
        `/tasks/${id}/toggle`,
        {
            method: "PUT"
        }
    );

    await loadTasks();
    await updateStats();
}

async function deleteTask(id) {

    const ok =
        await showConfirm(
            "Delete this task?"
        );

    if (!ok) return;

    await fetch(
        `/tasks/${id}`,
        {
            method:"DELETE"
        }
    );

    await loadTasks();
    await updateStats();

    showToast(
        "Task deleted"
    );
}

async function clearCompleted() {

    const ok =
        await showConfirm(
            "Delete completed tasks?"
        );

    if (!ok) return;

    await fetch(
        "/tasks/completed/clear",
        {
            method:"DELETE"
        }
    );

    await loadTasks();
    await updateStats();

    showToast(
        "Completed tasks removed"
    );
}

/*
|--------------------------------------------------------------------------
| STATS
|--------------------------------------------------------------------------
*/

async function updateStats() {

    const res =
        await fetch("/stats");

    const stats =
        await res.json();

    document.getElementById(
        "totalTasks"
    ).textContent =
        stats.total;

    document.getElementById(
        "completedTasks"
    ).textContent =
        stats.completed;

    document.getElementById(
        "highPriorityTasks"
    ).textContent =
        stats.highPriority;

    document.getElementById(
        "todoCount"
    ).textContent =
        stats.todo;

    document.getElementById(
        "doingCount"
    ).textContent =
        stats.doing;

    document.getElementById(
        "doneCount"
    ).textContent =
        stats.done;
}

/*
|--------------------------------------------------------------------------
| LOGOUT
|--------------------------------------------------------------------------
*/

async function logout() {

    await fetch(
        "/logout",
        {
            method: "POST"
        }
    );

    location.href =
        "/login.html";
}

/*
|--------------------------------------------------------------------------
| EVENTS
|--------------------------------------------------------------------------
*/

taskInput?.addEventListener(
    "keypress",
    e => {

        if (e.key === "Enter") {

            addTask();
        }
    }
);

searchInput?.addEventListener(
    "input",
    renderTasks
);

filterPriority?.addEventListener(
    "change",
    renderTasks
);

/*
|--------------------------------------------------------------------------
| START
|--------------------------------------------------------------------------
*/

checkAuth();