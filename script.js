import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase setup
const supabaseUrl = "https://obbdbjcczrbeqlzbfzyh.supabase.co";
const supabaseKey = "sb_publishable_bLWm1-MMwgBZUh4XSzgi8Q_pYbvW3BC";
const supabase = createClient(supabaseUrl, supabaseKey);

// DOM elements
const email = document.getElementById("email");
const password = document.getElementById("password");
const userInfo = document.getElementById("userInfo");
const notesUserInfo = document.getElementById("notesUserInfo");
const authSection = document.getElementById("authSection");
const notesSection = document.getElementById("notesSection");
const noteText = document.getElementById("noteText");
const fileInput = document.getElementById("fileInput");
const notesList = document.getElementById("notesList");

const signUpBtn = document.getElementById("signUpBtn");
const signInBtn = document.getElementById("signInBtn");
const addNoteBtn = document.getElementById("addNoteBtn");
const loadNotesBtn = document.getElementById("loadNotesBtn");
const backBtn = document.getElementById("backBtn");

function showUser(emailStr) {
  userInfo.textContent = emailStr ? `Logged in as: ${emailStr}` : "";
  notesUserInfo.textContent = emailStr ? `Logged in as: ${emailStr}` : "";
}

function clearPassword() { password.value = ""; }

function showNotesSection() {
  document.body.classList.add("notes-active"); // blur background
  authSection.style.display = "none";
  notesSection.classList.remove("hidden");
}

function showAuthSection() {
  document.body.classList.remove("notes-active"); // remove blur
  notesSection.classList.add("hidden");
  authSection.style.display = "block";
}

// ---------------- AUTH ----------------
signUpBtn.addEventListener("click", async () => {
  const { error } = await supabase.auth.signUp({ email: email.value, password: password.value });
  if (error) alert(error.message);
  else { alert("Signup successful. Please sign in."); clearPassword(); }
});

signInBtn.addEventListener("click", async () => {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value });
  if (error) alert(error.message);
  else {
    alert("Login successful");
    showUser(data.user.email);
    clearPassword();
    showNotesSection();
    loadNotes();
  }
});

// ---------------- BACK / SIGNOUT ----------------
backBtn.addEventListener("click", async () => {
  const confirmLogout = confirm("Do you want to sign out?");
  if (confirmLogout) {
    await supabase.auth.signOut();
    notesList.innerHTML = "";
    email.value = "";
    password.value = "";
    showUser("");
  }
  showAuthSection();
});

// ---------------- NOTES ----------------
addNoteBtn.addEventListener("click", async () => {
  const note = noteText.value;
  const file = fileInput.files[0];
  if (!note && !file) { alert("Please enter a note or select a file"); return; }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { alert("Please login first"); return; }

  let fileUrl = null;
  if (file) {
    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("files").upload(filePath, file);
    if (error) { alert(error.message); return; }
    fileUrl = `${supabaseUrl}/storage/v1/object/public/files/${filePath}`;
  }

  const { error } = await supabase.from("notes").insert([{ content: note, user_id: user.id, file_url: fileUrl }]);
  if (error) alert(error.message);
  else { noteText.value = ""; fileInput.value = ""; loadNotes(); }
});

loadNotesBtn.addEventListener("click", loadNotes);

async function loadNotes() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase.from("notes").select("*").eq("user_id", user.id).order("id", { ascending: false });
  if (error) { alert(error.message); return; }

  notesList.innerHTML = "";
  data.forEach(note => {
    const li = document.createElement("li");
    li.innerHTML = `<p>${note.content || ""}</p>`;
    if (note.file_url) li.innerHTML += `<a href="${note.file_url}" target="_blank">📎 Open File</a>`;

    const actions = document.createElement("div");
    actions.className = "actions";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => editNote(li, note.id, note.content));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteNote(li, note.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    li.appendChild(actions);
    notesList.appendChild(li);

    requestAnimationFrame(() => li.classList.add("fade-in"));
  });
}

// ---------------- EDIT NOTE ----------------
async function editNote(li, id, oldText) {
  li.classList.add("active");
  const newText = prompt("Edit note:", oldText);
  li.classList.remove("active");
  if (newText === null) return;

  const { error } = await supabase.from("notes").update({ content: newText }).eq("id", id);
  if (error) alert(error.message);
  else loadNotes();
}

// ---------------- DELETE NOTE ----------------
async function deleteNote(li, id) {
  li.style.opacity = 0;
  li.style.transform = "translateX(-20px)";
  setTimeout(async () => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) alert(error.message);
    else loadNotes();
  }, 300);
}