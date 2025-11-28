// Global app logic - theme, auth, navigation

// Theme toggle
(function initTheme() {
  const storedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", storedTheme);

  const toggleBtn = document.getElementById("themeToggle");
  if (toggleBtn) {
    toggleBtn.textContent = storedTheme === "dark" ? "🌙" : "☀️";
    toggleBtn.addEventListener("click", () => {
      const newTheme =
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "light"
          : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
      toggleBtn.textContent = newTheme === "dark" ? "🌙" : "☀️";
    });
  }
})();

// User helper functions
function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function setUser(u) {
  if (u) localStorage.setItem("user", JSON.stringify(u));
  else localStorage.removeItem("user");
}

function isGuest() {
  const user = getUser();
  return !user || user.guest === true;
}

function canInteract() {
  const user = getUser();
  return user && !user.guest;
}

// Redirect to login if not logged in
(function gate() {
  const page = location.pathname.split("/").pop();
  const isAuthPage = ["login.html", "signup.html"].includes(page);
  const user = getUser();
  if (!user && !isAuthPage) {
    location.replace("login.html");
  }
})();

// Update navbar based on login state
function navAuth() {
  const user = getUser();
  const loginLink = document.getElementById("loginLink");
  const signupLink = document.getElementById("signupLink");
  const logoutBtn = document.getElementById("logoutBtn");

  if (!loginLink && !signupLink && !logoutBtn) {
    return;
  }

  if (user) {
    // Check if user is a guest
    if (user.guest) {
      // Guest mode: show login/signup, hide logout
      if (loginLink) loginLink.classList.remove("hide");
      if (signupLink) signupLink.classList.remove("hide");
      if (logoutBtn) logoutBtn.classList.add("hide");
      
      // clear guest on click
      if (loginLink) {
        loginLink.addEventListener("click", () => {
          setUser(null);
        });
      }
      if (signupLink) {
        signupLink.addEventListener("click", () => {
          setUser(null);
        });
      }
    } else {
      // Logged in user: hide login/signup, show logout
      if (loginLink) loginLink.classList.add("hide");
      if (signupLink) signupLink.classList.add("hide");
      if (logoutBtn) {
        logoutBtn.classList.remove("hide");
        logoutBtn.addEventListener("click", () => {
          setUser(null);
          location.href = "login.html";
        });
      }
    }
  } else {
    // No user: show login/signup
    if (loginLink) loginLink.classList.remove("hide");
    if (signupLink) signupLink.classList.remove("hide");
    if (logoutBtn) logoutBtn.classList.add("hide");
  }
}

// run when ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', navAuth);
} else {
  navAuth();
}

// Handle login and signup forms
document.addEventListener("submit", async (e) => {
  const form = e.target;

  // LOGIN
  if (form && form.id === "loginForm") {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
      const res = await fetch("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        alert("Wrong email or password.");
        return;
      }

      const data = await res.json();
      setUser(data);
      location.href = "index.html";

    } catch (err) {
      console.error(err);
      alert("Server error.");
    }
  }

  // SIGNUP
  if (form && form.id === "signupForm") {
    e.preventDefault();

    const email = document.getElementById("signupEmail").value.trim();
    const pass = document.getElementById("signupPassword").value;
    const confirm = document.getElementById("signupConfirm").value;

    if (pass.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    if (pass !== confirm) {
      alert("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/users/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass })
      });

      if (!res.ok) {
        alert("Signup failed: Email already used.");
        return;
      }

      // Auto-login after successful signup
      try {
        const loginRes = await fetch("http://localhost:3000/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: pass })
        });

        if (loginRes.ok) {
          const userData = await loginRes.json();
          setUser(userData);
          alert("Signup successful! Redirecting to your profile...");
          location.href = "profile.html";
        } else {
          alert("Signup successful! Please log in.");
          location.href = "login.html";
        }
      } catch (loginErr) {
        console.error("Auto-login error:", loginErr);
        alert("Signup successful! Please log in.");
        location.href = "login.html";
      }

    } catch (err) {
      console.error(err);
      alert("Server error.");
    }
  }
});

// Guest mode button
document.getElementById("guestBtn")?.addEventListener("click", () => {
  setUser({ guest: true });
  location.href = "index.html";
});

// Hide navbar when scrolling down
(function hideOnScroll() {
  const nav = document.getElementById("navbar");
  let lastY = window.scrollY;

  window.addEventListener(
    "scroll",
    () => {
      const currentY = window.scrollY;
      nav.style.transform =
        currentY > lastY && currentY > 60
          ? "translateY(-100%)"
          : "translateY(0)";
      lastY = currentY;
    },
    { passive: true }
  );
})();

// Highlight current page in navbar
(function highlightActiveLink() {
  const currentPage = location.pathname.split("/").pop();
  document.querySelectorAll(".links a[href]").forEach((link) => {
    const linkPage = link.getAttribute("href");
    link.classList.toggle("active", linkPage === currentPage);
  });
})();

// Hide create buttons for guests
document.addEventListener("DOMContentLoaded", () => {
  if (isGuest()) {
    document
      .querySelectorAll(
        "#addPostBtn, #addPostForm, #createCommBtn, #createCommForm, #addPlaceBtn, #addModal"
      )
      .forEach((el) => el && (el.style.display = "none"));

    const likeBtn = document.getElementById("likeBtn");
    if (likeBtn) {
      likeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        alert("Login to like posts.");
      });
    }
  }
});
