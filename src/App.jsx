import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  // --- CORE SYSTEM STATE ---
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [isTagLoading, setIsTagLoading] = useState(false);
  
  const [thumbInput, setThumbInput] = useState('');
  const [thumbnails, setThumbnails] = useState(null);
  const [isThumbLoading, setIsThumbLoading] = useState(false);

  // --- AUTH STATE ---
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authForm, setAuthForm] = useState({ username: '', password: '' });

  // On mount, check if we have a saved user
  useEffect(() => {
    const savedUser = localStorage.getItem('username');
    if (savedUser && token) {
      setUser(savedUser);
    }
  }, [token]);

  // --- AUTH LOGIC ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? 'login' : 'register';
    
    try {
      const res = await axios.post(`http://127.0.0.1:5000/api/${endpoint}`, authForm);
      
      if (authMode === 'login') {
        const { access_token, username } = res.data;
        localStorage.setItem('token', access_token);
        localStorage.setItem('username', username);
        setToken(access_token);
        setUser(username);
        setIsAuthModalOpen(false);
        setAuthForm({ username: '', password: '' });
      } else {
        alert('Registration successful! Please login.');
        setAuthMode('login');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUser(null);
  };

  // --- BUSINESS LOGIC ---
  const getYouTubeVideoId = (url) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleGenerateTags = async () => {
    if (!tagInput.trim()) return alert('Please enter keywords or a YouTube URL!');
    
    // Authorization Check: Must be logged in!
    if (!token) {
        setIsAuthModalOpen(true);
        return alert('Please login to generate tags!');
    }

    setIsTagLoading(true);
    setTags([]);

    try {
        const response = await axios.post('http://127.0.0.1:5000/api/generate-tags', 
            { url: tagInput },
            { headers: { Authorization: `Bearer ${token}` } } // Sending the JWT!
        );

        if (response.data.tags && response.data.tags.length > 0) {
            setTags(response.data.tags);
        } else {
            alert('No tags found for this URL.');
        }
    } catch (error) {
        console.error("Backend error:", error);
        if (error.response?.status === 401) {
            alert('Session expired. Please login again.');
            handleLogout();
        } else {
            alert('Could not connect to the backend.');
        }
    } finally {
        setIsTagLoading(false);
    }
  };

  const copyAllTags = () => {
    const text = tags.join(', ');
    navigator.clipboard.writeText(text);
    alert('All tags copied to clipboard!');
  };

  const handleExtractThumbnails = () => {
    const videoId = getYouTubeVideoId(thumbInput);
    if (!videoId) return alert('Please enter a valid YouTube Video URL!');

    setIsThumbLoading(true);
    setThumbnails(null);

    setTimeout(() => {
      const baseUrl = `https://img.youtube.com/vi/${videoId}`;
      setThumbnails({
        mq: `${baseUrl}/mqdefault.jpg`,
        hq: `${baseUrl}/hqdefault.jpg`,
        sd: `${baseUrl}/sddefault.jpg`,
        hd: `${baseUrl}/maxresdefault.jpg`,
      });
      setIsThumbLoading(false);
    }, 800);
  };

  return (
    <>
      <div className="background-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <nav className="navbar">
        <div className="container">
          <div className="logo">
            <i className="fab fa-youtube" style={{ color: '#ff0000' }}></i>
            <span>Rapid<span>Tags</span></span>
          </div>
          <ul className="nav-links">
            <li><a href="#tags" className="active">Tags</a></li>
            <li><a href="#thumbnails">Thumbnails</a></li>
            {user ? (
               <div className="user-profile">
                  <span className="username">Hi, {user}</span>
                  <button className="logout-btn" onClick={handleLogout}>Logout</button>
               </div>
            ) : (
                <button className="login-trigger-btn" onClick={() => setIsAuthModalOpen(true)}>Login</button>
            )}
          </ul>
        </div>
      </nav>

      <main className="container">
        <section className="hero-section">
          <h1>Elevate Your <span>YouTube</span> Success</h1>
          <p>Generate optimized tags, extract high-quality thumbnails, and dominate the algorithm with our rapid tools.</p>
        </section>

        <div className="tools-grid">
          <div className="tool-card" id="tags">
            <div className="tool-header">
              <div className="icon-box purple">
                <i className="fas fa-tags"></i>
              </div>
              <h2>Tag Generator</h2>
            </div>
            <p>Enter a YouTube video URL to generate high-ranking tags instantly.</p>
            <div className="input-group">
              <input 
                type="text" 
                placeholder="Paste YouTube Video URL here..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
              />
              <button className="primary-btn" onClick={handleGenerateTags}>
                <span>Generate</span>
                <i className="fas fa-magic"></i>
              </button>
            </div>

            {isTagLoading && (
              <div className="loader">
                <div className="spinner"></div>
                <p>Fetching tags...</p>
              </div>
            )}

            {tags.length > 0 && !isTagLoading && (
              <div className="tag-results">
                <div className="tag-meta">
                  <span>{tags.length} Tags Generated</span>
                  <button className="text-btn" onClick={copyAllTags}>
                    <i className="fas fa-copy"></i> Copy All
                  </button>
                </div>
                <div className="tag-container">
                  {tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="tool-card" id="thumbnails">
            <div className="tool-header">
              <div className="icon-box blue">
                <i className="fas fa-image"></i>
              </div>
              <h2>Thumbnail Downloader</h2>
            </div>
            <p>Extract high-quality thumbnails from any YouTube video URL.</p>
            <div className="input-group">
              <input 
                type="text" 
                placeholder="Paste YouTube Video URL here..."
                value={thumbInput}
                onChange={(e) => setThumbInput(e.target.value)}
              />
              <button className="secondary-btn" onClick={handleExtractThumbnails}>
                <span>Extract</span>
                <i className="fas fa-download"></i>
              </button>
            </div>

            {isThumbLoading && (
              <div className="loader">
                <div className="spinner"></div>
                <p>Extracting thumbnails...</p>
              </div>
            )}

            {thumbnails && !isThumbLoading && (
              <div className="thumb-results">
                <div className="thumb-preview">
                  <img src={thumbnails.hd} alt="Preview" onError={(e) => e.target.src = thumbnails.hq} />
                  <div className="quality-grid">
                    <a href={thumbnails.mq} className="quality-card" download target="_blank" rel="noreferrer">
                      <span>MQ</span>
                      <i className="fas fa-download"></i>
                    </a>
                    <a href={thumbnails.hq} className="quality-card" download target="_blank" rel="noreferrer">
                      <span>HQ</span>
                      <i className="fas fa-download"></i>
                    </a>
                    <a href={thumbnails.sd} className="quality-card" download target="_blank" rel="noreferrer">
                      <span>SD</span>
                      <i className="fas fa-download"></i>
                    </a>
                    <a href={thumbnails.hd} className="quality-card highlight" download target="_blank" rel="noreferrer">
                      <span>HD</span>
                      <i className="fas fa-download"></i>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="auth-modal-overlay">
          <div className="auth-modal">
            <button className="close-modal" onClick={() => setIsAuthModalOpen(false)}>&times;</button>
            <div className="auth-tabs">
              <button 
                className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => setAuthMode('login')}
              >Login</button>
              <button 
                className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => setAuthMode('signup')}
              >Sign Up</button>
            </div>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <div className="form-group">
                <label>Username</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Enter username" 
                  required
                  value={authForm.username}
                  onChange={(e) => setAuthForm({...authForm, username: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Enter password" 
                  required
                  value={authForm.password}
                  onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                />
              </div>
              <button type="submit" className="primary-btn auth-submit-btn">
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      <footer className="footer">
        <div className="container">
          <p>&copy; 2026 RapidTags by Antigravity. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}

export default App;
