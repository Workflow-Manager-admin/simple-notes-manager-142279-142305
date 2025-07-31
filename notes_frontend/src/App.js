import React, { useEffect, useState } from "react";
import "./App.css";
import "./notesapp.css";

/**
 * Utility to get API base URL from environment variables.
 * Returns window._env_.REACT_APP_API_BASE_URL or process.env.REACT_APP_API_BASE_URL if set,
 * otherwise defaults to http://localhost:5000.
 */
const getApiBaseUrl = () =>
  (window._env_ && window._env_.REACT_APP_API_BASE_URL) ||
  process.env.REACT_APP_API_BASE_URL ||
  "http://localhost:5000";

// PUBLIC_INTERFACE
function App() {
  // notes: array of {id, title, content, updated_at}; selectedNoteId: id of the note currently being viewed/edited
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState(null);

  // CRUD handlers
  const fetchNotes = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${getApiBaseUrl()}/notes`);
      if (!resp.ok) throw new Error("Failed to fetch notes");
      const data = await resp.json();
      setNotes(data);
    } catch (err) {
      setError("Failed to load notes.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  // Find the current note object
  const selectedNote =
    notes.find((n) => n.id === selectedNoteId) || (notes.length ? notes[0] : null);

  // Called when the user saves (create/update)
  const handleSaveNote = async ({ id, title, content }) => {
    setError(null);
    const apiBase = getApiBaseUrl();
    const noteData = { title, content };
    try {
      let noteResp;
      if (!id) {
        // Create
        noteResp = await fetch(`${apiBase}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(noteData),
        });
      } else {
        // Update
        noteResp = await fetch(`${apiBase}/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(noteData),
        });
      }
      if (!noteResp.ok) throw new Error("Save failed");
      await fetchNotes();
      // Select the created/updated note
      if (!id) {
        const respData = await noteResp.json();
        setSelectedNoteId(respData.id);
      }
    } catch (err) {
      setError("Failed to save note.");
    }
  };

  // Called when the user deletes a note
  const handleDeleteNote = async (id) => {
    setError(null);
    try {
      const resp = await fetch(`${getApiBaseUrl()}/notes/${id}`, {
        method: "DELETE",
      });
      if (!resp.ok) throw new Error("Delete failed");
      await fetchNotes();
      setSelectedNoteId(null);
    } catch (err) {
      setError("Failed to delete note.");
    }
  };

  // Called on sidebar note selection
  const handleSelectNote = (id) => {
    setSelectedNoteId(id);
  };

  // Filtering notes by search query
  const filteredNotes = searchQuery
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : notes;

  // Create note
  const handleCreateNote = () => {
    setSelectedNoteId(null);
  };

  // UI rendering
  return (
    <div className="notesapp-root">
      {/* Top Navigation Bar */}
      <NavigationBar
        onMenuClick={() => setSidebarOpen((open) => !open)}
        appTitle="Simple Notes"
      />
      <div className="notesapp-container">
        {/* Sidebar */}
        <Sidebar
          notes={filteredNotes}
          selectedId={selectedNote ? selectedNote.id : null}
          open={sidebarOpen}
          onSelect={handleSelectNote}
          onSearch={setSearchQuery}
          onCreate={handleCreateNote}
        />
        {/* Main Content Area */}
        <main className="notesapp-main">
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorMessage message={error} />
          ) : (
            <NoteDetail
              key={selectedNote ? selectedNote.id : "new"}
              note={selectedNote}
              onSave={handleSaveNote}
              onDelete={handleDeleteNote}
              isNew={!selectedNote}
            />
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}

// Top Navigation Bar Component
function NavigationBar({ onMenuClick, appTitle }) {
  return (
    <nav className="navbar">
      <button className="icon-btn menu-btn" onClick={onMenuClick}>
        ☰
      </button>
      <span className="navbar-title">{appTitle}</span>
    </nav>
  );
}

// Sidebar with Notes List and Search
function Sidebar({
  notes,
  selectedId,
  open,
  onSelect,
  onSearch,
  onCreate,
}) {
  return (
    <aside className={`sidebar${open ? "" : " closed"}`}>
      <div className="sidebar-header">
        <span className="sidebar-title">Notes</span>
        <button className="icon-btn add-btn" title="New Note" onClick={onCreate}>
          ＋
        </button>
      </div>
      <input
        type="text"
        className="sidebar-search"
        placeholder="Search notes..."
        onChange={(e) => onSearch(e.target.value)}
      />
      <NotesList
        notes={notes}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </aside>
  );
}

// Sidebar Notes List
function NotesList({ notes, selectedId, onSelect }) {
  if (notes.length === 0) {
    return <div className="noteslist-empty">No notes found.</div>;
  }
  return (
    <ul className="noteslist">
      {notes.map((note) => (
        <li
          key={note.id}
          className={
            "noteslist-item" +
            (selectedId === note.id ? " selected" : "")
          }
          onClick={() => onSelect(note.id)}
        >
          <div className="noteslist-title">{note.title || <em>Untitled</em>}</div>
          <div className="noteslist_preview">
            {(note.content || "").slice(0, 30)}
          </div>
        </li>
      ))}
    </ul>
  );
}

// Form for viewing/updating/creating a note
function NoteDetail({ note, onSave, onDelete, isNew }) {
  const [editTitle, setEditTitle] = useState(note ? note.title : "");
  const [editContent, setEditContent] = useState(note ? note.content : "");
  const [editing, setEditing] = useState(isNew);

  useEffect(() => {
    // Reload form for a different note
    setEditTitle(note ? note.title : "");
    setEditContent(note ? note.content : "");
    setEditing(isNew);
  }, [note, isNew]);

  // PUBLIC_INTERFACE
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!editTitle.trim() && !editContent.trim()) return;
    onSave({
      id: note ? note.id : undefined,
      title: editTitle.trim(),
      content: editContent.trim(),
    });
    setEditing(false);
  };

  if (!note && !isNew) return <div>Select a note to view.</div>;

  return (
    <section className="notedetail">
      <form className="notedetail-form" onSubmit={handleSubmit}>
        <input
          className="notedetail-title"
          type="text"
          placeholder="Title"
          aria-label="Title"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          disabled={!editing ? true : false}
        />
        <textarea
          className="notedetail-content"
          placeholder="Write your note..."
          aria-label="Note content"
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          disabled={!editing ? true : false}
        ></textarea>
        <div className="notedetail-actions">
          {editing || isNew ? (
            <button className="btn btn-primary" type="submit">
              Save
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
          )}
          {!isNew && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (window.confirm("Delete this note?"))
                  onDelete(note.id);
              }}
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer className="notesapp-footer">
      <span>
        Simple Notes App |{" "}
        <a
          href="https://reactjs.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Built with React
        </a>
      </span>
    </footer>
  );
}

function Loading() {
  return <div className="notesapp-loading">Loading...</div>;
}

function ErrorMessage({ message }) {
  return <div className="notesapp-error">{message}</div>;
}

export default App;
