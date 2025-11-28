// Community page - posts feed with likes and comments

let posts = [];
let current = null;

// Load posts from API
async function loadPosts() {
  try {
    const user = getUser?.();
    const userId = user && user.id ? user.id : 0;

    const res = await fetch(
      `https://hawalibnan-production.up.railway.app/api/posts?user_id=${userId}`
    );
    if (!res.ok) {
      console.error("Failed to load posts:", res.status);
      return;
    }
    const data = await res.json();

    // transform backend data to frontend format - Copilot helped with the !! conversion
    posts = data.map((row) => ({
      dbId: row.id,
      user_id: row.user_id,
      user: row.email ? "@" + row.email.split("@")[0] : "@user" + row.user_id,
      img: row.image || "",
      text: row.caption || "",
      likesCount: row.likes_count || 0,
      commentsCount: row.comments_count || 0,
      likedByUser: !!row.liked_by_user
    }));

    renderFeed();
    return posts; // Return posts for promise chaining
  } catch (err) {
    console.error("Error loading posts:", err);
    throw err; // Re-throw for promise handling
  }
}

// DOM elements
let feed, addPostBtn, addPostModal, closeAddPost, backdropAddPost, addPostForm;
let postImage, postImageUrl, postCaption;
let threadModal, threadImg, threadUser, threadText, likeBtn, likeCount;
let comments, closeThread, replyForm, replyInput, backdropThread;



// Utility functions
function lockScroll(lock) {
  document.body.style.overflow = lock ? "hidden" : "";
}

function createReviewElement(user, text) {
  const div = document.createElement("div");
  div.className = "review";
  div.textContent = `${user}: ${text}`;
  return div;
}

function getUsername() {
  const user = getUser();
  return user ? "@" + user.email.split("@")[0] : "@guest";
}

// Render posts feed
function renderFeed() {
  // If I'm on profile.html, feed doesn't exist, so just don't blow up
  if (!feed) return;

  feed.innerHTML = "";

  const currentUser = getUser();

  // Your post card UI EXACTLY as you wrote it
  posts.forEach((p, i) => {
    const el = document.createElement("article");
    el.className = "post full";

    el.innerHTML = `
      <div class="post-header">
        <h3>${p.user}</h3>
        ${
          currentUser && currentUser.id === p.user_id
            ? `<button class="deleteBtn" data-id="${p.dbId}">Delete</button>`
            : ""
        }
      </div>
      <img src="${p.img}" alt="">
      <div class="post-body">
        <p>${p.text}</p>
        <p class="small muted">${p.likesCount} likes · ${p.commentsCount} comments</p>
      </div>`;

    el.addEventListener("click", () => openThread(i));

    const delBtn = el.querySelector(".deleteBtn");
    if (delBtn) {
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deletePost(delBtn.dataset.id);
      });
    }

    feed.appendChild(el);
  });
}

// =========================================================
/* DELETE POST (unchanged) */
// =========================================================
async function deletePost(id) {
  const user = getUser();
  if (!user) return alert("Not logged in.");

  const ok = confirm("Are you sure you want to delete this post?");
  if (!ok) return;

  try {
    const res = await fetch(`https://hawalibnan-production.up.railway.app/api/posts/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id })
    });

    if (!res.ok) {
      console.error("Delete failed with status:", res.status);
      alert("Could not delete post.");
      return;
    }

    await loadPosts();
  } catch (err) {
    console.error("Error deleting post:", err);
  }
}

// =========================================================
/* THREAD MODAL (unchanged) */
// =========================================================
async function openThread(i) {
  if (!posts[i]) return;
  
  current = posts[i];

  threadImg.src = current.img;
  threadUser.textContent = current.user;
  threadText.textContent = current.text;
  likeCount.textContent = `${current.likesCount} likes`;

  likeBtn.classList.toggle("hearted", current.likedByUser);

  comments.innerHTML = "";

  try {
    const res = await fetch(
      `https://hawalibnan-production.up.railway.app/api/posts/${current.dbId}/comments`
    );
    const data = await res.json();

    data.forEach((c) => {
      const username = "@" + c.email.split("@")[0];
      comments.appendChild(createReviewElement(username, c.text));
    });
  } catch (e) {
    console.error("Error loading comments:", e);
  }

  threadModal.classList.remove("hidden");
  lockScroll(true);
}

function closeThreadFn() {
  threadModal.classList.add("hidden");
  lockScroll(false);
}

