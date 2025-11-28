// Explore page - loads places from backend API and handles add/delete

let places = [];

// DOM elements
const cardsEl = document.getElementById("cards");
const searchInput = document.getElementById("searchInput");
const activeCategoryEl = document.getElementById("activeCategory");

const modal = document.getElementById("modal");
const backdrop = document.getElementById("backdrop");
const closeModalBtn = document.getElementById("closeModal");

const modalImg = document.getElementById("modalImg");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const modalCategory = document.getElementById("modalCategory");
const modalLocationLink = document.getElementById("modalLocationLink");
const modalReviews = document.getElementById("modalReviews");

const addBtn = document.getElementById("addPlaceBtn");
const addModal = document.getElementById("addModal");
const closeAdd = document.getElementById("closeAdd");
const backdropAdd = document.getElementById("backdropAdd");

const addForm = document.getElementById("addForm");
const addName = document.getElementById("addName");
const addCategory = document.getElementById("addCategory");
const addDesc = document.getElementById("addDesc");
const addLocation = document.getElementById("addLocation");
const addImage = document.getElementById("addImage");
const addFile = document.getElementById("addFile");

// Helper functions
function lockScroll(lock) {
  document.body.style.overflow = lock ? "hidden" : "";
}

function getQueryCategory() {
  const params = new URLSearchParams(window.location.search);
  return params.get("cat") || "";
}

function isValidUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Load places from API
async function loadPlaces() {
  try {
    const res = await fetch("http://localhost:3000/api/places");
    if (!res.ok) {
      console.error("Failed to load places:", res.status);
      return;
    }
    places = await res.json();
    applyFilters();
  } catch (err) {
    console.error("Error loading places:", err);
  }
}

// Render place cards
function renderCards(list) {
  if (!cardsEl) return;
  cardsEl.classList.add("masonry");
  cardsEl.innerHTML = "";

  if (!list.length) {
    cardsEl.innerHTML =
      '<p class="muted" style="text-align:center;margin-top:2rem;">No results found.</p>';
    return;
  }

  const currentUser = getUser?.();

  list.forEach((p) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <img src="${p.image}" alt="${p.name}">
      <div class="body">
        <div class="title">${p.name}</div>
        <div class="meta">${p.category}</div>
      </div>
    `;
    card.addEventListener("click", () => openModal(p.id));

    // Check if user can delete this place (must be logged in and be the creator)
    if (currentUser && p.created_by && Number(p.created_by) === Number(currentUser.id)) {
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "card-delete-btn";
      deleteBtn.title = "Delete this place";
      deleteBtn.innerHTML = "✕";
      deleteBtn.addEventListener("click", (event) => {
        event.stopPropagation(); // Copilot suggested this to prevent card click
        confirmDeletePlace(p.id, p.name);
      });
      card.appendChild(deleteBtn);
    }

    cardsEl.appendChild(card);
  });
}

async function confirmDeletePlace(placeId, placeName) {
  const user = getUser?.();
  if (!user) {
    alert("Please log in first.");
    return;
  }

  const confirmed = confirm(
    `Delete "${placeName}"? This action cannot be undone.`
  );
  if (!confirmed) return;

  try {
    const res = await fetch(`http://localhost:3000/api/places/${placeId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id }),
    });

    if (!res.ok) {
      const message =
        res.status === 403
          ? "You can only delete places you created."
          : "Failed to delete place.";
      alert(message);
      return;
    }

    await loadPlaces();
  } catch (err) {
    console.error("Delete place error:", err);
    alert("Server error while deleting place.");
  }
}

// Open modal with place details and reviews
async function openModal(placeId) {
  try {
    const res = await fetch(`http://localhost:3000/api/places/${placeId}`);
    if (!res.ok) {
      console.error("Failed to load place:", res.status);
      return;
    }
    const data = await res.json();
    const place = data.place;
    const reviews = data.reviews || [];

    // Set modal content
    modalImg.src = place.image;
    modalImg.alt = place.name;
    modalTitle.textContent = place.name;
    modalDesc.textContent = place.description || "";
    modalCategory.textContent = "Category: " + (place.category || "");

    if (modalLocationLink) {
      const link = place.location_url;
      if (link && isValidUrl(link)) {
        modalLocationLink.href = link;
        modalLocationLink.classList.remove("hide");
      } else {
        modalLocationLink.classList.add("hide");
      }
    }

    // Render existing reviews
    modalReviews.innerHTML = "";
    reviews.forEach((r) => {
      const div = document.createElement("div");
      div.className = "review";
      const username =
        r.email && r.email.includes("@")
          ? "@" + r.email.split("@")[0]
          : "@user";
      div.textContent = `${username}: ${r.text}`;
      modalReviews.appendChild(div);
    });

    // Add comment form at the bottom
    addCommentForm(place.id);

    // Show modal
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    lockScroll(true);
  } catch (err) {
    console.error("Error opening place modal:", err);
  }
}

