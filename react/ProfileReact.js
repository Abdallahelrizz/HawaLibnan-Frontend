  const { useState, useEffect } = React;
const e = React.createElement; // Copilot helped with React.createElement since I'm not using JSX

function ProfileCard() {
  const [profile, setProfile] = useState(null);
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [posts, setPosts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let storedUser = null;
    try {
      storedUser = JSON.parse(localStorage.getItem("user"));
    } catch {}

    if (!storedUser || !storedUser.id) {
      setError("Not logged in.");
      setLoading(false);
      return;
    }

    const userId = storedUser.id;

    // Profile
    const profilePromise = fetch(`http://localhost:3000/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setBio(data.bio || "");
        setImageUrl(data.profile_image || "");
      });

    // Posts
    const postsPromise = fetch(`http://localhost:3000/api/posts?user_id=${userId}`)
      .then((res) => res.json())
      .then((allPosts) => {
        const mine = allPosts.filter((p) => String(p.user_id) === String(userId));
        setPosts(mine);
      });

    // Copilot helped with Promise.all to load profile and posts at the same time
    Promise.all([profilePromise, postsPromise])
      .catch(() => setError("Error loading profile."))
      .finally(() => setLoading(false));
  }, []);

  function handleSave() {
    if (!profile || saving) return;

    setSaving(true);
    setError(null);

    fetch("http://localhost:3000/api/users/updateProfile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: profile.id,
        profileImageUrl: imageUrl || null,
        bio: bio || null,
      }),
    })
      .then((res) => res.text())
      .then(() => {
        setProfile({ ...profile, bio: bio, profile_image: imageUrl });
        alert("Profile updated");
      })
      .catch(() => setError("Error updating profile."))
      .finally(() => setSaving(false));
  }

  if (loading) return e("p", null, "Loading profile...");
  if (error) return e("p", { className: "muted" }, error);

  // ---------------------------------------
  // GRID VIEW OF POSTS (Instagram style)
  // ---------------------------------------
  let postsSection;
  if (!posts.length) {
    postsSection = e(
      "p",
      { className: "muted" },
      "You haven't posted anything yet."
    );
  } else {
    const gridItems = posts.map((post) =>
      e(
        "div",
        {
          key: post.id,
          style: {
            width: "100%",
            aspectRatio: "1 / 1",
            overflow: "hidden",
            borderRadius: "8px",
            cursor: "pointer",
            position: "relative",
          },
          onClick: () => {
            // Copilot helped me bridge React component to vanilla JS community.js
            if (window.openPostThread) {
              window.openPostThread(post.id);
            }
          },
        },
        post.image
          ? e("img", {
              src: post.image,
              style: {
                width: "100%",
                height: "100%",
                objectFit: "cover",
              },
            })
          : e(
              "div",
              {
                style: {
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#eee",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#777",
                  fontSize: "0.9rem",
                },
              },
              "No Image"
            )
      )
    );

    postsSection = e(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "6px",
        },
      },
      gridItems
    );
  }

  // ---------------------------------------

  return e(
    "div",
    { style: { maxWidth: "760px", margin: "0 auto" } },

    // PROFILE CARD
    e(
      "div",
      { className: "card pad", style: { marginBottom: "1.5rem" } },

      e(
        "div",
        {
          style: {
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            marginBottom: "1rem",
          },
        },
        e("img", {
          src: imageUrl || "https://via.placeholder.com/120?text=Profile",
          style: {
            width: "96px",
            height: "96px",
            borderRadius: "999px",
            objectFit: "cover",
          },
        }),
        e(
          "div",
          null,
          e("h3", null, profile.email),
          e(
            "p",
            { className: "muted", style: { marginTop: "0.25rem" } },
            "Community member"
          )
        )
      ),

      // EDIT FIELDS
      e(
        "label",
        { style: { display: "block", fontWeight: 600, marginBottom: "0.25rem" } },
        "Profile Image URL",
        e("input", {
          type: "text",
          value: imageUrl,
          onChange: (evt) => setImageUrl(evt.target.value),
          style: { width: "100%", marginTop: "0.25rem" },
        })
      ),

      e(
        "label",
        {
          style: {
            display: "block",
            fontWeight: 600,
            marginTop: "0.75rem",
            marginBottom: "0.25rem",
          },
        },
        "Bio",
        e("textarea", {
          rows: 3,
          value: bio,
          onChange: (evt) => setBio(evt.target.value),
          style: {
            width: "100%",
            marginTop: "0.25rem",
            resize: "vertical",
          },
        })
      ),

      e(
        "button",
        {
          className: "btn primary",
          style: { marginTop: "0.75rem" },
          onClick: handleSave,
        },
        saving ? "Saving..." : "Save changes"
      )
    ),

    // POSTS GRID
    e(
      "div",
      { className: "card pad" },
      e("h3", { style: { marginBottom: "0.75rem" } }, "Your posts"),
      postsSection
    )
  );
}

ReactDOM.createRoot(document.getElementById("react-profile-root")).render(
  e(ProfileCard)
);