function setupEventListeners() {
  if (closeThread) closeThread.addEventListener("click", closeThreadFn);
  if (backdropThread) backdropThread.addEventListener("click", closeThreadFn);

  // Like button
  if (likeBtn) {
    likeBtn.addEventListener("click", async (e) => {
      e.stopImmediatePropagation();

      if (!canInteract()) {
        alert("Login to like posts.");
        return;
      }

      const user = getUser();
      if (!user) return;

      const isLiked = current.likedByUser;
      const endpoint = isLiked ? "unlike" : "like";

      try {
        const res = await fetch(`https://hawalibnan-production.up.railway.app/api/posts/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            post_id: current.dbId
          })
        });

        if (!res.ok) return;

        current.likedByUser = !isLiked;
        current.likesCount += isLiked ? -1 : 1;

        likeBtn.classList.toggle("hearted", current.likedByUser);
        likeCount.textContent = `${current.likesCount} likes`;

        renderFeed();
      } catch (err) {
        console.error("Like error:", err);
      }
    });
  }

  // Add post stuff
  if (addPostBtn) {
    addPostBtn.addEventListener("click", () => {
      if (addPostModal) {
        addPostModal.classList.remove("hidden");
        lockScroll(true);
      }
    });
  }

  function closeAddPostFn() {
    if (addPostModal) {
      addPostModal.classList.add("hidden");
      lockScroll(false);
    }
  }

  if (closeAddPost) closeAddPost.addEventListener("click", closeAddPostFn);
  if (backdropAddPost) backdropAddPost.addEventListener("click", closeAddPostFn);

  if (addPostForm) {
    addPostForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const caption = postCaption?.value.trim() || "Shared a photo!";
      const imageUrl = postImageUrl?.value.trim();

      if (!imageUrl) {
        alert("For now, please enter an image URL.");
        return;
      }

      await addPostToServer(caption, imageUrl);
      await loadPosts();

      addPostForm.reset();
      closeAddPostFn();
    });
  }

  // Reply form
  if (replyForm) {
    replyForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!canInteract()) {
        replyInput.value = "";
        return alert("Please log in.");
      }

      const txt = replyInput.value.trim();
      if (!txt) return;

      const user = getUser();

      try {
        const res = await fetch("https://hawalibnan-production.up.railway.app/api/posts/comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            post_id: current.dbId,
            user_id: user.id,
            text: txt
          })
        });

        if (!res.ok) return;

        current.commentsCount++;
        renderFeed();

        openThread(posts.indexOf(current));
      } catch (err) {
        console.error("Comment error:", err);
      }

      replyInput.value = "";
    });
  }
}

// Update initDOMElements to also set up event listeners
function initDOMElements() {
  feed = document.getElementById("feed");
  addPostBtn = document.getElementById("addPostBtn");
  addPostModal = document.getElementById("addPostModal");
  closeAddPost = document.getElementById("closeAddPost");
  backdropAddPost = document.getElementById("backdropAddPost");
  addPostForm = document.getElementById("addPostForm");
  postImage = document.getElementById("postImage");
  postImageUrl = document.getElementById("postImageUrl");
  postCaption = document.getElementById("postCaption");

  threadModal = document.getElementById("threadModal");
  threadImg = document.getElementById("threadImg");
  threadUser = document.getElementById("threadUser");
  threadText = document.getElementById("threadText");
  likeBtn = document.getElementById("likeBtn");
  likeCount = document.getElementById("likeCount");
  comments = document.getElementById("comments");
  closeThread = document.getElementById("closeThread");
  replyForm = document.getElementById("replyForm");
  replyInput = document.getElementById("replyInput");
  backdropThread = document.getElementById("backdropThread");
  
  setupEventListeners();
}

// wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDOMElements);
} else {
  initDOMElements();
}

// =========================================================
// ADD POST (unchanged)
// =========================================================
async function addPostToServer(caption, imageUrl) {
  const user = getUser();
  if (!user) {
    alert("Not logged in.");
    return;
  }

  try {
    const res = await fetch("https://hawalibnan-production.up.railway.app/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        caption: caption,
        image: imageUrl
      })
    });

    if (!res.ok) {
      alert("Could not create post.");
    }
  } catch (err) {
    alert("Server error while creating post.");
  }
}


// =========================================================
// BRIDGE FOR PROFILE PAGE
// =========================================================
// Copilot helped a lot with this - bridging React profile page to vanilla JS community modal
window.openPostThreadById = function (postId) {
  let index = posts.findIndex(p => Number(p.dbId) === Number(postId));
  
  if (index !== -1) {
    openThread(index);
    return;
  }
  
  // reload if not found (sometimes posts load late) - Copilot suggested this fallback
  loadPosts()
    .then(() => {
      index = posts.findIndex(p => Number(p.dbId) === Number(postId));
      if (index !== -1) {
        openThread(index);
      }
    })
    .catch(err => {
      console.error("Error:", err);
    });
};

window.openPostThread = function (postId) {
  return window.openPostThreadById(postId);
};

// =========================================================
// INIT
// =========================================================
loadPosts(); // TODO: maybe add loading state