function addCommentForm(placeId) {
  const commentArea = document.createElement("div");
  commentArea.style.marginTop = "1rem";

  commentArea.innerHTML = `
    <form id="commentForm" class="form small">
      <input id="commentInput" placeholder="Write a comment..." required>
      <button class="btn small primary" type="submit">Send</button>
    </form>
  `;

  modalReviews.appendChild(commentArea);

  const commentForm = commentArea.querySelector("#commentForm");
  const input = commentArea.querySelector("#commentInput");

  commentForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!canInteract()) {
      alert("Please log in to comment.");
      return;
    }

    const user = getUser();
    if (!user) {
      alert("Please log in first.");
      return;
    }

    const txt = input.value.trim();
    if (!txt) return;

    try {
      const res = await fetch("http://localhost:3000/api/places/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          place_id: placeId,
          user_id: user.id,
          text: txt,
        }),
      });

      if (!res.ok) {
        console.error("Review failed:", res.status);
        return;
      }

      const username = "@" + user.email.split("@")[0];
      const div = document.createElement("div");
      div.className = "review";
      div.textContent = `${username}: ${txt}`;
      // Insert above the form
      modalReviews.insertBefore(div, commentArea);
      input.value = "";
    } catch (err) {
      console.error("Review error:", err);
    }
  });
}

function closeModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  lockScroll(false);
}
closeModalBtn?.addEventListener("click", closeModal);
backdrop?.addEventListener("click", closeModal);
document.addEventListener(
  "keydown",
  (e) => e.key === "Escape" && !modal.classList.contains("hidden") && closeModal()
);

// Filter places by search text and category
function applyFilters() {
  const query = (searchInput?.value || "").toLowerCase();
  const cat = activeCategoryEl?.dataset.cat || "";

  const filtered = places.filter((p) => {
    const matchesText =
      p.name.toLowerCase().includes(query) ||
      (p.description || "").toLowerCase().includes(query) ||
      (p.location_url || "").toLowerCase().includes(query);
    const matchesCat = cat ? p.category === cat : true;
    return matchesText && matchesCat;
  });

  renderCards(filtered);
}

// Add place modal (requires login)
function openAdd() {
  const user = getUser?.();
  if (!user) {
    alert("Please log in to add a new place.");
    return;
  }
  addModal.classList.remove("hidden");
  addModal.setAttribute("aria-hidden", "false");
  lockScroll(true);
  addName.focus();
}

function closeAddModal() {
  addModal.classList.add("hidden");
  addModal.setAttribute("aria-hidden", "true");
  lockScroll(false);
}

addBtn?.addEventListener("click", openAdd);
closeAdd?.addEventListener("click", closeAddModal);
backdropAdd?.addEventListener("click", closeAddModal);

addForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = getUser?.();
  if (!user) {
    alert("Please log in first.");
    return;
  }

  const name = addName.value.trim();
  const category = addCategory.value;
  const desc = addDesc.value.trim();
  const locationLink = addLocation?.value.trim();

  const file = addFile?.files[0];
  let finalImage = "";

  // For backend persistence, we only really trust an image URL
  if (file) {
    alert(
      "For this project version, please use an image URL instead of a local file."
    );
    return;
  } else if (addImage && /\.(jpg|jpeg|png|webp)$/i.test(addImage.value.trim())) {
    finalImage = addImage.value.trim();
  } else {
    alert("Please provide a valid image URL (jpg, jpeg, png, webp).");
    return;
  }

  if (!name || !category || !locationLink) {
    alert("Name, category, and location link are required.");
    return;
  }

  if (!isValidUrl(locationLink)) {
    alert("Please provide a valid location link (https://…).");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category,
        description: desc,
        image: finalImage,
        location_url: locationLink,
        user_id: user.id,
      }),
    });

    if (!res.ok) {
      console.error("Add place failed:", res.status);
      alert("Could not add place.");
      return;
    }

    // Reload places from backend to include the new one
    await loadPlaces();
    addForm.reset();
    closeAddModal();
  } catch (err) {
    console.error("Add place error:", err);
    alert("Server error while adding place.");
  }
});

// Initialize page on load
(function initExplore() {
  if (!cardsEl) return;

  const presetCat = getQueryCategory();
  if (activeCategoryEl) {
    activeCategoryEl.textContent = presetCat
      ? `Showing: ${presetCat}`
      : "Showing: All";
    activeCategoryEl.dataset.cat = presetCat;
  }

  searchInput?.addEventListener("input", applyFilters);

  loadPlaces();
})();
