# AniVerse Chat - Real-Time Multi-User Chatroom

A modern, responsive, real-time chat web application built with Flask-SocketIO, featuring beautiful animations and a professional dark theme.

## Features

- **Real-Time Messaging**: Instant message delivery using WebSockets
- **User Authentication**: Secure login and registration system
- **Room Management**: Create and join multiple chatrooms
- **Animated UI**: Smooth CSS animations and transitions
- **Responsive Design**: Works perfectly on desktop and mobile
- **Message Persistence**: All messages are saved to the database
- **Typing Indicators**: See when other users are typing
- **Online Status**: Real-time user presence indicators
- **Professional Design**: Modern dark theme with glassmorphism effects

## Tech Stack

- **Backend**: Flask 2.3.2, Flask-SocketIO 5.3.6, Flask-SQLAlchemy 3.1.1, Flask-Login 0.6.3
- **Frontend**: HTML5, TailwindCSS, JavaScript (SocketIO client)
- **Database**: SQLite (with SQLAlchemy ORM)
- **Python**: 3.8.x compatible

## Installation

1. **Clone or download the project**
   ```bash
   cd AniVerse_light1
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   python app.py
   ```

4. **Open your browser**
   Navigate to `http://localhost:5000`

## Usage

1. **Register a new account** or **login** with existing credentials
2. **Join the default "general" room** or **create a new room**
3. **Start chatting** with other users in real-time
4. **See typing indicators** when others are typing
5. **View online users** in the sidebar

## Project Structure

```
AniVerse_light1/
├── app.py                 # Main Flask application
├── models.py              # SQLAlchemy database models
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── static/
│   ├── css/
│   │   └── style.css     # Custom CSS with animations
│   └── js/
│       └── chat.js       # JavaScript for real-time features
└── templates/
    ├── layout.html       # Base template
    ├── login.html        # Login page
    ├── register.html     # Registration page
    └── chat.html         # Main chat interface
```

## Key Features Explained

### Real-Time Messaging
- Uses Flask-SocketIO for WebSocket communication
- Messages appear instantly across all connected clients
- Automatic message persistence to SQLite database

### User Authentication
- Secure password hashing with Werkzeug
- Session management with Flask-Login
- Protected routes and user sessions

### Room Management
- Dynamic room creation and joining
- Room-specific message history
- Active user tracking per room

### Animated UI
- CSS keyframe animations for smooth transitions
- Hover effects and micro-interactions
- Responsive design with mobile support
- Glassmorphism and gradient effects

### Database Models
- **User**: Stores user credentials and online status
- **Room**: Manages chatrooms and their creators
- **Message**: Persists all chat messages with timestamps

## Customization

### Styling
Edit `static/css/style.css` to customize:
- Color schemes
- Animation timings
- Layout styles
- Responsive breakpoints

### Functionality
Modify `static/js/chat.js` to add:
- Custom keyboard shortcuts
- Additional UI interactions
- Sound notifications
- Message formatting

### Backend
Update `app.py` to extend:
- Additional API endpoints
- Custom SocketIO events
- Authentication logic
- Database queries

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Security Notes

- Change the `SECRET_KEY` in `app.py` for production
- Use environment variables for sensitive configuration
- Consider using HTTPS in production
- Implement rate limiting for production use

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Change the port in `app.py`: `socketio.run(app, port=5001)`

2. **Database errors**
   - Delete `chatroom.db` and restart the application

3. **SocketIO connection issues**
   - Check browser console for errors
   - Ensure no firewall blocking port 5000

4. **CSS not loading**
   - Check that static files are being served correctly
   - Verify file paths in templates

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the MIT License.
